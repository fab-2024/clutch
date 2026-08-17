import {
  NOTE_INITIALE,
  NOTE_MIN_PARIS,
  XP_SAISON,
  XP_PALIER_NOTE,
  XP_CALL,
  XP_PAS_DE_NOTE,
} from './core.js';

/**
 * Clutch — catalogue fondateur des badges.
 *
 * 25 badges ont une condition publique et calculable depuis `recap_badges()`.
 * Les 5 badges secrets sont volontairement différents : leur condition ne vit
 * JAMAIS dans ce fichier public. Le navigateur reçoit seulement leur clé dans
 * `recap.secrets_obtenus` une fois que Supabase les a accordés.
 */

export const RARETES_BADGES_V2 = {
  mythique:   { ordre: 0, libelle: 'Mythique',   xp: 2000 },
  legendaire: { ordre: 1, libelle: 'Légendaire', xp: 1200 },
  epique:     { ordre: 2, libelle: 'Épique',     xp: 800 },
  rare:       { ordre: 3, libelle: 'Rare',       xp: 400 },
  commun:     { ordre: 4, libelle: 'Commun',     xp: 200 },
};

const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const oui = (v) => v === true || v === 'true' || v === 1 || v === '1';

export function precisionBadge(recap = {}) {
  if (Number.isFinite(Number(recap.precision_pct))) return Number(recap.precision_pct);
  const paris = n(recap.paris);
  return paris ? (n(recap.gagnes) / paris) * 100 : 0;
}

