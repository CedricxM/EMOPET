#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

const schematicPath = argValue('--schematic');
const ercPath = argValue('--erc');
const pcbPath = argValue('--pcb');

if (!schematicPath || !ercPath) {
  console.error('Usage: node tag-source-coherence.mjs --schematic <file.kicad_sch> --erc <ERC.rpt> [--pcb <file.kicad_pcb>]');
  process.exit(2);
}

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    console.error(`[TAG-SOURCE-COHERENCE] cannot read ${path}: ${error.message}`);
    process.exit(2);
  }
}

function placedRefs(text) {
  const refs = new Set();
  const re = /\(property\s+"Reference"\s+"([A-Za-z]+\d+)"/g;
  for (const match of text.matchAll(re)) refs.add(match[1]);
  return refs;
}

function ercRefs(text) {
  const refs = new Set();
  const re = /Symbol\s+([A-Za-z]+\d+)\s+Pin\s+/g;
  for (const match of text.matchAll(re)) refs.add(match[1]);
  return refs;
}

function sortRefs(refs) {
  return [...refs].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

const schRefs = placedRefs(read(schematicPath));
const receiptRefs = ercRefs(read(ercPath));

if (receiptRefs.size === 0) {
  console.error(`[TAG-SOURCE-COHERENCE] ERC receipt ${basename(ercPath)} contains no parsed symbol references; refusing to claim coherence.`);
  process.exit(1);
}

const ercMissingFromSch = sortRefs([...receiptRefs].filter((ref) => !schRefs.has(ref)));

console.log(`[TAG-SOURCE-COHERENCE] schematic=${basename(schematicPath)} placed_refs=${schRefs.size}`);
console.log(`[TAG-SOURCE-COHERENCE] erc=${basename(ercPath)} referenced_refs=${receiptRefs.size}`);

if (pcbPath) {
  const pcbRefs = placedRefs(read(pcbPath));
  const pcbMissingFromSch = sortRefs([...pcbRefs].filter((ref) => !schRefs.has(ref)));
  console.log(`[TAG-SOURCE-COHERENCE] pcb=${basename(pcbPath)} placed_refs=${pcbRefs.size}`);
  if (pcbMissingFromSch.length) {
    console.log(`[TAG-SOURCE-COHERENCE] note: PCB contains refs absent from schematic: ${pcbMissingFromSch.join(', ')}`);
  }
}

if (ercMissingFromSch.length) {
  console.error(`[TAG-SOURCE-COHERENCE] FAIL: ERC references symbols absent from the schematic: ${ercMissingFromSch.join(', ')}`);
  console.error('[TAG-SOURCE-COHERENCE] The schematic/ERC pair is mixed-version or incomplete. Recover/reconstruct the ERC-generating schematic and run a fresh native ERC before electrical closure.');
  process.exit(1);
}

console.log('[TAG-SOURCE-COHERENCE] PASS: every symbol referenced by the ERC receipt exists in the schematic.');
