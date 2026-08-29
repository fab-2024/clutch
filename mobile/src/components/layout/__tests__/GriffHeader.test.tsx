/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { GriffHeader } from '../GriffHeader';

let mockCompactWidth = false;
let mockShortLandscape = false;

jest.mock('@/src/components/layout/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isCompactWidth: mockCompactWidth,
    isLandscape: mockShortLandscape,
    isShortLandscape: mockShortLandscape,
  }),
}));

jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ frags: 1842, volts: 680 }),
}));

describe('GriffHeader', () => {
  beforeEach(() => {
    mockCompactWidth = false;
    mockShortLandscape = false;
  });

  it('restores the heritage lockup beside the wallet as one semantic brand surface', async () => {
    const screen = await render(<GriffHeader variant="wallet" />);
    const headerStyle = StyleSheet.flatten(screen.getByTestId('griff-header-wallet').props.style);
    const economyStyle = StyleSheet.flatten(screen.getByTestId('griff-header-economy').props.style);
    const lockupStyle = StyleSheet.flatten(screen.getByTestId('griff-lockup').props.style);

    expect(headerStyle.minHeight).toBe(84);
    expect(economyStyle.boxShadow).toBeUndefined();
    expect(lockupStyle.width).toBe(118);
    expect(screen.getByLabelText('GRIFF')).toBeTruthy();
    expect(screen.getByTestId('griff-lockup-dot')).toBeTruthy();
    expect(screen.getByRole('summary').props.accessibilityLabel).toMatch(/1.842 Frags, 680 Volts/);
  });

  it('keeps the complete lockup and wallet readable on compact widths', async () => {
    mockCompactWidth = true;

    const screen = await render(<GriffHeader variant="wallet" />);
    const headerStyle = StyleSheet.flatten(screen.getByTestId('griff-header-wallet').props.style);
    const economyStyle = StyleSheet.flatten(screen.getByTestId('griff-header-economy').props.style);
    const lockupStyle = StyleSheet.flatten(screen.getByTestId('griff-lockup').props.style);

    expect(screen.getByText('GRIFF')).toBeTruthy();
    expect(lockupStyle.width).toBe(104);
    expect(headerStyle.minHeight).toBe(84);
    expect(economyStyle.width).toBe(170);
    expect(screen.getByRole('summary')).toBeTruthy();
  });

  it('keeps a wallet accessory beside the currencies at 320px', async () => {
    mockCompactWidth = true;

    const screen = await render(
      <GriffHeader
        accessory={<View testID="wallet-accessory" />}
        compact
        variant="wallet"
      />,
    );
    const headerStyle = StyleSheet.flatten(screen.getByTestId('griff-header-wallet').props.style);
    const economyStyle = StyleSheet.flatten(screen.getByTestId('griff-header-economy').props.style);
    const lockupStyle = StyleSheet.flatten(screen.getByTestId('griff-lockup').props.style);

    expect(screen.getByTestId('wallet-accessory')).toBeTruthy();
    expect(headerStyle.paddingHorizontal).toBe(8);
    expect(lockupStyle.width).toBe(88);
    expect(economyStyle.width).toBe(162);
  });

  it('lets tab screens replace the lockup with a compact profile identity', async () => {
    mockCompactWidth = true;

    const screen = await render(
      <GriffHeader
        accessory={<View testID="wallet-accessory" />}
        compact
        leading={<View testID="profile-identity" />}
        variant="wallet"
      />,
    );
    const leadingStyle = StyleSheet.flatten(screen.getByTestId('griff-header-leading').props.style);

    expect(screen.getByTestId('profile-identity')).toBeTruthy();
    expect(screen.queryByTestId('griff-lockup')).toBeNull();
    expect(leadingStyle.width).toBe(88);
  });

  it('preserves the existing default presentation for non-wallet contexts', async () => {
    const screen = await render(<GriffHeader economy={{ frags: 12, volts: 34 }} />);

    expect(screen.getByTestId('griff-header-default')).toBeTruthy();
    expect(screen.getByLabelText('GRIFF')).toBeTruthy();
    expect(screen.getByRole('summary').props.accessibilityLabel).toBe('12 Frags, 34 Volts');
  });
});
