import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const board = JSON.parse(
  await read('config/firmware/tag-ms88sf3-board-authority-v1.json'),
);
const platform = JSON.parse(
  await read('config/firmware/tag-platform-v1.json'),
);

test('G2 records only source-backed MS88SF3 pins', () => {
  assert.equal(board.module, 'Minew MS88SF3');
  assert.equal(board.soc, 'nRF52840');
  assert.equal(board.productionBoardDefinitionAllowed, false);
  assert.equal(board.productionBoardDefinition, null);

  assert.equal(board.knownSignals.ntcAdc.gpio, 'P0.04');
  assert.equal(board.knownSignals.ntcAdc.function, 'AIN2');
  assert.equal(board.knownSignals.ntcAdc.modulePad, null);
  assert.equal(board.knownSignals.ntcExcite.gpio, 'P0.05');
  assert.equal(board.knownSignals.ntcExcite.modulePad, 15);
  assert.equal(board.knownSignals.hostUartTx.gpio, 'P0.06');
  assert.equal(board.knownSignals.hostUartTx.modulePad, 21);
  assert.equal(board.knownSignals.hostUartRx.gpio, 'P0.08');
  assert.equal(board.knownSignals.hostUartRx.modulePad, 26);
  assert.equal(board.knownSignals.modemMainVddGate.gpio, 'P0.07');
  assert.equal(board.knownSignals.modemMainVddGate.modulePad, 20);
  assert.equal(board.knownSignals.modemVddGpioGate.gpio, 'P0.17');
  assert.equal(board.knownSignals.modemVddGpioGate.modulePad, 41);
});

test('blocking clocks/buses/SWD stay explicitly open', () => {
  for (const key of [
    'nrf9151SideUartPins',
    'bmi270I2cScl',
    'bmi270I2cSda',
    'bmi270Int1',
    'inmp441PdmClk',
    'inmp441PdmData',
    'hfClockSourceAndConfig',
    'lfClockSourceAndConfig',
    'swdProgrammingContract',
    'boardSpecificFlashPartitionAssumptions',
  ]) {
    assert.equal(board.openAuthorities[key], 'OPEN', key);
  }

  assert.equal(
    board.encodingPolicy.unknownSignals,
    'MUST_REMAIN_ABSENT_OR_DISABLED',
  );
  assert.equal(board.encodingPolicy.dkDefaultsMayBecomeProductionAuthority, false);
  assert.equal(
    board.currentDecision,
    'DO_NOT_CREATE_PRODUCTION_MS88SF3_DEVICETREE',
  );
});

test('platform authority points at G2 and still has no production board', () => {
  assert.equal(
    platform.application.boardAuthority,
    'config/firmware/tag-ms88sf3-board-authority-v1.json',
  );
  assert.equal(platform.application.productionBoardDefinition, null);
  assert.equal(platform.application.productionBoardStatus, 'BLOCKED_ON_G2_AUTHORITY');
});

test('no MS88SF3 production board file exists while G2 is blocked', async () => {
  const candidates = [
    path.join(root, 'firmware/collar/ncs/boards'),
    path.join(root, 'boards'),
  ];

  for (const candidate of candidates) {
    try {
      const entries = await readdir(candidate, { recursive: true });
      for (const entry of entries) {
        assert.doesNotMatch(
          String(entry),
          /ms88sf3.*\.(?:dts|dtsi|yaml|yml|defconfig)$/i,
        );
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
});