const PUBLICS = [
  {
    cle: 'selectionneur', nom: 'Sélectionneur', famille: 'Précision', rarete: 'commun',
    description: 'Tout commence par un choix.',
    condition: 'Faire ton premier pronostic.',
    test: (s) => n(s.paris) >= 1,
  },
  {
    cle: 'premier_frag', nom: 'Premier Frag', famille: 'Rentabilité', rarete: 'commun',
    description: 'Le premier résultat qui tombe du bon côté.',
    condition: 'Remporter ton premier pronostic.',
    test: (s) => n(s.gagnes) >= 1,
  },
  {
    cle: 'sous_les_couleurs', nom: 'Sous les couleurs', famille: 'Communauté', rarete: 'commun',
    description: 'Tu as choisi ton camp.',
    condition: 'Choisir ton équipe favorite.',
    test: (s) => oui(s.a_equipe_favorite),
  },
  {
    cle: 'premier_cercle', nom: 'Premier cercle', famille: 'Social', rarete: 'commun',
    description: 'Clutch devient meilleur quand il y a quelqu’un à battre.',
    condition: 'Rejoindre ta première ligue.',
    test: (s) => n(s.ligues_rejointes) >= 1 || n(s.plus_grande_ligue) >= 1,
  },
  {
    cle: 'serie_commence', nom: 'La série commence', famille: 'Régularité', rarete: 'commun',
    description: 'Trois jours, ce n’est déjà plus un hasard.',
    condition: 'Atteindre 3 jours consécutifs de connexion.',
    test: (s) => n(s.serie_prime_max) >= 3,
  },
  {
    cle: 'terrain_connu', nom: 'Terrain connu', famille: 'Connaissance', rarete: 'commun',
    description: 'Tu commences à connaître le terrain.',
    condition: 'Faire 5 pronostics sur le même jeu.',
    test: (s) => n(s.paris_jeu_max) >= 5,
  },
  {
    cle: 'petit_arsenal', nom: 'Petit Arsenal', famille: 'Collection', rarete: 'commun',
    description: 'Une collection commence rarement par une seule pièce.',
    condition: 'Obtenir 3 autres badges.',
    meta: true,
  },
  {
    cle: 'sans_trembler', nom: 'Sans trembler', famille: 'Précision', rarete: 'rare',
    description: 'Trois fois de suite, le choix était le bon.',
    condition: 'Réussir 3 pronostics consécutifs.',
    test: (s) => n(s.plus_longue_serie) >= 3,
  },
  {
    cle: 'sniper', nom: 'Sniper', famille: 'Précision', rarete: 'rare',
    description: 'Peu de déchets, beaucoup d’impact.',
    condition: 'Atteindre 70 % de précision sur au moins 10 pronostics réglés.',
    test: (s) => n(s.paris) >= 10 && precisionBadge(s) >= 70,
  },
  {
    cle: 'contre_courant', nom: 'Contre-courant', famille: 'Audace', rarete: 'rare',
    description: 'Tu as pris le chemin que le marché regardait moins.',
    condition: 'Remporter un pronostic à une cote de 2,50 ou plus.',
    test: (s) => n(s.cote_max_gagnee) >= 2.5,
  },
  {
    cle: 'deux_contre_tous', nom: 'Deux contre tous', famille: 'Audace', rarete: 'rare',
    description: 'Deux outsiders dans la même semaine. Pas un accident.',
    condition: 'Réussir 2 outsiders à cote ≥ 2,20 dans une même semaine.',
    test: (s) => n(s.outsiders_220_meme_semaine_max) >= 2,
  },
  {
    cle: 'specialiste', nom: 'Spécialiste', famille: 'Connaissance', rarete: 'rare',
    description: 'À force de regarder un jeu, on finit par voir ce que les autres ratent.',
    condition: 'Faire 15 pronostics sur le même jeu.',
    test: (s) => n(s.paris_jeu_max) >= 15,
  },
  {
    cle: 'inarretable', nom: 'Inarrêtable', famille: 'Régularité', rarete: 'rare',
    description: 'Une semaine complète sans casser la chaîne.',
    condition: 'Atteindre une série de connexion de 7 jours.',
    test: (s) => n(s.serie_prime_max) >= 7,
  },
  {
    cle: 'rival', nom: 'Rival', famille: 'Social', rarete: 'rare',
    description: 'Cette fois, c’est ton pseudo qui est au-dessus.',
    condition: 'Terminer devant un ami dans une ligue sur une saison terminée.',
    test: (s) => oui(s.a_devance_ami),
  },
  {
    cle: 'top_10', nom: 'Top 10', famille: 'Social', rarete: 'rare',
    description: 'La première page du classement.',
    condition: 'Finir dans le top 10 d’une ligue d’au moins 20 joueurs.',
    test: (s) => oui(s.top10_ligue_20),
  },
  {
    cle: 'porte_etendard', nom: 'Porte-étendard', famille: 'Communauté', rarete: 'rare',
    description: 'Ton équipe n’est plus seulement un choix de profil.',
    condition: 'Faire partie d’une communauté ayant atteint au moins 10 membres.',
    test: (s) => n(s.communaute_membres) >= 10,
  },
  {
    cle: 'chirurgien', nom: 'Chirurgien', famille: 'Précision', rarete: 'epique',
    description: 'Le score exact, trois fois.',
    condition: 'Réussir 3 scores exacts.',
    test: (s) => n(s.scores_exacts) >= 3,
  },
  {
    cle: 'oracle', nom: 'Oracle', famille: 'Précision', rarete: 'epique',
    description: 'À ce niveau, ce n’est plus juste une bonne série.',
    condition: 'Atteindre 80 % de précision sur au moins 15 pronostics réglés.',
    test: (s) => n(s.paris) >= 15 && precisionBadge(s) >= 80,
  },
  {
    cle: 'roi_upset', nom: 'Roi de l’Upset', famille: 'Audace', rarete: 'epique',
    description: 'Tu ne cherches pas le favori. Tu cherches la faille.',
    condition: 'Réussir 3 outsiders à cote ≥ 2,50.',
    test: (s) => n(s.outsiders_250_gagnes) >= 3,
  },
  {
    cle: 'expert_terrain', nom: 'Expert du terrain', famille: 'Connaissance', rarete: 'epique',
    description: 'Une spécialité qui tient sur la durée.',
    condition: 'Atteindre 75 % de précision sur 30 pronostics d’un même jeu.',
    test: (s) => n(s.meilleure_precision_jeu_30) >= 75,
  },
  {
    cle: 'pilier', nom: 'Pilier', famille: 'Régularité', rarete: 'epique',
    description: 'Quatre semaines. Toujours là.',
    condition: 'Pronostiquer au moins une fois par semaine pendant 4 semaines consécutives.',
    test: (s) => n(s.plus_longue_serie_semaines) >= 4,
  },
  {
    cle: 'podium', nom: 'Podium', famille: 'Social', rarete: 'epique',
    description: 'Il ne reste que deux pseudos au-dessus — ou aucun.',
    condition: 'Finir dans le top 3 d’une ligue d’au moins 10 joueurs.',
    test: (s) => oui(s.podium_ligue_10),
  },
  {
    cle: 'semaine_parfaite', nom: 'Semaine parfaite', famille: 'Précision', rarete: 'legendaire',
    description: 'Une semaine sans une seule erreur.',
    condition: 'Réussir tous tes pronostics d’une semaine, avec au moins 5 résultats réglés.',
    test: (s) => oui(s.semaine_parfaite),
  },
  {
    cle: 'roi_ligue', nom: 'Roi de ligue', famille: 'Social', rarete: 'legendaire',
    description: 'Une ligue entière derrière toi.',
    condition: 'Terminer n°1 d’une ligue d’au moins 10 joueurs.',
    test: (s) => oui(s.roi_ligue_10),
  },
  {
    cle: 'surcharge', nom: 'Surcharge', famille: 'Communauté', rarete: 'legendaire',
    description: 'Ta communauté a changé d’échelle.',
    condition: 'Faire partie d’une communauté ayant atteint un palier majeur de 500 membres.',
    test: (s) => n(s.communaute_membres) >= 500,
  },
];

