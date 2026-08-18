export const FRIEND_QUEST_TYPES = {
  duo_calls: {
    icon: '⚡', eyebrow: 'MISSION DUO', title: 'DOUBLE CALL',
    description: (q) => `Toi + ${q.partenaire?.pseudo || 'ton pote'} devez poser 3 calls. Chacun doit participer.`,
    cta: 'Faire mon call',
  },
  same_side: {
    icon: '🤝', eyebrow: 'SAME CALL', title: 'MÊME CAMP',
    description: (q) => `Vous devez choisir le même camp sur ${matchLabel(q)}. Le choix de l’autre reste secret tant que tu n’as pas joué.`,
    cta: 'Prendre position',
  },
  opposition: {
    icon: '⚔', eyebrow: 'OPPOSITION', title: 'CAMPS OPPOSÉS',
    description: (q) => `Vous devez finir de part et d’autre sur ${matchLabel(q)}. Aucun choix n’est révélé avant ton call.`,
    cta: 'Prendre position',
  },
  duel: {
    icon: '🔥', eyebrow: 'FACE-À-FACE', title: 'RÈGLE ÇA EN DUEL',
    description: (q) => `Termine un duel avec ${q.partenaire?.pseudo || 'ton rival'} dans les 48 h.`,
    cta: 'Choisir un match',
  },
  revenge: {
    icon: '↺', eyebrow: 'REVANCHE', title: 'REPRENDS LA MAIN',
    description: (q) => `Bats ${q.partenaire?.pseudo || 'ton rival'} dans votre prochain duel.`,
    cta: 'Prendre ma revanche',
  },
  league_push: {
    icon: '↑', eyebrow: 'LEAGUE PUSH', title: 'POUSSEZ ENSEMBLE',
    description: (q) => `Cumulez ${q.objectif || 60} Frags gagnés à deux${q.ligue?.nom ? ` dans ${q.ligue.nom}` : ''}. La quête ne modifie jamais votre rating.`,
    cta: 'Faire un call',
  },
};

export function questMeta(q = {}) {
  const base = FRIEND_QUEST_TYPES[q.type] || FRIEND_QUEST_TYPES.duo_calls;
  return {
    ...base,
    title: base.title,
    description: base.description(q),
    href: questHref(q),
    progress: Math.max(0, Number(q.progression || 0)),
    target: Math.max(1, Number(q.objectif || 1)),
    percent: Math.min(100, Math.round((Number(q.progression || 0) / Math.max(1, Number(q.objectif || 1))) * 100)),
  };
}

export function questHref(q = {}) {
  if ((q.type === 'same_side' || q.type === 'opposition') && q.match?.id) return `#/matchs/${encodeURIComponent(q.match.id)}`;
  if (q.type === 'league_push' && q.ligue?.id) return `#/ligues/${encodeURIComponent(q.ligue.id)}`;
  return '#/matchs';
}

export function questTimeLeft(value, now = Date.now()) {
  const end = new Date(value).getTime();
  if (!Number.isFinite(end)) return '';
  const ms = Math.max(0, end - now);
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins ? `${hours} h ${mins.toString().padStart(2, '0')}` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j ${hours % 24} h`;
}

export function questReward(q = {}) {
  const parts = [];
  if (Number(q.recompense_xp || 0) > 0) parts.push(`+${Number(q.recompense_xp)} XP`);
  if (Number(q.recompense_volts || 0) > 0) parts.push(`+${Number(q.recompense_volts)} ⚡ Volts`);
  return parts.join(' · ') || 'Récompense sociale';
}

export function matchLabel(q = {}) {
  const m = q.match;
  if (!m) return 'ce match';
  return `${m.tag_a || m.equipe_a || 'A'} vs ${m.tag_b || m.equipe_b || 'B'}`;
}

export function questStatusLabel(q = {}) {
  if (q.statut === 'terminee') return 'TERMINÉE';
  if (q.statut === 'ratee') return 'MANQUÉE';
  if (q.statut === 'expiree') return 'EXPIRÉE';
  return 'ACTIVE';
}
