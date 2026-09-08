#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const failures = [];

function read(path) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) {
    failures.push(`missing file: ${path}`);
    return '';
  }
  return readFileSync(absolute, 'utf8');
}

function requireText(path, content, values) {
  for (const value of values) {
    if (!content.includes(value)) failures.push(`${path}: missing ${value}`);
  }
}

function forbidText(path, content, values) {
  for (const value of values) {
    if (content.includes(value)) failures.push(`${path}: forbidden ${value}`);
  }
}

const homePath = 'apps/mobile/app/(tabs)/index.tsx';
const devicesPath = 'apps/mobile/app/devices.tsx';
const home = read(homePath);
const devices = read(devicesPath);

requireText(homePath, home, [
  'G-HOME-ORCHESTRATION-01',
  'Home is an orchestration surface, not a verdict surface.',
  'Rien ne demande ton attention dans EMOPET pour le moment.',
  'Ce n’est pas une conclusion sur l’état de ton chien.',
  "import { colors, fontFamily } from '../../src/theme';",
]);

forbidText(homePath, home, [
  'AnticipationCard',
  'shouldShowAnticipationCard',
  'Une nuit observée',
  'Rien de particulier à signaler pour le moment.',
  '#221E72',
  '#35BEB2',
  '#F5EEE7',
]);

requireText(devicesPath, devices, [
  "import { colors, fontFamily } from '../src/theme';",
  "state={hardwareLinked ? 'Associé' : 'Non associé'}",
  'Les données du TAG restent des sources d’observation, pas un diagnostic ni un récit émotionnel.',
]);

forbidText(devicesPath, devices, [
  "state={hardwareLinked ? 'Au repos'",
  "state={hardwareLinked ? 'Porté'",
  '#221E72',
  '#35BEB2',
  '#F5EEE7',
]);

if (failures.length > 0) {
  console.error('Mobile Home authority audit FAILED:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Mobile Home authority audit PASS.');
console.log('PASS proves static Home/Devices authority invariants only; it is not UX, scientific, or animal validation.');