/**
 * Le nom et le texte de révélation peuvent être publics ; seule la CONDITION
 * reste privée. Une personne qui inspecte le bundle sait que le badge existe,
 * mais pas comment l’obtenir.
 */
export const SECRETS = [
  {
    cle: 'sixieme_sens', nom: 'Le Sixième Sens', famille: 'Audace', rarete: 'legendaire', secret: true,
    description: 'Tu as vu ce que les autres ne voyaient pas.',
  },
  {
    cle: 'main_froide', nom: 'Main Froide', famille: 'Précision', rarete: 'legendaire', secret: true,
    description: 'Quand le chrono descend, ton pouls ne monte pas.',
  },
  {
    cle: 'david', nom: 'David', famille: 'Audace', rarete: 'legendaire', secret: true,
    description: 'Les probabilités n’avaient pas prévu ça.',
  },
  {
    cle: 'contre_le_monde', nom: 'Contre le monde', famille: 'Audace', rarete: 'legendaire', secret: true,
    description: 'Presque tout Clutch était de l’autre côté.',
  },
  {
    cle: 'clutch_secret', nom: 'CLUTCH.', famille: 'Prestige', rarete: 'legendaire', secret: true,
    description: 'Au bon endroit. Au bon moment.',
  },
];

export const BADGES_V2 = [...PUBLICS, ...SECRETS];
export const NB_BADGES_PUBLICS = PUBLICS.length;
export const FAMILLES_BADGES_V2 = [...new Set(PUBLICS.map((b) => b.famille))];

export function rareteBadgeV2(badgeOuCle) {
  const badge = typeof badgeOuCle === 'string'
    ? BADGES_V2.find((b) => b.cle === badgeOuCle)
    : badgeOuCle;
  return badge?.rarete ?? 'commun';
}

export function ordreRareteV2(badgeOuCle) {
  return RARETES_BADGES_V2[rareteBadgeV2(badgeOuCle)]?.ordre ?? 99;
}

export function libelleRareteV2(badgeOuCle) {
  return RARETES_BADGES_V2[rareteBadgeV2(badgeOuCle)]?.libelle ?? 'Commun';
}

export function xpDuBadgeV2(badgeOuCle) {
  return RARETES_BADGES_V2[rareteBadgeV2(badgeOuCle)]?.xp ?? RARETES_BADGES_V2.commun.xp;
}

export function evaluerBadgesV2(recap = {}) {
  const r = recap ?? {};
  const fondateur = oui(r.est_fondateur);
  const publics = PUBLICS.map((b) => {
    let obtenu = false;
    if (!b.meta) {
      try { obtenu = Boolean(b.test?.(r)); } catch { obtenu = false; }
    }
    return { ...b, secret: false, obtenu: fondateur || obtenu };
  });

  // Petit Arsenal dépend des autres badges : il est évalué en seconde passe,
  // sans jamais se compter lui-même. Un compte Fondateur dispose de toute la
  // collection pour tester et construire son identité sans fausser ses stats.
  const autresObtenus = publics.filter((b) => b.cle !== 'petit_arsenal' && b.obtenu).length;
  const petit = publics.find((b) => b.cle === 'petit_arsenal');
  if (petit) petit.obtenu = fondateur || autresObtenus >= 3;

  const secretsObtenus = new Set(Array.isArray(r.secrets_obtenus) ? r.secrets_obtenus : []);
  const secrets = SECRETS.map((b) => ({ ...b, obtenu: fondateur || secretsObtenus.has(b.cle) }));
  return [...publics, ...secrets];
}

