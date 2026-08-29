/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { layout } from '@/src/theme';

import { SegmentedControl } from '../SegmentedControl';

describe('SegmentedControl', () => {
  it('exposes selected tab semantics, a bounded badge and shared touch targets', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <SegmentedControl
        accessibilityLabel="Vue du Cercle"
        items={[
          { value: 'activity', label: 'ACTIVITÉ', badge: 120 },
          { value: 'friends', label: 'AMIS', accessibilityLabel: 'TOUS LES AMIS' },
        ]}
        onChange={onChange}
        value="activity"
      />,
    );

    const selected = screen.getByRole('tab', { name: 'ACTIVITÉ, 120' });
    const friends = screen.getByRole('tab', { name: 'TOUS LES AMIS' });

    expect(selected.props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByText('99+')).toBeTruthy();
    expect(screen.getByText('ACTIVITÉ').props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(selected.props.style).minHeight).toBeGreaterThanOrEqual(layout.minTouchTarget);
    expect(StyleSheet.flatten(friends.props.style).minHeight).toBeGreaterThanOrEqual(layout.minTouchTarget);
    expect(StyleSheet.flatten(screen.getByText('99+').parent?.props.style).height).toBeUndefined();

    await fireEvent.press(friends);
    expect(onChange).toHaveBeenCalledWith('friends');
  });
});
