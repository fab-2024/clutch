/** Match Arena — Economy V2 native, sans bankroll. */
import * as api from '../api.js';
import * as economie from '../economy-api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, quand, nomJeu, vide, surClic, ecusson, toast } from '../ui.js';

const FILTRES = [
  { cle: '', libelle: 'Tous' },
  { cle: 'lol', libelle: 'LoL' },
  { cle: 'valorant', libelle: 'VALORANT' },
  { cle: 'cs2', libelle: 'CS2' },
];

let jeuActif = '';
let statutActif = 'a_venir';
let favoriSeul = false;

export async function vueMatchs(racine) {
  const favorite = contexte.utilisateur?.equipe_favorite ?? null;
  if (!favorite) favoriSeul = false;

  let pronostics = contexte.utilisateur ? await economie.mesPronosticsClasses().catch(() => []) : [];
  let heroActuel = null;

  racine.innerHTML = `
    <section class="matchs-v2">
      ${bandeauSaison()}
      <header class="matchs-v2__entete">
        <div><span class="sur-titre">Match Arena</span><h1>Choisis ton camp.</h1><p>Un choix, un risque lisible, puis le match décide de ton rating.</p></div>
        <button class="matchs-v2__historique" data-statut="termine" type="button">Historique</button>
      </header>
      <div class="matchs-v2__barre"><div class="arena-filtres" id="filtres-jeu"></div><div class="arena-filtres arena-filtres--droite" id="filtres-meta"></div></div>
      <div id="matchs-v2-zone"><div class="chargement"><span class="spinner"></span></div></div>
    </section>`;

  const filtresJeu = racine.querySelector('#filtres-jeu');
  const filtresMeta = racine.querySelector('#filtres-meta');
  const zone = racine.querySelector('#matchs-v2-zone');

  const rendreFiltres = () => {
    filtresJeu.innerHTML = FILTRES.map((f) => `<button class="arena-filter${f.cle === jeuActif ? ' actif' : ''}" data-jeu="${esc(f.cle)}" type="button">${esc(f.libelle)}</button>`).join('');
    filtresMeta.innerHTML = `<button class="arena-filter${statutActif === 'a_venir' ? ' actif' : ''}" data-statut="a_venir" type="button">À venir</button>${favorite ? `<button class="arena-filter${favoriSeul ? ' actif' : ''}" data-favori="1" type="button">★ ${esc(favorite.tag)}</button>` : ''}`;
    const historique = racine.querySelector('.matchs-v2__historique');
    historique.classList.toggle('actif', statutActif === 'termine');
    historique.textContent = statutActif === 'termine' ? 'Voir les prochains' : 'Historique';
    historique.dataset.statut = statutActif === 'termine' ? 'a_venir' : 'termine';
  };

  const chargerEtRendre = async () => {
    rendreFiltres();
    zone.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';
    const matchs = await api.listerMatchs({ jeu: jeuActif || null, statut: statutActif, equipe: favoriSeul ? favorite?.id ?? null : null }).catch(() => []);
    if (!matchs.length) {
      heroActuel = null;
      zone.innerHTML = vide(statutActif === 'termine' ? 'Aucun résultat' : 'Aucun match', statutActif === 'termine' ? "L'historique apparaîtra ici dès qu'un match sera réglé." : 'Le prochain calendrier apparaîtra ici dès sa publication.');
      return;
    }

    const enrichis = await Promise.all(matchs.map(enrichirPourAffichage));
    const ordonnes = [...enrichis].sort((a, b) => new Date(a.debut) - new Date(b.debut));
    if (statutActif === 'termine') {
      heroActuel = null;
      zone.innerHTML = `<section class="arena-results-intro"><span class="sur-titre">Historique</span><h2>Chaque résultat laisse une trace.</h2><p>Ton choix et le delta Frags associé, sans notion de mise.</p></section>${timeline(ordonnes.reverse(), pronostics, true)}`;
      return;
    }

    heroActuel = ordonnes[0];
    const reste = ordonnes.slice(1);
    zone.innerHTML = `${heroArena(heroActuel, pronostics)}${await rappelDuCall()}<section class="arena-timeline-section"><div class="arena-section-title"><div><span class="sur-titre">À suivre</span><h2>Le reste du calendrier</h2></div><span>${reste.length} match${reste.length > 1 ? 's' : ''}</span></div>${reste.length ? timeline(reste, pronostics, false) : '<p class="arena-fin">C’est la dernière affiche programmée pour le moment.</p>'}</section>`;
  };

  surClic(racine, '[data-jeu]', async (btn) => { jeuActif = btn.dataset.jeu || ''; await chargerEtRendre(); });
  surClic(racine, '[data-statut]', async (btn) => { statutActif = btn.dataset.statut || 'a_venir'; await chargerEtRendre(); });
  surClic(racine, '[data-favori]', async () => { favoriSeul = !favoriSeul; await chargerEtRendre(); });
  surClic(racine, '[data-arena-choix]', (btn, e) => {
    e.preventDefault();
    if (!heroActuel) return;
    ouvrirDockArena(racine, heroActuel, btn, async () => {
      pronostics = contexte.utilisateur ? await economie.mesPronosticsClasses().catch(() => pronostics) : [];
      await chargerEtRendre();
    });
  });
  await chargerEtRendre();
}

