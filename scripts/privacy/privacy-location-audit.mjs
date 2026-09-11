import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFile(join(root, path), 'utf8');

const [
  preferences,
  featureHook,
  settingsScreen,
  behaviorSettings,
  mobileBle,
  mobilePackageSource,
  sharedValidators,
  sensorDbSchema,
  sensorRoutes,
  featureProgressRoutes,
  sensorIntegrationTest,
] = await Promise.all([
  read('apps/mobile/src/store/preferences.ts'),
  read('apps/mobile/src/hooks/use-feature-progress.ts'),
  read('apps/mobile/app/settings/index.tsx'),
  read('apps/mobile/app/settings/behavior.tsx'),
  read('apps/mobile/src/services/ble.ts'),
  read('apps/mobile/package.json'),
  read('packages/shared/src/validators/index.ts'),
  read('backend/db/schema/sensors.ts'),
  read('backend/api/routes/sensors.ts'),
  read('backend/api/routes/feature-progress.ts'),
  read('backend/test/sensor-runtime.integration.test.mjs'),
]);

if (!sharedValidators.includes("'location_nearby_temp'")) {
  fail('location_nearby_temp must remain an explicit consent purpose');
}
if (!preferences.includes('location_opt_in: false')) {
  fail('location opt-in must default to false');
}
if (!preferences.includes('passivePhoneDetectionEnabled: false')) {
  fail('passive phone detection must default to false');
}

const consentPersistIndex = featureHook.indexOf('await saveFeatureConsent(token');
const locationEnableIndex = featureHook.indexOf('activateLocationConsentFromDurableAuthority();');
const passiveEnableIndex = featureHook.indexOf('setPassivePhoneDetectionEnabled(true)');
if (consentPersistIndex < 0 || locationEnableIndex < 0 || passiveEnableIndex < 0) {
  fail('location consent transaction boundary could not be located');
} else if (!(consentPersistIndex < locationEnableIndex && consentPersistIndex < passiveEnableIndex)) {
  fail('location collection switches must only enable after durable consent recording succeeds');
}
if (!featureHook.includes("if (isLocationConsent && !token)")) {
  fail('unauthenticated/demo location consent must fail closed');
}
if (!featureHook.includes("setConsent('location_opt_in', false)")) {
  fail('location consent failure path must force local opt-in false');
}
if (!featureHook.includes('setPassivePhoneDetectionEnabled(false)')) {
  fail('location consent failure path must force passive detection off');
}
if (/void\s+saveFeatureConsent\s*\(/.test(featureHook)) {
  fail('consent persistence must not be fire-and-forget');
}

// Positive location authority may only be created by the dedicated method used
// after durable recording. Generic/local consent writes are withdrawal-only.
if (!preferences.includes('activateLocationConsentFromDurableAuthority: () => void;') ||
    !preferences.includes('activateLocationConsentFromDurableAuthority: () =>')) {
  fail('preferences store must expose a dedicated durable-authority location activation method');
}
if (!preferences.includes("if (key === 'location_opt_in')")) {
  fail('generic consent setter must special-case sensitive location authority');
}
if (!preferences.includes('if (value) return {};')) {
  fail('generic consent setter must refuse to manufacture positive location authority');
}
const locationWithdrawalPattern = /location_opt_in:\s*false[\s\S]{0,220}passivePhoneDetectionEnabled:\s*false/;
if (!locationWithdrawalPattern.test(preferences)) {
  fail('withdrawing location authority must disable passive phone detection in the same store transition');
}
if (!preferences.includes('passivePhoneDetectionEnabled: enabled && state.consents.location_opt_in')) {
  fail('passive phone detection setter must fail closed without location authority');
}
if (!settingsScreen.includes('onValueChange={onLocationConsentChange}')) {
  fail('settings location switch must use the guarded location handler');
}
if (!settingsScreen.includes("setConsent('location_opt_in', false)")) {
  fail('settings location switch must retain a direct withdrawal path');
}
if (!behaviorSettings.includes('disabled={!locationOptIn}')) {
  fail('behavior settings must disable passive phone detection when location authority is absent');
}
if (!behaviorSettings.includes('value={locationOptIn && passivePhoneDetectionEnabled}')) {
  fail('behavior settings must render passive detection off when location authority is absent');
}

if (!featureProgressRoutes.includes('FEATURE_PROGRESS_PERSISTENCE_NOT_READY')) {
  fail('durable feature/consent authority must remain explicitly fail-closed while unimplemented');
}
if (!featureProgressRoutes.includes("return persistenceUnavailable(c, 'record_consent')")) {
  fail('record_consent route must remain fail-closed until durable authority exists');
}

if (!mobileBle.includes("Omit<TagFrame['payload'], 'latitudeE6' | 'longitudeE6'>")) {
  fail('mobile BLE callback contract must omit exact TAG coordinates');
}
if (!mobileBle.includes('minimizeLocationForApp(parseSensorFrame(raw))')) {
  fail('BLE notification boundary must minimize exact location before application publish');
}
if (!mobileBle.includes('const { latitudeE6, longitudeE6, ...payload } = frame.payload;')) {
  fail('location minimizer must explicitly discard exact TAG latitude/longitude');
}
if (/export\s*\{[^}]*parseSensorFrame/.test(mobileBle)) {
  fail('mobile BLE service must not re-export the unsanitized protocol parser');
}

const sensorValidatorStart = sharedValidators.indexOf('export const SensorSummaryCreateSchema = z.object({');
const sensorValidatorEnd = sharedValidators.indexOf('// ── Community Validators', sensorValidatorStart);
if (sensorValidatorStart < 0 || sensorValidatorEnd < 0) {
  fail('SensorSummaryCreateSchema contract could not be located');
} else {
  const section = sharedValidators.slice(sensorValidatorStart, sensorValidatorEnd);
  if (!section.includes('}).strict();')) {
    fail('SensorSummaryCreateSchema must reject unknown exact-location fields');
  }
  if (/\blatitude(?:E6)?\b|\blongitude(?:E6)?\b/.test(section)) {
    fail('SensorSummaryCreateSchema must not accept exact coordinates');
  }
}

const sensorTableStart = sensorDbSchema.indexOf("export const sensorSummaries = pgTable('sensor_summaries'");
const sensorTableEnd = sensorDbSchema.indexOf('export const eliStates', sensorTableStart);
if (sensorTableStart < 0 || sensorTableEnd < 0) {
  fail('sensor_summaries persistence contract could not be located');
} else {
  const section = sensorDbSchema.slice(sensorTableStart, sensorTableEnd);
  if (/\blatitude(?:E6)?\b|\blongitude(?:E6)?\b|\blat\b|\blon\b/.test(section)) {
    fail('sensor_summaries must not persist exact coordinates');
  }
}

if (!sensorRoutes.includes('PRESENCE_PERSISTENCE_NOT_READY')) {
  fail('copresence/presence persistence must remain explicitly unavailable');
}
if (!sensorRoutes.includes("return presencePersistenceUnavailable(c, 'create_presence_event')")) {
  fail('presence creation must fail closed while retention authority is undefined');
}
if (!sensorIntegrationTest.includes('{ latitudeE6: 48581234, longitudeE6: 2294567 }')) {
  fail('PostgreSQL integration must prove BLE-style exact coordinates are rejected at HTTP ingress');
}
if (!sensorIntegrationTest.includes('{ latitude: 48.581234, longitude: 2.294567 }')) {
  fail('PostgreSQL integration must prove conventional exact coordinates are rejected at HTTP ingress');
}

const mobilePackage = JSON.parse(mobilePackageSource);
const mobileDependencies = {
  ...(mobilePackage.dependencies ?? {}),
  ...(mobilePackage.devDependencies ?? {}),
};
for (const dependency of ['expo-location', '@react-native-community/geolocation', 'react-native-geolocation-service']) {
  if (dependency in mobileDependencies) {
    fail(`mobile must not add phone-location collection package ${dependency} before location authority exists`);
  }
}

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const skippedDirectories = new Set(['node_modules', '.next', 'dist', 'build', '__tests__', 'test', 'tests']);
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
    if (!entry.isFile() || !sourceExtensions.has(extname(entry.name))) continue;
    if (/\.(?:test|spec)\.[^.]+$/.test(entry.name)) continue;
    files.push(relativePath);
  }
  return files;
}

