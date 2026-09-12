import { act, fireEvent, render } from '@testing-library/react-native';
import CollectiveRelic from '../CollectiveRelic';
import { factionProgress } from '../../utils';
import type { CommunityFaction, CommunityMutationPresentation } from '../../types';

const mockEvolve = jest.fn();
const mockReact = jest.fn();
let mockScene: any;
jest.mock('../../reactor/ReactorScene', () => {
  const React = require('react');
  return { ReactorScene: React.forwardRef((props: any, ref: any) => {
    mockScene = props;
    React.useImperativeHandle(ref, () => ({ evolve: mockEvolve, react: mockReact }));
    return React.createElement(require('react-native').View);
  }) };
});
const faction = { equipe_id: 'kc', nom: 'KC' } as CommunityFaction;
const event: CommunityMutationPresentation = { id: 'event', from_level: 1, to_level: 4, name: 'Citadelle', threshold: 2000, reward: 0, awakened: false, occurred_at: '2026-09-12' };
beforeEach(() => { jest.clearAllMocks(); });
it('plays a missed multi-level evolution with the actual destination fill, acknowledges only on completion, and permits replay', async () => {
  const acknowledge = jest.fn();
  const screen = await render(<CollectiveRelic faction={faction} progress={factionProgress(3500)} mutation={event} onMutationPresented={acknowledge} />);
  expect(mockScene.stage).toBe(4);
  expect(mockScene.fillRatio).toBe(.5);
  await fireEvent.press(screen.getByText('Voir l’évolution'));
  expect(mockEvolve).toHaveBeenCalledWith(4, .5);
  expect(acknowledge).not.toHaveBeenCalled();
  await act(async () => mockScene.onEvolutionComplete());
  expect(acknowledge).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Votre faction a évolué : Citadelle.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Revoir la transformation'));
  await act(async () => mockScene.onEvolutionComplete());
  expect(acknowledge).toHaveBeenCalledTimes(1);
});
it('keeps an interrupted evolution available without marking it seen', async () => {
  const acknowledge = jest.fn();
  const screen = await render(<CollectiveRelic faction={faction} progress={factionProgress(3500)} mutation={event} onMutationPresented={acknowledge} />);
  await fireEvent.press(screen.getByText('Voir l’évolution'));
  await act(async () => mockScene.onEvolutionCancel());
  expect(screen.getByText('Voir l’évolution')).toBeTruthy();
  expect(acknowledge).not.toHaveBeenCalled();
});
it('uses live supporter changes without remounting the scene and handles full Nexus without a sixth vessel', async () => {
  const screen = await render(<CollectiveRelic faction={faction} progress={factionProgress(300)} />);
  expect(mockScene.fillRatio).toBe(.5);
  await screen.rerender(<CollectiveRelic faction={faction} progress={factionProgress(301)} />);
  expect(mockScene.fillRatio).toBe(.5025);
  expect(mockReact).toHaveBeenCalledTimes(1);
  await screen.rerender(<CollectiveRelic faction={faction} progress={factionProgress(12000)} mutation={{ ...event, from_level: 5, to_level: 6 }} />);
  await fireEvent.press(screen.getByText('Voir l’évolution'));
  expect(mockEvolve).toHaveBeenLastCalledWith(5, 1);
});

it('leaves failed persistence retryable instead of silently losing the event', async () => {
  const acknowledge = jest.fn().mockRejectedValueOnce(new Error('storage unavailable')).mockResolvedValue(undefined);
  const screen = await render(<CollectiveRelic faction={faction} progress={factionProgress(3500)} mutation={event} onMutationPresented={acknowledge} />);
  await fireEvent.press(screen.getByText('Voir l’évolution'));
  await act(async () => mockScene.onEvolutionComplete());
  expect(screen.getByText('Voir l’évolution')).toBeTruthy();
  await fireEvent.press(screen.getByText('Voir l’évolution'));
  await act(async () => mockScene.onEvolutionComplete());
  expect(acknowledge).toHaveBeenCalledTimes(2);
});