async function enrichirPourAffichage(match) {
  if (match.statut === 'termine') return { ...match, projection: null };
  return { ...match, projection: await economie.projectionMatchFrags(match.id).catch(() => null) };
}

function heroArena(m, pronostics) {
  const prono = pronostics.find((p) => p.match_id === m.id);
  const debut = new Date(m.debut);
  const ouvert = m.statut === 'a_venir' && debut.getTime() > Date.now();
  const live = !ouvert && m.statut !== 'termine';
  const heure = debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const a = m.projection?.choix?.find((c) => c.cle === 'a') ?? null;
  const b = m.projection?.choix?.find((c) => c.cle === 'b') ?? null;

  return `
    <section class="arena-hero" data-jeu="${esc(m.jeu)}">
      <div class="arena-hero__grain" aria-hidden="true"></div><div class="arena-hero__glow arena-hero__glow--a" aria-hidden="true"></div><div class="arena-hero__glow arena-hero__glow--b" aria-hidden="true"></div>
      <div class="arena-hero__meta"><div><span class="arena-game-dot"></span><strong>${esc(nomJeu(m.jeu))}</strong><i></i><span>${esc(m.evenement)}</span><i></i><span>BO${esc(String(m.format))}</span></div><span class="arena-countdown${live ? ' arena-countdown--live' : ''}">${live ? '<b></b> LIVE' : `${esc(quand(m.debut))} · ${esc(heure)}`}</span></div>
      <div class="arena-versus">
        ${heroCamp({ nom: m.equipe_a, tag: m.tag_a, cle: 'a', projection: a, droite: false, ouvert: ouvert && !prono })}
        <div class="arena-versus__centre" aria-hidden="true"><span>VERSUS</span><strong>VS</strong><i></i></div>
        ${heroCamp({ nom: m.equipe_b, tag: m.tag_b, cle: 'b', projection: b, droite: true, ouvert: ouvert && !prono })}
      </div>
      <div class="arena-hero__footer">${prono ? resumeProno(m, prono) : etatHero({ ouvert, live, projection: m.projection })}<a class="arena-details" href="#/matchs/${encodeURIComponent(m.id)}"><span>${prono ? 'Ouvrir mon pronostic' : 'Voir le Match Center'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a></div>
      <div class="arena-dock" id="arena-dock" aria-live="polite"></div>
    </section>`;
}

function heroCamp({ nom, tag, cle, projection, droite, ouvert }) {
  const attrs = projection && ouvert ? `data-arena-choix="1" data-cle="${cle}" data-libelle="${esc(nom)}"` : '';
  const proba = projection ? Math.round(Number(projection.proba) * 100) : null;
  return `<button class="arena-team${droite ? ' arena-team--right' : ''}${ouvert ? '' : ' arena-team--locked'}" ${attrs} type="button" ${ouvert ? '' : 'disabled'}>
    <span class="arena-team__logo">${ecusson(tag, nom)}</span><span class="arena-team__copy"><small>${esc(tag)}</small><strong>${esc(nom)}</strong><span>${proba == null ? 'Modèle indisponible' : `${proba}% ${proba >= 50 ? 'favori' : 'outsider'}`}</span></span>
    ${projection ? `<span class="arena-team__return"><b class="positif">+${Math.abs(projection.gain)}</b> / <b class="negatif">−${Math.abs(projection.perte)}</b> 💥</span>` : ''}
  </button>`;
}

