/// <reference types="jest" />

import AsyncStorage from '@react-native-async-storage/async-storage';

import { COMMUNITY_FORMS, RELIC_MUTATION_THRESHOLDS } from '../constants';
import {
  attachPendingRelicMutation,
  derivePendingRelicMutation,
  relicPresentationStorageKey,
  rememberRelicMutation,
} from '../mutationPresentation';
import { factionProgress, shouldPresentRelicMutation } from '../utils';
import type {
  CommunityArchive,
  CommunityData,
  CommunityMutationPresentation,
} from '../types';

describe('collective relic progression', () => {
  it.each([
    [0, 0, 'dormant', 'ampoule'],
    [1, 1, 'ampoule', 'ampoule'],
    [99, 1, 'ampoule', 'ampoule'],
    [100, 2, 'fiole', 'fiole'],
    [499, 2, 'fiole', 'fiole'],
    [500, 3, 'flacon', 'flacon'],
    [1_999, 3, 'flacon', 'flacon'],
    [2_000, 4, 'reacteur', 'reacteur'],
    [4_999, 4, 'reacteur', 'reacteur'],
    [5_000, 5, 'reliquaire', 'reliquaire'],
    [9_999, 5, 'reliquaire', 'reliquaire'],
    [10_000, 6, 'awakened', 'reliquaire'],
    [18_750, 6, 'awakened', 'reliquaire'],
  ])('maps charge %i to level %i (%s)', (charge, level, state, container) => {
    const result = factionProgress(charge);
    expect(result.level).toBe(level);
    expect(result.current.state).toBe(state);
    expect(result.current.container).toBe(container);
  });

  it.each([
    [0, 0],
    [50, 49 / 99],
    [300, .5],
    [1_250, .5],
    [3_500, .5],
    [7_500, .5],
    [10_000, 1],
  ])('normalizes charge %i inside its current tier', (charge, expected) => {
    expect(factionProgress(charge).progress).toBeCloseTo(expected, 6);
  });

  it('has contiguous ranges and only the five requested mutation thresholds', () => {
    expect(RELIC_MUTATION_THRESHOLDS).toEqual([100, 500, 2_000, 5_000, 10_000]);
    let failure: string | null = null;
    for (let charge = 0; charge <= 10_001; charge += 1) {
      const result = factionProgress(charge);
      const candidates = COMMUNITY_FORMS.filter((form, index) => {
        const next = COMMUNITY_FORMS[index + 1];
        return charge >= form.threshold && (!next || charge < next.threshold);
      });
      if (candidates.length !== 1 || result.current !== candidates[0]) {
        failure = `charge ${charge}: ${candidates.length} matching ranges`;
        break;
      }
    }
    expect(failure).toBeNull();
  });

  it('caps both bars and removes the next mutation after awakening', () => {
    const result = factionProgress(42_000);
    expect(result.progress).toBe(1);
    expect(result.totalProgress).toBe(1);
    expect(result.remaining).toBe(0);
    expect(result.next).toBeNull();
    expect(result.awakened).toBe(true);
    expect(result.max).toBe(true);
  });
});

