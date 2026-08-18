import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRIEND_QUEST_TYPES,
  questMeta,
  questHref,
  questReward,
  questTimeLeft,
} from '../web/js/friend-quests-model.js';

const base = {
  objectif: 3,
  progression: 2,
  recompense_xp: 100,
  recompense_volts: 25,
  partenaire: { pseudo: 'Theo' },
};

test('Phase 13 exposes exactly six social quest families', () => {
  assert.deepEqual(Object.keys(FRIEND_QUEST_TYPES).sort(), [
    'duel','duo_calls','league_push','opposition','revenge','same_side',
  ]);
});

test('progress is clamped and converted to a percent', () => {
  assert.equal(questMeta({ ...base, type:'duo_calls' }).percent, 67);
  assert.equal(questMeta({ ...base, type:'duo_calls', progression:99 }).percent, 100);
});

test('match quests route directly to the match', () => {
  assert.equal(questHref({ type:'opposition', match:{ id:'m-17' } }), '#/matchs/m-17');
  assert.equal(questHref({ type:'same_side', match:{ id:'m a/b' } }), '#/matchs/m%20a%2Fb');
});

test('league push routes to the shared league', () => {
  assert.equal(questHref({ type:'league_push', ligue:{ id:'abc-123' } }), '#/ligues/abc-123');
});

test('quest rewards use XP and Volts, never Frags', () => {
  const reward = questReward(base);
  assert.match(reward, /100 XP/);
  assert.match(reward, /25 .*Volts/);
  assert.doesNotMatch(reward, /Frag/i);
});

test('time-left formatter stays compact', () => {
  const now = Date.UTC(2026,7,18,10,0,0);
  assert.equal(questTimeLeft(new Date(now + 42*60000).toISOString(), now), '42 min');
  assert.equal(questTimeLeft(new Date(now + (8*60+21)*60000).toISOString(), now), '8 h 21');
});

test('all quest copy remains explicitly social', () => {
  for (const [type, config] of Object.entries(FRIEND_QUEST_TYPES)) {
    const description = config.description({ ...base, type, match:{ tag_a:'VIT',tag_b:'G2' }, ligue:{ nom:'Les Déglingos' } });
    assert.ok(description.length > 10, `${type} needs meaningful copy`);
    assert.ok(config.cta.length > 3, `${type} needs a concrete CTA`);
  }
});