function etatHero({ ouvert, live, projection }) {
  if (!projection) return '<p class="arena-hero__hint">Le snapshot de probabilité sera disponible bientôt.</p>';
  if (live) return '<p class="arena-hero__hint"><span class="arena-live-pulse"></span> Le match a commencé : les pronostics sont verrouillés.</p>';
  if (!ouvert) return '<p class="arena-hero__hint">Les pronostics sont fermés sur cette affiche.</p>';
  return '<p class="arena-hero__hint"><span class="arena-live-pulse"></span> Clique sur une équipe : tu verras le risque exact avant de verrouiller.</p>';
}

function resumeProno(m, p) {
  const delta = Number(p.delta_frags ?? 0);
  const detail = p.statut === 'en_cours' ? 'En attente du résultat' : p.statut === 'gagne' ? `+${Math.abs(delta)} Frags` : `−${Math.abs(delta)} Frags`;
  return `<div class="arena-my-pick"><span>Ton choix est verrouillé</span><strong>${esc(libelleChoix(m, p.choix))}</strong><small>${esc(detail)} · aucun Frag engagé</small></div>`;
}

function timeline(matchs, pronostics, resultats) {
  const groupes = grouperMatchs(matchs, resultats);
  return `<div class="arena-timeline">${groupes.map(({ libelle, matchs: items }) => `<section class="arena-day"><div class="arena-day__label"><span>${esc(libelle)}</span><i></i></div><div class="arena-day__matches">${items.map((m) => ligneMatch(m, pronostics, resultats)).join('')}</div></section>`).join('')}</div>`;
}

function grouperMatchs(matchs, resultats) {
  const groupes = []; const index = new Map();
  for (const m of matchs) {
    const libelle = groupeTemporel(m, resultats);
    if (!index.has(libelle)) { index.set(libelle, groupes.length); groupes.push({ libelle, matchs: [] }); }
    groupes[index.get(libelle)].matchs.push(m);
  }
  return groupes;
}

function groupeTemporel(m, resultats) {
  const date = new Date(m.debut);
  if (resultats) return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const now = new Date(); const delta = date.getTime() - now.getTime();
  if (delta <= 0) return 'EN DIRECT'; if (delta < 3600000) return 'BIENTÔT'; if (memeJour(date, now)) return "AUJOURD'HUI";
  const demain = new Date(now); demain.setDate(demain.getDate() + 1); if (memeJour(date, demain)) return 'DEMAIN';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}
