import {
  isPlayerAvatarId,
  PLAYER_AVATARS,
  playerAvatarById,
} from '../catalog';

describe('player avatar catalog', () => {
  it('offers the fifteen original avatars from the active sheet', () => {
    expect(PLAYER_AVATARS).toHaveLength(15);
    expect(new Set(PLAYER_AVATARS.map((avatar) => avatar.id)).size).toBe(15);
    expect(PLAYER_AVATARS.map((avatar) => avatar.label)).toContain('Drone pulsar');
  });

  it('replaces a previously saved legacy selection without exposing it again', () => {
    expect(playerAvatarById('muscle-violet')?.id).toBe('flame-duelist');
    expect(PLAYER_AVATARS.find((avatar) => String(avatar.id) === 'muscle-violet')).toBeUndefined();
    expect(isPlayerAvatarId('muscle-violet')).toBe(true);
  });

  it('rejects unknown avatar ids', () => {
    expect(playerAvatarById('unknown-avatar')).toBeNull();
    expect(isPlayerAvatarId('unknown-avatar')).toBe(false);
    expect(isPlayerAvatarId('toString')).toBe(false);
  });
});
