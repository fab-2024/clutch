/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import { RankEmblem } from '../RankEmblem';

const BRONZE_ASSET = require('../../../../../assets/rank/bronze-transparent.png');

describe('RankEmblem', () => {
  it('uses the Bronze artwork when no higher grade is available', async () => {
    const screen = await render(<RankEmblem grade={null} size={64} />);

    expect(screen.getByLabelText('Emblème Bronze')).toBeTruthy();
    expect(screen.getByTestId('rank-emblem-image').props.source).toBe(BRONZE_ASSET);
  });
});
