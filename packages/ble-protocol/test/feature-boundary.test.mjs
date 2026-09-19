import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BleParseError,
  SOURCE_MAT,
  SOURCE_TAG,
  parseProtocolVerifiedSensorFrame,
  parseSensorFrame,
  serializeMatFrame,
  serializeTagFrame,
} from '../dist/index.js';

const matFrame = {
  header: {
    header: 0xea,
    version: 1,
    source: SOURCE_MAT,
    seq: 7,
    timestampMs: 123456,
  },
  payload: {
    respiratoryRate: 180,
    respiratoryRegularity: 88,
    microMovementEnergy: 12,
    weightGrams: 18400,
    copX: -4,
    copY: 9,
    weightStability: 92,
    corners: [4600, 4550, 4620, 4630],
    temperatureC10: 192,
    humidityPct10: 630,
    pvdfReliability: 0,
    loadCellReliability: 0,
  },
};

const tagFrame = {
  header: {
    header: 0xea,
    version: 1,
    source: SOURCE_TAG,
    seq: 8,
    timestampMs: 654321,
  },
  payload: {
    activityMg: 245,
    posture: 5,
    agitationIndex: 18,
    collarOrientationOk: 1,
    vocalEvents: 2,
    vocalEnergyMean: 184,
    vocalCentroidHz: 1200,
    vibroConfirmed: 1,
    throatRespRate: 176,
    latitudeE6: 48581234,
    longitudeE6: 2294567,
    imuReliability: 0,
    micReliability: 0,
    piezoReliability: 0,
    gpsReliability: 1,
  },
};

function expectParseCode(bytes, code) {
  assert.throws(
    () => parseProtocolVerifiedSensorFrame(bytes),
    (error) => error instanceof BleParseError && error.code === code,
  );
}

test('protocol-verified wrapper accepts valid MAT and TAG frames without changing parsed shape', () => {
  for (const [frame, serialize] of [
    [matFrame, serializeMatFrame],
    [tagFrame, serializeTagFrame],
  ]) {
    const wire = serialize(frame);
    const parsed = parseSensorFrame(wire);
    const verified = parseProtocolVerifiedSensorFrame(wire);

    assert.deepEqual(verified, parsed);
    assert.equal(verified.header.source, frame.header.source);
    assert.equal(verified.header.seq, frame.header.seq);
    assert.equal(verified.header.timestampMs, frame.header.timestampMs);
  }
});

test('protocol-verified wrapper remains bound to canonical header/version/source/length/CRC validation', () => {
  const valid = serializeMatFrame(matFrame);

  const badHeader = valid.slice();
  badHeader[0] = 0;
  expectParseCode(badHeader, 'INVALID_HEADER');

  const badVersion = valid.slice();
  badVersion[1] = 2;
  expectParseCode(badVersion, 'INVALID_VERSION');

  const badSource = valid.slice();
  badSource[2] = 3;
  expectParseCode(badSource, 'INVALID_SOURCE');

  expectParseCode(valid.slice(0, -1), 'INVALID_LENGTH');

  const badCrc = valid.slice();
  badCrc[badCrc.length - 1] ^= 0x01;
  expectParseCode(badCrc, 'CRC_MISMATCH');
});
