/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { GriffEmblem, GriffLockup } from '../GriffLogo';

describe('GriffLogo', () => {
  it('renders the restored copper emblem, white wordmark and Volt point as one logo', async () => {
    const screen = await render(<GriffLockup width={128} />);
    const mark = screen.getByTestId('griff-mark', { includeHiddenElements: true });
    const dotStyle = StyleSheet.flatten(screen.getByTestId('griff-lockup-dot').props.style);

    expect(screen.getByLabelText('GRIFF')).toBeTruthy();
    expect(screen.getByText('GRIFF')).toBeTruthy();
    expect(mark.props.tintColor).toBe('#C98154');
    expect(dotStyle.backgroundColor).toBe('#E8FF3D');
    expect(screen.queryByLabelText('Logo GRIFF')).toBeNull();
  });

  it('keeps the standalone emblem available as an accessible brand mark', async () => {
    const screen = await render(<GriffEmblem size={38} />);
    const emblemStyle = StyleSheet.flatten(screen.getByTestId('griff-emblem').props.style);

    expect(screen.getByLabelText('Logo GRIFF')).toBeTruthy();
    expect(emblemStyle.width).toBe(38);
    expect(emblemStyle.height).toBe(38);
  });
});