const forbiddenMobileLocationMarkers = [
  { pattern: /from\s+['"]expo-location['"]/, label: 'expo-location import' },
  { pattern: /navigator\.geolocation\b/, label: 'navigator.geolocation' },
  { pattern: /getCurrentPosition(?:Async)?\s*\(/, label: 'current-position API' },
  { pattern: /watchPosition(?:Async)?\s*\(/, label: 'position-watch API' },
  { pattern: /GPS_MODE_TRACKING/, label: 'GPS tracking enable mode' },
  { pattern: /GPS_MODE_GEOFENCE/, label: 'GPS geofence enable mode' },
  { pattern: /buildSetGpsMode\s*\(/, label: 'GPS mode command builder call' },
  { pattern: /buildSetGeofence\s*\(/, label: 'geofence command builder call' },
  { pattern: /setConsent\(\s*['"]location_opt_in['"]\s*,\s*true\s*\)/, label: 'direct local positive location consent' },
];

for (const file of await collectSourceFiles('apps/mobile')) {
  const source = await read(file);
  for (const { pattern, label } of forbiddenMobileLocationMarkers) {
    if (pattern.test(source)) {
      fail(`${relative(root, join(root, file))} contains forbidden pre-authority location runtime marker: ${label}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Location privacy boundary audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Location privacy boundary audit passed for repository runtime surfaces: opt-in defaults off, durable consent precedes the only positive local activation path, withdrawal disables dependent passive detection, direct local activation is rejected, exact TAG coordinates are discarded before app callbacks, sensor ingress/storage exclude exact coordinates, and presence persistence remains fail-closed.');
console.log('Scope note: this gate does not establish a legal retention period, implement durable consent persistence, or attest device firmware/default GPS behavior that is absent from this repository.');
