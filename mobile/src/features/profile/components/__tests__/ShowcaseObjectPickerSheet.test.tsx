/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import ShowcaseObjectPickerSheet from '../showcase/ShowcaseObjectPickerSheet';
import {
  SHOWCASE_ROOM_SLOTS,
  type ShowcasePlaceableItem,
} from '../showcase/roomEditor';

jest.mock('@/src/components/overlays/BaseSheet', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    BaseSheet: ({ children, testID, title, visible }: {
      children: ReactNode;
      testID?: string;
      title: string;
      visible: boolean;
    }) => visible ? (
      <ReactNative.View testID={testID}>
        <ReactNative.Text>{title}</ReactNative.Text>
        {children}
      </ReactNative.View>
    ) : null,
  };
});

const ITEMS: ShowcasePlaceableItem[] = [
  { accent: '#F5792A', id: 'jersey:fnc', kind: 'jersey', name: 'Fnatic' },
  { accent: '#63B8FF', id: 'badge:first', kind: 'badge', name: 'Premier Signal' },
  { accent: '#FFB84D', id: 'trophy:first', kind: 'trophy', name: 'Premier Signal' },
];

describe('ShowcaseObjectPickerSheet', () => {
  it('lets a room placement receive an obtained object or become empty', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <ShowcaseObjectPickerSheet
        current={ITEMS[0]}
        items={ITEMS}
        onClose={jest.fn()}
        onSelect={onSelect}
        slot={SHOWCASE_ROOM_SLOTS[1]}
      />,
    );

    expect(screen.getByTestId('showcase-object-picker')).toBeTruthy();
    expect(screen.getAllByText('TROPHÉE')).toHaveLength(2);
    expect(screen.getAllByText('BADGE')).toHaveLength(2);
    expect(screen.getByText('MAILLOT')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('showcase-placeable-badge:first'));
    await fireEvent.press(screen.getByTestId('showcase-object-empty'));

    expect(onSelect).toHaveBeenNthCalledWith(1, ITEMS[1]);
    expect(onSelect).toHaveBeenNthCalledWith(2, null);
  });
});
