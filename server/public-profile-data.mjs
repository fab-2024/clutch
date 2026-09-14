const TIMEOUT_MS = 5000;

function safePseudo(value) {
  const pseudo = String(value || '').trim();
  if (!pseudo || pseudo.length > 48) return null;
  return pseudo;
}

async function rpcProfile(pseudo) {
  const { base, key } = publicCredentials();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/rest/v1/rpc/clutch_profil_public_v1`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_pseudo: pseudo }),
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (!res.ok) throw new Error(`public_profile_${res.status}`);
    return body;
  } finally { clearTimeout(timer); }
}

export async function loadPublicProfile(rawPseudo) {
  const pseudo = safePseudo(rawPseudo);
  if (!pseudo) return null;
  return rpcProfile(pseudo);
}

export function profilePresentation(data) {
  if (!data?.pseudo) return null;
  const signature = signatureDepuisRecap(data.recap || {});
  const frags = Number(data.classement?.frags || 1000);
  const rang = Number(data.classement?.rang || 0) || null;
  const precision = Math.round(Number(data.recap?.precision_pct || 0));
  const serie = Number(data.serie_actuelle || 0);
  const faction = data.equipe_favorite?.tag || data.equipe_favorite?.nom || null;
  const short = signatureCourte(data);
  return {
    kind: 'profile',
    pseudo: String(data.pseudo),
    style: signature.nom,
    styleKey: signature.cle,
    styleSymbol: signature.symbole,
    styleText: signature.texte,
    short,
    frags,
    rang,
    precision,
    serie,
    faction,
    factionName: data.equipe_favorite?.nom || null,
    title: `${data.pseudo} · ${signature.nom} | GRIFF`,
    description: `${signature.nom} · ${frags.toLocaleString('fr-FR')} Frags${rang ? ` · #${rang}` : ''}${precision ? ` · ${precision} %` : ''}. Découvre son profil GRIFF.`,
    spaPath: `/#/u/${encodeURIComponent(String(data.pseudo))}`,
  };
}

function publicCredentials() {
  const base = String(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('public_profile_unconfigured');
  return { base, key };
}

function signatureDepuisRecap(recap = {}) {
  const pronostics = number(recap.paris);
  const gagnes = number(recap.gagnes);
  const precision = Number.isFinite(Number(recap.precision_pct))
    ? Number(recap.precision_pct)
    : pronostics > 0 ? (gagnes / pronostics) * 100 : 0;
  const outsiders = number(recap.outsiders_250_gagnes);
  const probaMin = Number(recap.proba_min_gagnee);
  const serie = number(recap.plus_longue_serie);

  if (pronostics >= 15 && precision >= 80) {
    return { cle: 'oracle', nom: 'Oracle', symbole: '◉', texte: 'Il lit les favoris avant que le score ne parle.' };
  }
  if (outsiders >= 3) {
    return { cle: 'upset', nom: 'Upset Hunter', symbole: '↯', texte: 'Il cherche la faille plutôt que le favori.' };
  }
  if (serie >= 5) {
    return { cle: 'streaker', nom: 'Streaker', symbole: '🔥', texte: 'Quand la série démarre, elle devient difficile à casser.' };
  }
  if (pronostics >= 10 && precision >= 70) {
    return { cle: 'safe', nom: 'Safe Hands', symbole: '◇', texte: 'Il privilégie les choix qui tiennent sous pression.' };
  }
  if (gagnes > 0 && Number.isFinite(probaMin) && probaMin > 0 && probaMin <= 0.4) {
    return { cle: 'contrarian', nom: 'Contrarian', symbole: '↺', texte: 'Il sait prendre le côté que le modèle laisse derrière.' };
  }
  return { cle: 'forming', nom: 'Signature en formation', symbole: '◌', texte: 'Son style apparaîtra à mesure que les verdicts s’accumulent.' };
}

function signatureCourte(profile = {}) {
  const main = signatureDepuisRecap(profile.recap || {});
  const game = profile.meilleur_jeu?.jeu ? gameLabel(profile.meilleur_jeu.jeu) : null;
  const conviction = profile.conviction_preferee?.conviction
    ? convictionLabel(profile.conviction_preferee.conviction)
    : null;
  return [main.nom, game, conviction].filter(Boolean).join(' · ');
}

function gameLabel(game) {
  if (game === 'rocket_league') return 'RL';
  if (game === 'lol') return 'LoL';
  if (game === 'valorant') return 'VAL';
  return String(game || 'Esport').toUpperCase();
}

function convictionLabel(value) {
  if (value === 'fort') return 'FORT';
  if (value === 'faible') return 'FAIBLE';
  return 'NORMAL';
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
