import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFile(join(root, path), 'utf8');

const inventoryPath = 'config/privacy/runtime-egress-inventory.json';
const inventory = JSON.parse(await read(inventoryPath));

if (inventory.classification !== 'TECHNICAL_RUNTIME_EGRESS_INVENTORY_NOT_LEGAL_CLEARANCE') {
  fail('runtime egress inventory must remain explicitly classified as technical evidence, not legal clearance');
}
if (!String(inventory.scopeNote ?? '').includes('does not establish')) {
  fail('runtime egress inventory must preserve its non-clearance scope note');
}

const entries = Array.isArray(inventory.entries) ? inventory.entries : [];
const byId = new Map(entries.map((entry) => [entry.id, entry]));
for (const id of [
  'anthropic-breiz',
  'resend-contact-notify',
  'open-meteo-weather',
  'openweathermap-backend-weather',
  'mapbox-web-map',
  'osm-overpass-pois',
  'provider-adapter-framework',
]) {
  if (!byId.has(id)) fail(`runtime egress inventory is missing ${id}`);
}

const [
  reiz,
  notify,
  weather,
  backendWeather,
  communityMap,
  mapbox,
  mapboxRights,
  overpass,
  providerConfig,
  adapters,
] = await Promise.all([
  read('apps/web/app/api/breiz/route.ts'),
  read('apps/web/lib/server/notify.ts'),
  read('apps/web/lib/weather.ts'),
  read('backend/api/services/weather.ts'),
  read('apps/web/components/bretagne-map/CommunityMap.tsx'),
  read('apps/web/components/bretagne-map/MapboxMap.tsx'),
  read('apps/web/lib/mapbox-rights.ts'),
  read('apps/web/lib/osm-spots.ts'),
  read('apps/web/lib/api/config.ts'),
  read('apps/web/lib/api/adapters/index.ts'),
]);

function requireBefore(source, gateMarker, egressMarker, label) {
  const gateIndex = source.indexOf(gateMarker);
  const egressIndex = source.indexOf(egressMarker);
  if (gateIndex < 0) fail(`${label} explicit egress gate is missing`);
  if (egressIndex < 0) fail(`${label} runtime egress marker is missing`);
  if (gateIndex >= 0 && egressIndex >= 0 && gateIndex > egressIndex) {
    fail(`${label} gate must be evaluated before the external egress call`);
  }
}

requireBefore(reiz, "process.env['EMOPET_ANTHROPIC_EGRESS_GATE'] === 'GO'", "fetch('https://api.anthropic.com/v1/messages'", 'Anthropic/Breiz');
if (!reiz.includes('!apiKey || !anthropicEgressAllowed')) fail('Anthropic/Breiz must fail closed unless both API key and explicit egress gate are present');

requireBefore(notify, "process.env['EMOPET_RESEND_EGRESS_GATE'] === 'GO'", "fetch('https://api.resend.com/emails'", 'Resend contact notification');
if (!notify.includes('if (!resendEgressAllowed)')) fail('Resend notification must fail closed when its explicit egress gate is not GO');

requireBefore(weather, "process.env.NEXT_PUBLIC_EMOPET_OPEN_METEO_EGRESS_GATE === 'GO'", 'const res = await fetch(url, { signal });', 'Open-Meteo weather');
if (!weather.includes('if (!OPEN_METEO_EGRESS_ALLOWED) return null;')) fail('Open-Meteo current weather must fail closed before network egress');
if (!weather.includes('if (!OPEN_METEO_EGRESS_ALLOWED) return [];')) fail('Open-Meteo forecast must fail closed before network egress');

requireBefore(backendWeather, "process.env['EMOPET_OPENWEATHERMAP_EGRESS_GATE'] === 'GO'", 'const res = await fetch(url);', 'OpenWeatherMap backend weather');
if (!backendWeather.includes('if (!OWM_EGRESS_ALLOWED)')) fail('OpenWeatherMap backend weather must fail closed when its explicit egress gate is not GO');

if (!mapboxRights.includes('process.env.NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE') || !mapboxRights.includes("rightsGate !== 'GO'")) {
  fail('Mapbox must remain disabled unless the explicit rights gate is GO');
}
if (!mapboxRights.includes('process.env.NEXT_PUBLIC_MAPBOX_TOKEN')) {
  fail('Mapbox runtime must still require its token in addition to the operator gate');
}
if (!communityMap.includes('getControlledMapboxToken')) {
  fail('Mapbox wrapper must use the canonical runtime authority helper');
}
if (!mapbox.includes('getControlledMapboxToken')) {
  fail('Mapbox renderer must use the canonical runtime authority helper');
}
if (!mapbox.includes('attributionControl: true')) {
  fail('Mapbox renderer must keep attribution controls enabled');
}

