import { rendreProfilPublic } from './views/profil-public.js';

const CONTROL_ID = 'phase12-profile-sim-control';
const ROUTE = '#/profile-simulation';

function disponible() {
  const h = location.hostname;
  return h.includes('agent-phase12-public-profiles') || h === 'localhost' || h === '127.0.0.1';
}

function mock() {
  return {
    pseudo: 'FabTheTap',
    cree_le: '2026-06-12T12:00:00Z',
    titre_profil: 'Visionnaire',
    est_fondateur: true,
    profil_public: true,
    badge_vedette: 'oracle',
    badges_exposes: ['oracle','roi_upset','chirurgien'],
    arsenal_exposes: ['oracle','roi_upset','chirurgien','specialiste','rival'],
    classement: {
      saison_id: 'saison-ete-2026',
      saison_nom: 'Saison 1 — Été 2026',
      frags: 1284,
      rang: 428,
      pronostics_regles: 142,
      pronostics_gagnes: 118,
      pic_frags: 1312,
    },
    recap: {
      paris: 142,
      gagnes: 118,
      precision_pct: 83.1,
      plus_longue_serie: 11,
      jours_actifs: 44,
      serie_jours_actifs_max: 14,
      saisons_jouees: 2,
      jeux_joues: 3,
      paris_jeu_max: 68,
      proba_min_gagnee: .21,
      outsiders_220_meme_semaine_max: 4,
      outsiders_250_gagnes: 9,
      meilleure_precision_jeu_30: 84,
      plus_longue_serie_semaines: 9,
      semaine_parfaite: true,
      calls_gagnes: 5,
      ligues_creees: 1,
      ligues_rejointes: 2,
      plus_grande_ligue: 17,
      a_equipe_favorite: true,
      est_fondateur: true,
      top10_ligue_20: false,
      podium_ligue_10: true,
      roi_ligue_10: false,
      a_devance_ami: true,
      communaute_membres: 472,
      rating_frags_max: 1312,
      secrets_obtenus: ['sixieme_sens','david'],
    },
    serie_actuelle: 5,
    meilleur_jeu: { jeu:'rocket_league', pronostics:68, gagnes:57, precision_pct:83.8 },
    conviction_preferee: { conviction:'fort', pronostics:76 },
    equipe_favorite: { id:'val-kc', nom:'Karmine Corp', tag:'KC', jeu:'valorant', logo:null, supporters:472, relique:'Calice', relique_niveau:4 },
    forme_recente: [
      { id:'1',match_id:'m-sim-1',statut:'gagne',choix:'a',conviction:'fort',delta_frags:48,jeu:'rocket_league',evenement:'RLCS Major',equipe_a:'Team Vitality',equipe_b:'Karmine Corp',tag_a:'VIT',tag_b:'KC',score_a:3,score_b:2 },
      { id:'2',match_id:'m-sim-2',statut:'gagne',choix:'b',conviction:'fort',delta_frags:41,jeu:'valorant',evenement:'VCT EMEA',equipe_a:'FNATIC',equipe_b:'Karmine Corp',tag_a:'FNC',tag_b:'KC',score_a:0,score_b:2 },
      { id:'3',match_id:'m-sim-3',statut:'perdu',choix:'a',conviction:'normal',delta_frags:-26,jeu:'lol',evenement:'LEC',equipe_a:'G2 Esports',equipe_b:'Karmine Corp',tag_a:'G2',tag_b:'KC',score_a:0,score_b:1 },
      { id:'4',match_id:'m-sim-4',statut:'gagne',choix:'b',conviction:'fort',delta_frags:56,jeu:'rocket_league',evenement:'RLCS Open',equipe_a:'Team BDS',equipe_b:'Team Vitality',tag_a:'BDS',tag_b:'VIT',score_a:2,score_b:3 },
      { id:'5',match_id:'m-sim-5',statut:'gagne',choix:'a',conviction:'normal',delta_frags:32,jeu:'valorant',evenement:'VCT EMEA',equipe_a:'Karmine Corp',equipe_b:'Team Heretics',tag_a:'KC',tag_b:'TH',score_a:2,score_b:0 },
    ],
    viewer: {
      est_moi: false,
      ligue_commune: { id:'sim-ligue', nom:'Les Déglingos', code:'SIM123', membres:17 },
      rivalite: { target_wins:3, viewer_wins:2, total:5, dernier:null },
    },
  };
}

function rendre() {
  if (!disponible() || location.hash !== ROUTE) return;
  const root = document.getElementById('contenu');
  if (!root) return;
  document.body.dataset.screen = 'social';
  rendreProfilPublic(root, mock(), { simulation:true });
}

function ajouterControle() {
  if (!disponible() || document.getElementById(CONTROL_ID)) return;
  const aside = document.createElement('aside');
  aside.id = CONTROL_ID;
  aside.className = 'phase12-sim-control';
  aside.innerHTML = '<button type="button" data-phase12-sim-open><span>◈</span><strong>Simuler un profil</strong></button>';
  document.body.append(aside);
}

if (disponible()) {
  ajouterControle();
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-phase12-sim-open]')) {
      location.hash = ROUTE;
      setTimeout(rendre, 0);
    }
  });
  window.addEventListener('hashchange', () => setTimeout(rendre, 0));
  new MutationObserver(() => {
    ajouterControle();
    if (location.hash === ROUTE && !document.querySelector('.phase12-profile--simulation')) rendre();
  }).observe(document.body, { childList:true, subtree:true });
  setTimeout(rendre, 0);
}
