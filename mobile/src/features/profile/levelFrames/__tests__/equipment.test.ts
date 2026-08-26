/// <reference types="jest" />

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadLevelFrameEquipment,
  resolveLevelFrameEquip,
  saveLevelFrameEquipment,
} from '../equipment';

describe('level frame equipment', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('persists an equipped owned frame', async () => {
    await saveLevelFrameEquipment('FabTheTap', 'violetSovereign');
    await expect(loadLevelFrameEquipment('FabTheTap')).resolves.toBe('violetSovereign');
  });

  it('rejects a locked paid frame while keeping the current one', () => {
    expect(resolveLevelFrameEquip('signalAscendant', 'novaPrism', ['signalAscendant'])).toBe('signalAscendant');
  });

  it('accepts an owned paid frame and always accepts Signal Ascendant', () => {
    expect(resolveLevelFrameEquip('signalAscendant', 'azurOrbit', ['signalAscendant', 'azurOrbit'])).toBe('azurOrbit');
    expect(resolveLevelFrameEquip('azurOrbit', 'signalAscendant', ['azurOrbit'])).toBe('signalAscendant');
  });
});