const overpassInventory = byId.get('osm-overpass-pois');
if (
  overpassInventory?.gate !==
  'NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE=GO plus NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT explicit HTTPS endpoint'
) {
  fail('Overpass inventory must require both the rights gate and an explicit controlled HTTPS endpoint');
}
if (!Array.isArray(overpassInventory?.destinationHosts) || !overpassInventory.destinationHosts.includes('operator_configured_https_endpoint')) {
  fail('Overpass inventory must not represent a hardcoded public operator as the production destination');
}
if (!overpass.includes('process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE')) {
  fail('Overpass must retain the explicit rights gate input');
}
if (!overpass.includes('process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT')) {
  fail('Overpass must require an explicit operator endpoint input');
}
if (!overpass.includes("if (rightsGate !== 'GO') return null;")) {
  fail('Overpass endpoint helper must fail closed unless the explicit rights gate is exactly GO');
}
if (!overpass.includes("url.protocol !== 'https:'")) {
  fail('Overpass endpoint helper must require HTTPS');
}
if (!overpass.includes("url.username !== ''") || !overpass.includes("url.password !== ''")) {
  fail('Overpass endpoint helper must reject embedded credentials');
}
if (!overpass.includes("url.search !== ''") || !overpass.includes("url.hash !== ''")) {
  fail('Overpass endpoint helper must reject preconfigured query strings and fragments');
}
if (overpass.includes("const ENDPOINT = 'https://overpass-api.de/api/interpreter'")) {
  fail('Overpass runtime must not silently fall back to the historical public endpoint');
}
requireBefore(overpass, 'const endpoint = getControlledOverpassEndpoint();', 'const res = await fetch(requestUrl.toString()', 'Overpass');
if (!overpass.includes('if (!endpoint) return [];')) {
  fail('Overpass must fail closed before egress when the controlled endpoint is unavailable');
}

if (!providerConfig.includes('return readBoolEnv(flagKey, false);')) fail('provider framework flags must remain OFF by default');
if (!providerConfig.includes('if (!isFlagEnabled(input.flagKey)) return { activable: false')) fail('provider framework must require an explicit per-provider activation flag');

for (const adapter of ['openMeteo', 'metNo', 'openAQ', 'adresseDataGouv', 'geoApiGouv', 'nagerDate', 'dogCeo', 'libreTranslate', 'disify', 'purgoMalum']) {
  if (!new RegExp(`export \\* as ${adapter} from`).test(adapters)) fail(`provider adapter inventory drift: ${adapter} is no longer exported as expected`);
}

const registeredDirectPaths = new Set(entries.filter((entry) => entry.kind === 'direct_fetch').flatMap((entry) => entry.evidencePaths ?? []));
const roots = ['apps/web/app', 'apps/web/lib', 'apps/web/components', 'backend/api', 'apps/mobile/src'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const skipDirs = new Set(['node_modules', '.next', 'dist', 'build', 'test', 'tests', '__tests__']);

async function collect(dir) {
  const out = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await collect(path));
    else if (entry.isFile() && sourceExtensions.has(extname(entry.name)) && !/\.(?:test|spec)\.[^.]+$/.test(entry.name)) out.push(path);
  }
  return out;
}

for (const base of roots) {
  for (const path of await collect(base)) {
    if (path.startsWith('apps/web/lib/api/adapters/')) continue;
    const source = await read(path);
    if (!source.includes('fetch(') || !source.includes('https://')) continue;
    if (!registeredDirectPaths.has(path)) fail(`${path} contains direct external fetch surface but is not registered in ${inventoryPath}`);
  }
}

if (failures.length > 0) {
  console.error('Runtime processor/transfer egress audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Runtime processor/transfer egress audit passed (${entries.length} inventory entries).`);
console.log('Repository defaults are fail-closed for inventoried third-party egress; deployment-time environment activation is not attested by this gate.');
console.log('PASS is technical runtime-egress evidence only. It is not processor/controller, DPA, SCC/transfer, residency, retention, vendor, or legal clearance.');
