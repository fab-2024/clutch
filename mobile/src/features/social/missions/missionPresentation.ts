import type { FriendQuest } from './types';

export type MissionMeta = {
  eyebrow: string;
  title: string;
};

const META: Record<string, MissionMeta> = {
  duo_calls: { eyebrow: 'MISSION DUO', title: 'DOUBLE CALL' },
  same_side: { eyebrow: 'MÊME CAMP', title: 'MÊME CALL' },
  opposition: { eyebrow: 'OPPOSITION', title: 'CAMPS OPPOSÉS' },
  duel: { eyebrow: 'FACE-À-FACE', title: 'RÈGLE ÇA EN DUEL' },
  revenge: { eyebrow: 'REVANCHE', title: 'REPRENDS LA MAIN' },
  league_push: { eyebrow: 'LIGUE', title: 'POUSSEZ ENSEMBLE' },
};

export function missionMeta(quest: FriendQuest): MissionMeta {
  return META[quest.type] ?? META.duo_calls;
}

export function missionDescription(quest: FriendQuest) {
  const partner = quest.partenaire?.pseudo || 'ton pote';
  if (quest.type === 'duo_calls') {
    return `Toi et ${partner} devez poser ${quest.objectif} calls. Chacun doit participer.`;
  }
  if (quest.type === 'same_side') {
    return `Choisissez le même camp sur ${missionMatchLabel(quest)}, sans révéler le choix de l’autre.`;
  }
  if (quest.type === 'opposition') {
    return `Finissez sur des camps opposés sur ${missionMatchLabel(quest)}.`;
  }
  if (quest.type === 'duel') return `Termine un duel avec ${partner} avant expiration.`;
  if (quest.type === 'revenge') return `Bats ${partner} dans votre prochain duel.`;
  if (quest.type === 'league_push') {
    const league = quest.ligue?.nom ? ` dans ${quest.ligue.nom}` : '';
    return `Cumulez ${quest.objectif} Frags réellement gagnés à deux${league}.`;
  }
  return 'Une mission sociale GRIFF à accomplir à deux.';
}

export function missionProgress(quest: FriendQuest) {
  const objective = Math.max(1, Number(quest.objectif || 1));
  const current = Math.min(objective, Math.max(0, Number(quest.progression || 0)));
  return {
    current,
    objective,
    percentage: Math.min(100, Math.round((current / objective) * 100)),
  };
}

export function missionRewardLabel(quest: FriendQuest) {
  const rewards: string[] = [];
  if (quest.recompense_xp > 0) rewards.push(`+${quest.recompense_xp} XP`);
  if (quest.recompense_volts > 0) rewards.push(`+${quest.recompense_volts} Volts`);
  return rewards.join(' · ') || 'XP social';
}

export function missionStatusLabel(status: string) {
  if (status === 'terminee') return 'TERMINÉE';
  if (status === 'expiree') return 'EXPIRÉE';
  if (status === 'annulee') return 'ANNULÉE';
  if (status === 'ratee') return 'RATÉE';
  return status.replaceAll('_', ' ').toUpperCase();
}

export function missionTimeLeft(value: string | null, now = Date.now()) {
  if (!value) return 'Sans limite';
  const expiresAt = new Date(value).getTime();
  if (!Number.isFinite(expiresAt)) return 'Échéance inconnue';
  const minutes = Math.max(0, Math.ceil((expiresAt - now) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

export function missionInitials(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || '?').slice(0, 2).toUpperCase();
}

function missionMatchLabel(quest: FriendQuest) {
  const match = quest.match;
  if (!match) return 'ce match';
  const teamA = match.tag_a || match.equipe_a || 'A';
  const teamB = match.tag_b || match.equipe_b || 'B';
  return `${teamA} vs ${teamB}`;
}