function memeJour(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function ligneMatch(m, pronostics, resultats) {
  const p = pronostics.find((x) => x.match_id === m.id);
  const heure = new Date(m.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const live = !resultats && new Date(m.debut).getTime() <= Date.now();
  const a = m.projection?.choix?.find((c) => c.cle === 'a'); const b = m.projection?.choix?.find((c) => c.cle === 'b');
  const pA = a ? Math.round(Number(a.proba) * 100) : null; const pB = b ? Math.round(Number(b.proba) * 100) : null;
  const gagnantA = resultats && Number(m.score_a) > Number(m.score_b); const gagnantB = resultats && Number(m.score_b) > Number(m.score_a);
  return `<a class="arena-row${live ? ' arena-row--live' : ''}${p ? ' arena-row--picked' : ''}" href="#/matchs/${encodeURIComponent(m.id)}" data-jeu="${esc(m.jeu)}">
    <div class="arena-row__when"><strong>${live ? 'LIVE' : esc(heure)}</strong><span>${esc(nomJeu(m.jeu))}</span></div><div class="arena-row__event"><span>${esc(m.evenement)}</span><small>BO${esc(String(m.format))}</small></div>
    <div class="arena-row__duel"><span class="arena-row__team${gagnantA ? ' gagnant' : ''}">${ecusson(m.tag_a, m.equipe_a, 's')}<strong>${esc(m.equipe_a)}</strong>${resultats ? `<b>${esc(String(m.score_a))}</b>` : ''}</span><span class="arena-row__vs">${resultats ? '—' : 'VS'}</span><span class="arena-row__team arena-row__team--right${gagnantB ? ' gagnant' : ''}">${resultats ? `<b>${esc(String(m.score_b))}</b>` : ''}<strong>${esc(m.equipe_b)}</strong>${ecusson(m.tag_b, m.equipe_b, 's')}</span></div>
    ${resultats ? `<div class="arena-row__state">${etatPronoResultat(p)}</div>` : `<div class="arena-row__prob"><span>${pA == null ? '—' : `${pA}%`}</span><i><b style="width:${pA == null ? 50 : pA}%"></b></i><span>${pB == null ? '—' : `${pB}%`}</span></div>`}
    <div class="arena-row__action">${p ? `<span><b>Ton choix</b>${esc(libelleChoix(m, p.choix))}</span>` : resultats ? '<span>Voir le détail</span>' : `<span>${live ? 'Suivre' : 'Pronostiquer'} <b>→</b></span>`}</div>
  </a>`;
}

function etatPronoResultat(p) {
  if (!p) return '<span class="arena-result-badge">Pas de prono</span>';
  const d = Math.abs(Number(p.delta_frags ?? 0));
  if (p.statut === 'gagne') return `<span class="arena-result-badge arena-result-badge--win">+${d}</span>`;
  if (p.statut === 'perdu') return `<span class="arena-result-badge arena-result-badge--loss">−${d}</span>`;
  return '<span class="arena-result-badge">En attente</span>';
}

function ouvrirDockArena(racine, match, btn, apresValidation) {
  const dock = racine.querySelector('#arena-dock'); if (!dock) return;
  racine.querySelectorAll('.arena-team.is-selected').forEach((el) => el.classList.remove('is-selected')); btn.classList.add('is-selected');
  const choix = btn.dataset.cle; const libelle = btn.dataset.libelle || ''; const p = match.projection?.choix?.find((x) => x.cle === choix); if (!p) return;
  if (!contexte.utilisateur) {
    dock.innerHTML = `<div class="arena-ticket arena-ticket--login"><div><span>Ton choix</span><strong>${esc(libelle)}</strong><small>Crée ton profil pour entrer dans le classement.</small></div><a class="btn" href="#/connexion">Créer mon profil</a></div>`; return;
  }
  dock.innerHTML = `<div class="arena-ticket arena-ticket--ranked"><div class="arena-ticket__pick"><span>Pronostic classé</span><strong>${esc(libelle)}</strong><small>${match.projection.placements_restants > 0 ? `Placement · ${match.projection.placements_restants} restant(s)` : 'Rating établi'}</small></div><div class="ranked-risk"><span><small>Si correct</small><strong class="positif">+${Math.abs(p.gain)} 💥</strong></span><span><small>Si faux</small><strong class="negatif">−${Math.abs(p.perte)} 💥</strong></span></div><div class="ranked-rule">Aucun Frag n’est engagé. Ton rating change seulement au résultat.</div><button class="arena-ticket__confirm" id="arena-valider" type="button">Verrouiller mon pronostic</button></div>`;
  dock.querySelector('#arena-valider')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try { await economie.placerPronosticClasse({ matchId: match.id, choix }); toast(`Pronostic classé verrouillé : ${libelle}`, 'succes'); await apresValidation(); }
    catch (err) { toast(err.message, 'erreur'); e.currentTarget.disabled = false; }
  });
}

async function rappelDuCall() {
  if (!contexte.utilisateur) return '';
  try {
    const [call, evenements] = await Promise.all([api.monCall(), api.listerEvenementsSaison()]);
    if (call) return '';
    const ouverts = evenements.filter((e) => e.statut === 'ouvert'); if (!ouverts.length) return '';
    return `<aside class="arena-call"><div class="arena-call__mark">C</div><div><span class="sur-titre">Call de saison</span><strong>Un choix pour tout le tournoi.</strong><small>Gratuit · prestige uniquement · ${ouverts.length} tournoi${ouverts.length > 1 ? 's' : ''} ouvert${ouverts.length > 1 ? 's' : ''}.</small></div><a href="#/call">Poser mon Call →</a></aside>`;
  } catch { return ''; }
}

function libelleChoix(m, choix) { return choix === 'a' ? m.equipe_a : m.equipe_b; }
