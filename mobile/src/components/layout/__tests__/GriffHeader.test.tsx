/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/src/theme';

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

  it('presents the wallet header as one semantic economy surface with Volt branding', async () => {
    const screen = await render(<GriffHeader variant="wallet" />);
    const headerStyle = StyleSheet.flatten(screen.getByTestId('griff-header-wallet').props.style);
    const economyStyle = StyleSheet.flatten(screen.getByTestId('griff-header-economy').props.style);
    const markStyle = StyleSheet.flatten(screen.getByLabelText('Logo GRIFF').props.style);

    expect(headerStyle.minHeight).toBe(84);
    expect(economyStyle.backgroundColor).toBe(colors.surfaceLow);
    expect(economyStyle.borderColor).toBe(colors.borderSubtle);
    expect(economyStyle.boxShadow).toBeUndefined();
    expect(markStyle.tintColor).toBe(colors.volt);
    expect(screen.getByRole('summary').props.accessibilityLabel).toMatch(/1.842 Frags, 680 Volts/);
  });

  it('keeps the wallet readable without a redundant wordmark on compact widths', async () => {
    mockCompactWidth = true;

    const screen = await render(<GriffHeader compact variant="wallet" />);
    const headerStyle = StyleSheet.flatten(screen.getByTestId('griff-header-wallet').props.style);
    const economyStyle = StyleSheet.flatten(screen.getByTestId('griff-header-economy').props.style);

    expect(screen.queryByText('GRIFF')).toBeNull();
    expect(headerStyle.minHeight).toBe(72);
    expect(economyStyle.width).toBe(170);
    expect(screen.getByRole('summary')).toBeTruthy();
  });

  it('preserves the existing default presentation for non-wallet contexts', async () => {
    const screen = await render(<GriffHeader economy={{ frags: 12, volts: 34 }} />);

    expect(screen.getByTestId('griff-header-default')).toBeTruthy();
    expect(screen.getByLabelText('GRIFF')).toBeTruthy();
    expect(screen.getByRole('summary').props.accessibilityLabel).toBe('12 Frags, 34 Volts');
  });
});
