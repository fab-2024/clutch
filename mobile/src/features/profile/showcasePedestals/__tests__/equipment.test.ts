import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  loadShowcasePedestalEquipment,
  normalizeAssignments,
  saveShowcasePedestalEquipment,
  subscribeShowcasePedestalEquipment,
} from '../equipment';

describe('showcase pedestal equipment', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('persists independent pedestal choices for several room slots', async () => {
    await saveShowcasePedestalEquipment('Fab The Tap', {
      rank: 'serment-du-givre-ice-sheet-pedestal',
      trophy: 'sang-des-titans-monolith-pedestal',
    });

    await expect(loadShowcasePedestalEquipment('Fab The Tap')).resolves.toEqual({
      rank: 'serment-du-givre-ice-sheet-pedestal',
      trophy: 'sang-des-titans-monolith-pedestal',
    });
    await expect(loadShowcasePedestalEquipment('Another')).resolves.toEqual({});
  });

  it('drops malformed and unknown slots from stored layouts', () => {
    expect(normalizeAssignments({
      rank: 'valid-pedestal',
      trophy: '',
      unknown: 'stale-pedestal',
    })).toEqual({ rank: 'valid-pedestal' });
    expect(normalizeAssignments(['invalid'])).toEqual({});
  });

  it('notifies other mounted surfaces after a layout change', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeShowcasePedestalEquipment(listener);
    await saveShowcasePedestalEquipment('Fab', { badge: 'rosette-pedestal' });
    expect(listener).toHaveBeenCalledWith('Fab', { badge: 'rosette-pedestal' });
    unsubscribe();
  });
});
