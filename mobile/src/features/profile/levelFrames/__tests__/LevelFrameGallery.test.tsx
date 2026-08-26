/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { resolveLevelFrameCollection } from '../catalog';
import LevelFrameGallery from '../components/LevelFrameGallery';

describe('LevelFrameGallery', () => {
  it('shows the six Signal Ascendant stages in the shop', async () => {
    const screen = await render(
      <LevelFrameGallery
        entries={resolveLevelFrameCollection('signalAscendant', ['signalAscendant'])}
        level={42}
        mode="shop"
      />,
    );

    expect(screen.getByText('NIV. 2')).toBeTruthy();
    expect(screen.getByText('NIV. 10')).toBeTruthy();
    expect(screen.getByText('NIV. 100+')).toBeTruthy();
    expect(screen.getAllByText(/ÉTAT/)).toHaveLength(6);
  });

  it('equips only an owned frame from the Locker', async () => {
    const onEquip = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <LevelFrameGallery
        entries={resolveLevelFrameCollection('signalAscendant', ['signalAscendant', 'azurOrbit'])}
        level={42}
        mode="locker"
        onEquip={onEquip}
      />,
    );

    fireEvent.press(screen.getByLabelText('ÉQUIPER, Orbite Azur'));
    fireEvent.press(screen.getByLabelText('VERROUILLÉ, Prisme Nova'));

    expect(onEquip).toHaveBeenCalledTimes(1);
    expect(onEquip).toHaveBeenCalledWith('azurOrbit');
  });
});
