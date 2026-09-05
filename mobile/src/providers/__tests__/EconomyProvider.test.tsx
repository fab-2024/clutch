import { act, render } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import type { PlayerEconomy } from '@/src/features/economy/types';
import { EconomyProvider, useEconomy } from '../EconomyProvider';

let mockUserId: string | undefined = 'player-a';
let mockUnlimitedVolts = false;
const mockLoad = jest.fn();
jest.mock('../AuthProvider', () => ({
  useAuth: () => ({
    profile: mockUserId ? { id: mockUserId, volts_illimites: mockUnlimitedVolts } : null,
    session: mockUserId ? { user: { id: mockUserId } } : null,
  }),
}));
jest.mock('@/src/features/economy/api', () => ({ loadPlayerEconomy: (...args: unknown[]) => mockLoad(...args) }));

let economy!: ReturnType<typeof useEconomy>;
function Harness() {
  const current = useEconomy();
  useEffect(() => { economy = current; }, [current]);
  return <Text testID="balance">{current.volts ?? 'unknown'}</Text>;
}
const screenTree = <EconomyProvider><Harness /></EconomyProvider>;

describe('confirmed economy balance', () => {
  beforeEach(() => { mockUserId = 'player-a'; mockUnlimitedVolts = false; mockLoad.mockReset(); });

  it('does not overwrite a confirmed bonus with an older balance request', async () => {
    let resolve!: (value: PlayerEconomy) => void;
    mockLoad.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const screen = await render(screenTree);
    await act(async () => economy.setConfirmedVolts('player-a', 310));
    await act(async () => resolve({ volts: 300, frags: 100, seasonId: 'season-1' }));
    expect(screen.getByTestId('balance')).toHaveTextContent('310');
    mockLoad.mockResolvedValue({ volts: 310, frags: 100, seasonId: 'season-1' });
    await act(async () => economy.refresh());
    expect(economy.frags).toBe(100);
    expect(economy.volts).toBe(310);
  });

  it('rejects an old owner, invalid balances and credits after logout', async () => {
    mockLoad.mockResolvedValue({ volts: 300, frags: 0, seasonId: 'season-1' });
    const screen = await render(screenTree);
    mockUserId = 'player-b';
    mockLoad.mockResolvedValue({ volts: 20, frags: 0, seasonId: 'season-1' });
    await screen.rerender(<EconomyProvider><Harness /></EconomyProvider>);
    await act(async () => {
      economy.setConfirmedVolts('player-a', 999);
      economy.setConfirmedVolts('player-b', -10);
      economy.setConfirmedVolts('player-b', 2.5);
    });
    expect(economy.volts).toBe(20);
    mockUserId = undefined;
    await screen.rerender(<EconomyProvider><Harness /></EconomyProvider>);
    await act(async () => economy.setConfirmedVolts('player-b', 999));
    expect(economy.volts).toBeNull();
  });

  it('exposes unlimited presentation only for the matching developer profile', async () => {
    mockUnlimitedVolts = true;
    mockLoad.mockResolvedValue({ volts: 1_000_000_000, frags: 0, seasonId: 'season-1' });

    await render(screenTree);

    expect(economy.unlimitedVolts).toBe(true);
    expect(economy.volts).toBe(1_000_000_000);
  });
});
