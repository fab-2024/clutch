import { SUPABASE_URL, SUPABASE_ANON_KEY, MODE_DEMO } from './config.js';

const BASE = SUPABASE_URL.trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, '')
  .replace(/\/auth\/v1$/, '');

const CLE_SESSION = 'clutch.session';
const CLE_DEMO = 'clutch.profile.showcase.';

function uniques(liste, limite) {
  return [...new Set((liste || []).filter(Boolean).map(String))].slice(0, limite);
}

export function preferencesProfil(utilisateur) {
  if (!utilisateur) return { vedette: null, banniere: [], arsenal: [] };

  if (MODE_DEMO) {
    try {
      const local = JSON.parse(localStorage.getItem(`${CLE_DEMO}${utilisateur.id}`) || 'null');
      if (local) return local;
    } catch {
      /* rien : on revient aux champs du profil */
    }
  }

  return {
    vedette: utilisateur.badge_vedette || null,
    banniere: uniques(utilisateur.badges_exposes, 3),
    arsenal: uniques(utilisateur.arsenal_exposes, 5),
  };
}

export async function sauverPreferencesProfil(utilisateur, { vedette = null, banniere = [], arsenal = [] }) {
  if (!utilisateur?.id) throw new Error('Profil introuvable.');

  const propre = {
    vedette: vedette || null,
    banniere: uniques(banniere, 3),
    arsenal: uniques(arsenal, 5),
  };

  if (MODE_DEMO) {
    localStorage.setItem(`${CLE_DEMO}${utilisateur.id}`, JSON.stringify(propre));
    return {
      badge_vedette: propre.vedette,
      badges_exposes: propre.banniere,
      arsenal_exposes: propre.arsenal,
    };
  }

  let session;
  try {
    session = JSON.parse(localStorage.getItem(CLE_SESSION) || 'null');
  } catch {
    session = null;
  }
  if (!session?.access_token) throw new Error('Ta session a expiré. Recharge la page puis réessaie.');

  const reponse = await fetch(
    `${BASE}/rest/v1/profils?id=eq.${encodeURIComponent(utilisateur.id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        badge_vedette: propre.vedette,
        badges_exposes: propre.banniere,
        arsenal_exposes: propre.arsenal,
      }),
    }
  );

  const texte = await reponse.text();
  let donnees = null;
  try { donnees = texte ? JSON.parse(texte) : null; } catch { donnees = null; }

  if (!reponse.ok) {
    const detail = donnees?.message || donnees?.hint || `Erreur ${reponse.status}`;
    throw new Error(`Impossible d'enregistrer ton profil : ${detail}`);
  }

  return donnees?.[0] ?? {
    badge_vedette: propre.vedette,
    badges_exposes: propre.banniere,
    arsenal_exposes: propre.arsenal,
  };
}
