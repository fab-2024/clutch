import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  isShowcaseRingFamily,
  loadShowcaseRingEquipment,
  saveShowcaseRingEquipment,
  subscribeShowcaseRingEquipment,
} from '../equipment';

describe('showcase ring equipment', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('persists one family per profile and removes it cleanly', async () => {
    await saveShowcaseRingEquipment('Fab The Tap', 'major');
    await expect(loadShowcaseRingEquipment('Fab The Tap')).resolves.toBe('major');
    await expect(loadShowcaseRingEquipment('Another')).resolves.toBeNull();

    await saveShowcaseRingEquipment('Fab The Tap', null);
    await expect(loadShowcaseRingEquipment('Fab The Tap')).resolves.toBeNull();
  });

  it('rejects stale or unknown stored values', () => {
    expect(isShowcaseRingFamily('rank')).toBe(true);
    expect(isShowcaseRingFamily('metamorphosis')).toBe(true);
    expect(isShowcaseRingFamily('legendary')).toBe(false);
    expect(isShowcaseRingFamily(null)).toBe(false);
  });

  it('notifies other mounted surfaces after an equipment change', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeShowcaseRingEquipment(listener);
    await saveShowcaseRingEquipment('Fab', 'faction');
    expect(listener).toHaveBeenCalledWith('Fab', 'faction');
    unsubscribe();
  });
});
