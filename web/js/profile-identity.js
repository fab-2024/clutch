const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

export function signatureDepuisRecap(recap = {}) {
  const pronostics = n(recap.paris);
  const gagnes = n(recap.gagnes);
  const precision = Number.isFinite(Number(recap.precision_pct))
    ? Number(recap.precision_pct)
    : pronostics > 0 ? (gagnes / pronostics) * 100 : 0;
  const outsiders = n(recap.outsiders_250_gagnes);
  const probaMin = Number(recap.proba_min_gagnee);
  const serie = n(recap.plus_longue_serie);

  if (pronostics >= 15 && precision >= 80) {
    return { cle: 'oracle', nom: 'Oracle', symbole: '◉', texte: 'Il lit les favoris avant que le score ne parle.', detail: `${Math.round(precision)} % sur ${pronostics} verdicts` };
  }
  if (outsiders >= 3) {
    return { cle: 'upset', nom: 'Upset Hunter', symbole: '↯', texte: 'Il cherche la faille plutôt que le favori.', detail: `${outsiders} outsiders transformés` };
  }
  if (serie >= 5) {
    return { cle: 'streaker', nom: 'Streaker', symbole: '🔥', texte: 'Quand la série démarre, elle devient difficile à casser.', detail: `${serie} réussites consécutives` };
  }
  if (pronostics >= 10 && precision >= 70) {
    return { cle: 'safe', nom: 'Safe Hands', symbole: '◇', texte: 'Il privilégie les choix qui tiennent sous pression.', detail: `${Math.round(precision)} % de précision` };
  }
  if (gagnes > 0 && Number.isFinite(probaMin) && probaMin > 0 && probaMin <= .4) {
    return { cle: 'contrarian', nom: 'Contrarian', symbole: '↺', texte: 'Il sait prendre le côté que le modèle laisse derrière.', detail: `Victoire à ${Math.round(probaMin * 100)} % modèle` };
  }
  return { cle: 'forming', nom: 'Signature en formation', symbole: '◌', texte: 'Son style apparaîtra à mesure que les verdicts s’accumulent.', detail: `${pronostics} pronostic${pronostics > 1 ? 's' : ''} réglé${pronostics > 1 ? 's' : ''}` };
}

export function libelleJeu(jeu) {
  if (jeu === 'rocket_league') return 'RL';
  if (jeu === 'lol') return 'LoL';
  if (jeu === 'valorant') return 'VAL';
  return String(jeu || 'Esport').toUpperCase();
}

export function libelleConviction(value) {
  if (value === 'fort') return 'FORT';
  if (value === 'faible') return 'FAIBLE';
  return 'NORMAL';
}

export function traitsDepuisProfil(profil = {}) {
  const recap = profil.recap || {};
  const traits = [];
  const push = (trait) => {
    if (!trait || traits.some((x) => x.cle === trait.cle) || traits.length >= 3) return;
    traits.push(trait);
  };

  const jeu = profil.meilleur_jeu;
  if (jeu?.jeu && n(jeu.pronostics) >= 5) {
    push({ cle: `jeu-${jeu.jeu}`, nom: `${libelleJeu(jeu.jeu)} Specialist`, detail: `${Math.round(n(jeu.precision_pct))} % · ${n(jeu.pronostics)} calls`, symbole: '⌁' });
  }

  const conviction = profil.conviction_preferee;
  if (conviction?.conviction === 'fort' && n(conviction.pronostics) >= 3) {
    push({ cle: 'strong-conviction', nom: 'Strong Conviction', detail: `${n(conviction.pronostics)} calls Fort`, symbole: '⚡' });
  } else if (conviction?.conviction) {
    push({ cle: 'conviction', nom: `${libelleConviction(conviction.conviction)} Player`, detail: `${n(conviction.pronostics)} calls`, symbole: '◆' });
  }

  if (n(recap.outsiders_250_gagnes) >= 2) {
    push({ cle: 'upsets', nom: 'Upset Reader', detail: `${n(recap.outsiders_250_gagnes)} outsiders trouvés`, symbole: '↯' });
  }

  if (n(profil.serie_actuelle) >= 3) {
    push({ cle: 'streak', nom: 'Streak Player', detail: `Série actuelle ×${n(profil.serie_actuelle)}`, symbole: '🔥' });
  }

  const precision = n(recap.precision_pct);
  if (traits.length < 3 && n(recap.paris) >= 10 && precision >= 70) {
    push({ cle: 'precision', nom: 'Clean Calls', detail: `${Math.round(precision)} % de précision`, symbole: '◎' });
  }

  if (!traits.length) {
    push({ cle: 'forming', nom: 'Build en formation', detail: 'Joue pour révéler tes traits', symbole: '◌' });
  }
  return traits;
}

export function signatureCourte(profil = {}) {
  const main = signatureDepuisRecap(profil.recap || {});
  const jeu = profil.meilleur_jeu?.jeu ? libelleJeu(profil.meilleur_jeu.jeu) : null;
  const conviction = profil.conviction_preferee?.conviction ? libelleConviction(profil.conviction_preferee.conviction) : null;
  return [main.nom, jeu, conviction].filter(Boolean).join(' · ');
}

export function classePrestige(niveau) {
  const nvl = n(niveau);
  if (nvl >= 50) return 'clutch';
  if (nvl >= 35) return 'master';
  if (nvl >= 20) return 'elite';
  if (nvl >= 10) return 'challenger';
  if (nvl >= 5) return 'initie';
  return 'recrue';
}