describe('mutation presentation idempotence', () => {
  const mutation: CommunityMutationPresentation = {
    id: 'event-42',
    from_level: 2,
    to_level: 5,
    name: 'Reliquaire',
    threshold: 5_000,
    reward: 1_000,
    awakened: false,
    occurred_at: '2026-08-23T10:00:00.000Z',
  };

  it('condenses skipped levels into the single latest presentation', () => {
    expect(shouldPresentRelicMutation(mutation, null)).toBe(true);
  });

  it('does not replay an event already shown', () => {
    expect(shouldPresentRelicMutation(mutation, mutation.id)).toBe(false);
  });

  it('rejects stale or malformed level transitions', () => {
    expect(shouldPresentRelicMutation({ ...mutation, from_level: 5, to_level: 5 }, null)).toBe(false);
    expect(shouldPresentRelicMutation({ ...mutation, to_level: 7 }, null)).toBe(false);
    expect(shouldPresentRelicMutation(null, null)).toBe(false);
  });

  it('builds one condensed presentation for all skipped levels', () => {
    const pending = derivePendingRelicMutation(communityAt(5_000), {
      eventId: 'previous',
      level: 2,
      presentedAt: '2026-08-20T10:00:00.000Z',
    });

    expect(pending).toMatchObject({
      id: 'collective:kc:relic-v2:5',
      from_level: 2,
      to_level: 5,
      name: 'Reliquaire',
      reward: 0,
    });
  });

  it('uses the real faction event and reward when its threshold matches', () => {
    const archive: CommunityArchive = {
      id: 'server-500',
      niveau: 5,
      nom: 'Legacy name',
      seuil: 500,
      recompense_volts: 300,
      membres: 503,
      cree_le: '2026-08-22T10:00:00.000Z',
    };
    const pending = derivePendingRelicMutation(communityAt(500, [archive]), {
      eventId: 'previous',
      level: 2,
      presentedAt: '2026-08-21T10:00:00.000Z',
    });

    expect(pending).toMatchObject({
      id: 'faction-event:server-500:relic-v2:3',
      from_level: 2,
      to_level: 3,
      name: 'Flacon',
      reward: 300,
      occurred_at: archive.cree_le,
    });
  });

  it('does not attach a reward earned before the member joined', () => {
    const archive: CommunityArchive = {
      id: 'old-event',
      niveau: 5,
      nom: 'Legacy name',
      seuil: 500,
      recompense_volts: 300,
      membres: 500,
      cree_le: '2026-08-19T10:00:00.000Z',
    };

    expect(derivePendingRelicMutation(communityAt(500, [archive]), null)).toMatchObject({
      id: 'collective:kc:relic-v2:3',
      reward: 0,
    });
  });

  it('does not replay a level already persisted for that member', () => {
    const data = communityAt(5_000);
    const memory = {
      eventId: 'collective:kc:relic-v2:5',
      level: 5,
      presentedAt: '2026-08-23T10:00:00.000Z',
    };

    expect(derivePendingRelicMutation(data, memory)).toBeNull();
    expect(derivePendingRelicMutation(communityAt(500), memory)).toBeNull();
  });

  it('persists a completed reveal and does not replay it after a reload', async () => {
    await AsyncStorage.clear();
    const firstLoad = await attachPendingRelicMutation(communityAt(500));
    const pending = firstLoad.moi?.mutation_a_presenter;
    expect(pending?.to_level).toBe(3);

    await rememberRelicMutation(firstLoad, pending!);
    const nextLoad = await attachPendingRelicMutation(communityAt(500));
    expect(nextLoad.moi?.mutation_a_presenter).toBeNull();
  });

  it('stores a quiet baseline when no mutation has been reached', async () => {
    await AsyncStorage.clear();
    const data = await attachPendingRelicMutation(communityAt(1));
    const raw = await AsyncStorage.getItem(relicPresentationStorageKey('user-1', 'kc'));

    expect(data.moi?.mutation_a_presenter).toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ level: 1 });
  });
});

function communityAt(members: number, archives: CommunityArchive[] = []): CommunityData {
  return {
    factions: [{
      equipe_id: 'kc',
      nom: 'Karmine Corp',
      tag: 'KC',
      jeu: 'lol',
      logo: null,
      membres: members,
      niveau_atteint: 1,
      croissance_24h: 0,
      croissance_7j: 0,
      moi: true,
      dernier_evenement_id: null,
      dernier_evenement_niveau: null,
      dernier_evenement_nom: null,
      dernier_evenement_le: null,
      dernier_evenement_recompense_volts: 0,
    }],
    moi: {
      user_id: 'user-1',
      pseudo: 'Player',
      equipe_id: 'kc',
      membre_depuis: '2026-08-20T10:00:00.000Z',
      pronos_depuis: 0,
      mutations_vecues: 0,
      pronos_7j: 0,
      gagnes_7j: 0,
      delta_frags_7j: 0,
      rang_activite: null,
      total_activite: null,
      top_activite: [],
      archives,
      mutation_a_presenter: null,
    },
  };
}