export function nomBadgeAffiche(badge) {
  return badge?.secret && !badge?.obtenu ? '???' : badge?.nom ?? 'Badge';
}

export function descriptionBadgeAffiche(badge) {
  if (badge?.secret && !badge?.obtenu) return 'Condition inconnue. Archives classifiées.';
  return badge?.description ?? '';
}

export function conditionBadgeAffiche(badge) {
  if (badge?.secret) return badge?.obtenu ? 'Condition de déblocage classifiée.' : '???';
  return badge?.condition ?? '';
}

export function xpDetailleeV2({ badges = [], recap = {}, note = null, note_paris = 0 } = {}) {
  const parBadges = badges
    .filter((b) => b.obtenu)
    .reduce((total, b) => total + xpDuBadgeV2(b), 0);

  const parSaisons = n(recap.saisons_jouees) * XP_SAISON;
  const parCalls = n(recap.calls_gagnes) * XP_CALL;
  const paliersNote =
    note != null && n(note_paris) >= NOTE_MIN_PARIS
      ? Math.max(0, Math.floor((n(note) - NOTE_INITIALE) / XP_PAS_DE_NOTE))
      : 0;
  const parNote = paliersNote * XP_PALIER_NOTE;

  return {
    total: parBadges + parSaisons + parCalls + parNote,
    sources: [
      { cle: 'badges', libelle: 'Badges décrochés', xp: parBadges, detail: `${badges.filter((b) => b.obtenu).length} badge(s)` },
      { cle: 'saisons', libelle: 'Saisons terminées', xp: parSaisons, detail: `${n(recap.saisons_jouees)} saison(s)` },
      { cle: 'note', libelle: 'Paliers de note', xp: parNote, detail: `${paliersNote} palier(s)` },
      { cle: 'calls', libelle: 'Calls réussis', xp: parCalls, detail: `${n(recap.calls_gagnes)} call(s)` },
    ].filter((source) => source.xp > 0),
  };
}

/** Icône centrale de la médaille. Les formes sont stables et indépendantes des données joueur. */
export function iconeFamilleBadge(famille, taille = 24) {
  const formes = {
    Audace: 'M12 2.7 4.5 13h5.1l-1.2 8.3 8.3-10.7h-5.2z',
    Précision: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 4.7a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6zm0 2.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z',
    Rentabilité: 'M4.5 17.5 9.2 12l3.4 3 6.9-8.1M15.8 6.9h3.7v3.8',
    Régularité: 'M5 6.5h14M7 3.5v6M17 3.5v6M5 9h14v11H5zM8 13h2M12 13h2M16 13h1M8 16h2M12 16h2',
    Connaissance: 'M12 3 3.2 8.5 12 14l8.8-5.5L12 3zm-6.5 9.4L12 17l6.5-4.6M7 15.6 12 19l5-3.4',
    Communauté: 'M12 3.5 20 7v5.5c0 4.6-3.2 7.2-8 8.9-4.8-1.7-8-4.3-8-8.9V7l8-3.5zm0 4.2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm-4.2 8.7c1.1-1.4 2.5-2.1 4.2-2.1s3.1.7 4.2 2.1',
    Social: 'M8.5 12a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm7 0a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM2.8 20a5.8 5.8 0 0 1 11.4 0M13.2 20a5.8 5.8 0 0 1 8-5.4',
    Collection: 'M5 7.5 12 4l7 3.5-7 3.5-7-3.5zm0 4.5 7 3.5 7-3.5M5 16.5 12 20l7-3.5',
    Prestige: 'M12 3.2 14.2 8l5.2.6-3.8 3.6 1 5.1-4.6-2.5-4.6 2.5 1-5.1-3.8-3.6L9.8 8 12 3.2z',
  };
  const d = formes[famille] ?? formes.Prestige;
  const plein = ['Audace', 'Connaissance', 'Prestige'].includes(famille);
  return `<svg viewBox="0 0 24 24" width="${taille}" height="${taille}" aria-hidden="true"><path d="${d}" fill="${plein ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}