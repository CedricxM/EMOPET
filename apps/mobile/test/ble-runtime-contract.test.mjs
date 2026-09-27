import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = JSON.parse(
  readFileSync(new URL('../app.json', import.meta.url), 'utf8'),
);
const ble = readFileSync(
  new URL('../src/services/ble.ts', import.meta.url),
  'utf8',
);
const constants = readFileSync(
  new URL('../../../packages/shared/src/constants/index.ts', import.meta.url),
  'utf8',
);
const authority = JSON.parse(
  readFileSync(new URL('../../../config/eli/io-first-slice.json', import.meta.url), 'utf8'),
);

test('Expo native config enables react-native-ble-plx with required foreground permissions', () => {
  assert.ok(app.expo.plugins.includes('react-native-ble-plx'));
  assert.ok(app.expo.android.permissions.includes('BLUETOOTH_SCAN'));
  assert.ok(app.expo.android.permissions.includes('BLUETOOTH_CONNECT'));
  assert.match(
    app.expo.ios.infoPlist.NSBluetoothAlwaysUsageDescription,
    /Bluetooth/i,
  );
});

test('mobile BLE service is a real central transport rather than a placeholder', () => {
  for (const required of [
    'new BleManager()',
    'requestBlePermissions',
    'startDeviceScan',
    'connectToDevice',
    'discoverAllServicesAndCharacteristics',
    'monitorCharacteristicForService',
    'BLE_CHAR_SENSOR_FRAME',
    'BLE_CHAR_FEATURE_SUMMARY',
    'parseSensorFrame',
    'parseActivityVariabilityFeatureFrame',
    'cancelDeviceConnection',
  ]) {
    assert.ok(ble.includes(required), required);
  }

  assert.doesNotMatch(ble, /TODO:\s*implement with BleManager/);
  assert.doesNotMatch(ble, /stepEKF|eliStates|arousal:|valence:|load:/);
});

test('feature-summary UUID is reserved but end-to-end delivery remains fail-honest', () => {
  assert.match(
    constants,
    /BLE_CHAR_FEATURE_SUMMARY\s*=\s*'0000ea05-0000-1000-8000-00805f9b34fb'/,
  );
  assert.equal(authority.currentTransport.mobileBleNativePluginConfigured, true);
  assert.equal(authority.currentTransport.mobileBleSubscriptionImplemented, true);
  assert.equal(authority.currentTransport.peripheralGattCharacteristicImplemented, false);
  assert.equal(authority.currentTransport.mobileToBackendForwardingImplemented, false);
  assert.equal(authority.currentTransport.endToEndPath, false);
  assert.equal(authority.currentDecision, 'DO_NOT_CLAIM_END_TO_END_DELIVERY');
});
