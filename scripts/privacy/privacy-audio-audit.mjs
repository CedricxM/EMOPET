import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFile(join(root, path), 'utf8');

const [
  mobilePackageSource,
  mobileManifestSource,
  bleTypes,
  bleParser,
  bleCommands,
  mobileBle,
  sensorValidators,
  sensorDbSchema,
] = await Promise.all([
  read('apps/mobile/package.json'),
  read('apps/mobile/app.json'),
  read('packages/ble-protocol/src/frames/types.ts'),
  read('packages/ble-protocol/src/parser/index.ts'),
  read('packages/ble-protocol/src/commands/index.ts'),
  read('apps/mobile/src/services/ble.ts'),
  read('packages/shared/src/validators/index.ts'),
  read('backend/db/schema/sensors.ts'),
]);

const mobilePackage = JSON.parse(mobilePackageSource);
const mobileDependencies = {
  ...(mobilePackage.dependencies ?? {}),
  ...(mobilePackage.devDependencies ?? {}),
};

for (const dependency of [
  'expo-audio',
  'expo-av',
  'react-native-audio',
  'react-native-audio-record',
  'react-native-audio-recorder-player',
  '@react-native-voice/voice',
]) {
  if (dependency in mobileDependencies) {
    fail(`mobile must not depend on raw-audio capture package ${dependency}`);
  }
}

for (const marker of [
  'NSMicrophoneUsageDescription',
  'RECORD_AUDIO',
  'android.permission.RECORD_AUDIO',
]) {
  if (mobileManifestSource.includes(marker)) {
    fail(`mobile manifest must not request microphone permission (${marker})`);
  }
}

if (!bleTypes.includes('export const TAG_PAYLOAD_SIZE = 22;')) {
  fail('BLE V1 TAG payload size must remain fixed at 22 bytes');
}

const tagPayloadMatch = bleTypes.match(/export interface TagPayload\s*\{([\s\S]*?)\n\}/);
if (!tagPayloadMatch) {
  fail('BLE TagPayload contract could not be located');
} else {
  const tagPayload = tagPayloadMatch[1];
  for (const field of ['vocalEvents', 'vocalEnergyMean', 'vocalCentroidHz', 'micReliability']) {
    if (!new RegExp(`\\b${field}\\b`).test(tagPayload)) {
      fail(`BLE TagPayload must retain derived acoustic field ${field}`);
    }
  }
  for (const pattern of [
    /\brawAudio\b/i,
    /\baudio(?:Blob|Buffer|Base64|Bytes|Chunk|Chunks|Samples?)\b/i,
    /\bpcm\b/i,
    /\bwaveform\b/i,
    /\brecording(?:Uri|Bytes|Buffer)?\b/i,
  ]) {
    if (pattern.test(tagPayload)) {
      fail(`BLE TagPayload contains a raw-audio transport marker (${pattern})`);
    }
  }
}

if (!bleParser.includes('payload: parseTagPayload(view, HEADER_SIZE)')) {
  fail('BLE parser must expose the validated structured TAG payload');
}
if (bleParser.includes('payload: raw') || bleParser.includes('rawFrame: raw')) {
  fail('BLE parser must not expose the original wire buffer on parsed frames');
}
if (!mobileBle.includes('export type FrameCallback = (frame: ParsedBleSensorFrame) => void;')) {
  fail('mobile BLE callback must remain typed to ParsedBleSensorFrame');
}
if (!mobileBle.includes('const frame = parseSensorFrame(raw);') || !mobileBle.includes('onFrame(frame);')) {
  fail('mobile BLE boundary must parse wire bytes before publishing a frame');
}
if (/onFrame\s*\(\s*raw\s*\)/.test(mobileBle)) {
  fail('mobile BLE boundary must never publish raw wire bytes to consumers');
}

if (/CMD_[A-Z0-9_]*(?:AUDIO|MIC|RECORD|STREAM)/i.test(bleCommands)) {
  fail('BLE command surface must not expose an audio recording/streaming command');
}

const sensorValidatorStart = sensorValidators.indexOf('export const SensorSummaryCreateSchema = z.object({');
const sensorValidatorEnd = sensorValidators.indexOf('// ── Community Validators', sensorValidatorStart);
if (sensorValidatorStart < 0 || sensorValidatorEnd < 0) {
  fail('SensorSummaryCreateSchema contract could not be located');
} else {
  const sensorValidatorSection = sensorValidators.slice(sensorValidatorStart, sensorValidatorEnd);
  if (!sensorValidatorSection.includes('}).strict();')) {
    fail('SensorSummaryCreateSchema must reject unknown fields with .strict()');
  }
}

const sensorTableStart = sensorDbSchema.indexOf("export const sensorSummaries = pgTable('sensor_summaries'");
const sensorTableEnd = sensorDbSchema.indexOf('export const eliStates', sensorTableStart);
if (sensorTableStart < 0 || sensorTableEnd < 0) {
  fail('sensor_summaries persistence contract could not be located');
} else {
  const sensorTableSection = sensorDbSchema.slice(sensorTableStart, sensorTableEnd);
  for (const pattern of [/\bbytea\b/i, /\bblob\b/i, /\brawAudio\b/i, /\bpcm\b/i, /\bwaveform\b/i]) {
    if (pattern.test(sensorTableSection)) {
      fail(`sensor_summaries must not contain raw-audio persistence (${pattern})`);
    }
  }
}

const executableRoots = [
  'apps/mobile/src',
  'apps/mobile/app',
  'apps/web',
  'backend/api',
  'packages/ble-protocol/src',
];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']);
const skippedDirectories = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'assets',
  '__tests__',
  'test',
  'tests',
]);
const dangerousRuntimeMarkers = [
  { pattern: /\bMediaRecorder\b/, label: 'MediaRecorder' },
  { pattern: /getUserMedia\s*\(/, label: 'getUserMedia' },
  { pattern: /\bAudio\.Recording\b/, label: 'Audio.Recording' },
  { pattern: /\bRecording\.createAsync\b/, label: 'Recording.createAsync' },
  { pattern: /\b(?:start|begin)Recording\s*\(/i, label: 'recording API' },
  { pattern: /\brawAudio\b/i, label: 'rawAudio' },
  { pattern: /\baudio(?:Blob|Buffer|Base64|Bytes|Chunk|Chunks|Samples?)\b/i, label: 'raw audio payload identifier' },
  { pattern: /\baudio\/(?:wav|mpeg|mp4|webm|ogg)\b/i, label: 'audio MIME type' },
  { pattern: /\.(?:wav|pcm)\b/i, label: 'raw/recorded audio file extension' },
];

async function collectSourceFiles(directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const relativePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(relativePath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!sourceExtensions.has(extname(entry.name))) continue;
    if (/\.(?:test|spec)\.[^.]+$/.test(entry.name)) continue;
    files.push(relativePath);
  }
  return files;
}

for (const directory of executableRoots) {
  const files = await collectSourceFiles(directory);
  for (const file of files) {
    const source = await read(file);
    for (const { pattern, label } of dangerousRuntimeMarkers) {
      if (pattern.test(source)) {
        fail(`${relative(root, join(root, file))} contains forbidden raw-audio runtime marker: ${label}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Raw-audio privacy boundary audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Raw-audio privacy boundary audit passed for repository runtime surfaces: derived acoustic features only, no client capture permission/API, no raw-audio BLE contract, and strict sensor ingress.');
console.log('Scope note: this gate does not attest device firmware or other runtime code that is absent from this repository.');
