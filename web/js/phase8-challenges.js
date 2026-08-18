import { esc, nomJeu, toast } from './ui.js';
import { CONVICTIONS } from './prediction.js';
import * as defis from './challenge-api.js';

const PENDING_KEY = 'clutch:challenge:pending:v1';
const ROUTE_DEFI = /^#\/defis\/([a-z0-9]+)$/i;
const ROUTE_LISTE = /^#\/defis$/i;
let renduToken = 0;
let repriseEnCours = false;

function tokenCourant() {
  const m = String(location.hash || '').match(ROUTE_DEFI);
  return m ? m[1] : null;
}

function matchIdCourant() {
  const m = String(location.hash || '').match(/^#\/matchs\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function urlDefi(token) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/defis/${encodeURIComponent(token)}`;
}

function lirePending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); }
  catch { return null; }
}

function sauverPending(payload) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

function effacerPending() {
  localStorage.removeItem(PENDING_KEY);
}

function equipePourChoix(d, choix) {
  return choix === 'a' ? d.equipe_a : d.equipe_b;
}

function tagPourChoix(d, choix) {
  return choix === 'a' ? (d.tag_a || d.equipe_a) : (d.tag_b || d.equipe_b);
}

function conviction(cle) {
  return CONVICTIONS[cle] || CONVICTIONS.normal;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

function loading(racine, texte = 'Chargement du duel…') {
  racine.innerHTML = `<section class="phase8-page phase8-page--loading"><div class="phase8-loading"><span class="spinner"></span><strong>${esc(texte)}</strong></div></section>`;
}

function erreur(racine, message) {
  racine.innerHTML = `<section class="phase8-page"><div class="phase8-shell"><div class="phase8-state phase8-state--error"><span>⚔</span><h1>Duel indisponible</h1><p>${esc(message || 'Ce défi est introuvable ou n’est plus disponible.')}</p><a class="phase8-btn" href="#/matchs">Voir les matchs</a></div></div></section>`;
}

function renduConvictions(active, verrouille = false) {
  return Object.values(CONVICTIONS).map((c) => `<button class="phase8-conviction${active === c.id ? ' is-active' : ''}" type="button" data-phase8-conviction="${c.id}" aria-pressed="${active === c.id}"${verrouille ? ' disabled' : ''}>
    <span>${esc(c.symbole)}</span><strong>${esc(c.label)}</strong><small>${esc(c.description)}</small><i>${c.multiplicateur.toLocaleString('fr-FR')}×</i>
  </button>`).join('');
}

function carteJoueur({ pseudo, tag, equipe, conviction: conv, cote = 'challenger', actif = false }) {
  const c = conviction(conv);
  return `<article class="phase8-player${actif ? ' is-me' : ''}">
    <small>${cote === 'challenger' ? 'CHALLENGER' : 'RÉPONSE'}</small>
    <strong class="phase8-player__pseudo">${esc(pseudo || 'En attente')}</strong>
    <div class="phase8-player__team"><b>${esc(tag || '—')}</b><span>${esc(equipe || '')}</span></div>
    <div class="phase8-player__conviction">${esc(c.label)} · ${c.multiplicateur.toLocaleString('fr-FR')}×</div>
  </article>`;
}

function shareBloc(d) {
  const lien = urlDefi(d.token);
  return `<div class="phase8-share">
    <div><small>LIEN DU DUEL</small><strong>Envoie-le à ton pote.</strong><span>Le premier joueur qui prend le camp opposé verrouille le duel.</span></div>
    <div class="phase8-share__url"><code>${esc(lien)}</code><button type="button" data-phase8-copy="${esc(d.token)}">Copier</button></div>
    <div class="phase8-share__actions"><button class="phase8-btn" type="button" data-phase8-share="${esc(d.token)}">Partager le défi</button><button class="phase8-btn phase8-btn--ghost" type="button" data-phase8-cancel="${esc(d.token)}">Annuler</button></div>
  </div>`;
}

function duelLocked(d, duel = null) {
  const teamCreateur = equipePourChoix(d, d.createur_choix);
  const tagCreateur = tagPourChoix(d, d.createur_choix);
  const teamAccepteur = d.accepteur_choix ? equipePourChoix(d, d.accepteur_choix) : d.equipe_opposee;
  const tagAccepteur = d.accepteur_choix ? tagPourChoix(d, d.accepteur_choix) : d.tag_oppose;
  const fini = d.statut === 'termine';
  const verdict = fini && duel
    ? (duel.moi_gagne ? `TU PRENDS LE DUEL.` : `${duel.adversaire_pseudo || 'TON RIVAL'} PREND LE DUEL.`)
    : 'DUEL VERROUILLÉ.';
  return `<section class="phase8-page"><div class="phase8-shell">
    <header class="phase8-head"><a href="#/defis">← Mes duels</a><span>CLUTCH // DUEL</span></header>
    <div class="phase8-hero phase8-hero--locked${fini ? ' is-finished' : ''}">
      <div class="phase8-eyebrow">${fini ? 'VERDICT FINAL' : 'MATCH-UP CONFIRMÉ'}</div>
      <h1>${esc(verdict)}</h1>
      <p>${esc(nomJeu(d.jeu))} · ${esc(d.evenement || 'Match')} · ${esc(formatDate(d.debut))}</p>
      ${fini ? `<div class="phase8-final-score"><span>${esc(d.tag_a || d.equipe_a)}</span><strong>${Number(d.score_a ?? 0)} — ${Number(d.score_b ?? 0)}</strong><span>${esc(d.tag_b || d.equipe_b)}</span></div>` : ''}
      <div class="phase8-versus">
        ${carteJoueur({ pseudo: d.createur_pseudo, tag: tagCreateur, equipe: teamCreateur, conviction: d.createur_conviction, cote: 'challenger', actif: d.moi_role === 'createur' })}
        <div class="phase8-vs">VS</div>
        ${carteJoueur({ pseudo: d.accepteur_pseudo, tag: tagAccepteur, equipe: teamAccepteur, conviction: d.accepteur_conviction || 'normal', cote: 'réponse', actif: d.moi_role === 'accepteur' })}
      </div>
      ${fini && duel ? `<div class="phase8-rivalry"><small>RIVALITÉ</small><strong>Toi ${Number(duel.score_moi || 0)} — ${Number(duel.score_adversaire || 0)} ${esc(duel.adversaire_pseudo || '')}</strong></div>` : '<div class="phase8-lock-note">Les deux pronostics sont maintenant verrouillés. Aucun Frag supplémentaire n’est mis en jeu par le duel.</div>'}
      <div class="phase8-actions"><a class="phase8-btn" href="#/matchs/${encodeURIComponent(d.match_id)}">Voir le match</a><a class="phase8-btn phase8-btn--ghost" href="#/defis">Mes duels</a></div>
    </div></div></section>`;
}

function invitation(d, activeConviction = 'normal') {
  const cCreateur = conviction(d.createur_conviction);
  const createurTeam = equipePourChoix(d, d.createur_choix);
  const createurTag = tagPourChoix(d, d.createur_choix);
  const mon = d.mon_prono;
  const memeCamp = mon && mon.choix === d.createur_choix;
  const dejaOppose = mon && mon.choix === d.choix_oppose;
  const conv = dejaOppose ? mon.conviction : activeConviction;
  const connecte = defis.estConnecte();

  if (d.moi_role === 'createur') {
    return `<section class="phase8-page"><div class="phase8-shell"><header class="phase8-head"><a href="#/matchs/${encodeURIComponent(d.match_id)}">← Match</a><a href="#/defis">Mes duels</a></header>
      <div class="phase8-hero"><div class="phase8-eyebrow">DÉFI CRÉÉ</div><h1>À LUI DE RÉPONDRE.</h1><p>Tu as pris <strong>${esc(createurTag)}</strong> · ${esc(cCreateur.label)}. Ton camp ne bougera plus.</p>
      <div class="phase8-versus phase8-versus--pending">${carteJoueur({ pseudo: d.createur_pseudo, tag: createurTag, equipe: createurTeam, conviction: d.createur_conviction, actif: true })}<div class="phase8-vs">VS</div>${carteJoueur({ pseudo: 'Ton pote', tag: d.tag_oppose, equipe: d.equipe_opposee, conviction: 'normal', cote: 'réponse' })}</div>
      ${shareBloc(d)}</div></div></section>`;
  }

  return `<section class="phase8-page"><div class="phase8-shell"><header class="phase8-head"><a href="#/matchs/${encodeURIComponent(d.match_id)}">Voir le match</a><span>CLUTCH // CHALLENGE</span></header>
    <div class="phase8-hero phase8-hero--invite">
      <div class="phase8-eyebrow">INVITATION 1V1</div>
      <h1>${esc(d.createur_pseudo)} TE DÉFIE.</h1>
      <p>${esc(d.createur_pseudo)} a pris <strong>${esc(createurTag)}</strong> · ${esc(cCreateur.label)}. Si tu acceptes, tu défends <strong>${esc(d.tag_oppose || d.equipe_opposee)}</strong>.</p>
      <div class="phase8-matchline"><span>${esc(d.tag_a || d.equipe_a)}</span><strong>VS</strong><span>${esc(d.tag_b || d.equipe_b)}</span><small>${esc(nomJeu(d.jeu))} · ${esc(d.evenement || '')} · ${esc(formatDate(d.debut))}</small></div>
      <div class="phase8-versus phase8-versus--invite">${carteJoueur({ pseudo: d.createur_pseudo, tag: createurTag, equipe: createurTeam, conviction: d.createur_conviction })}<div class="phase8-vs">VS</div>${carteJoueur({ pseudo: connecte ? 'TOI' : 'TOI ?', tag: d.tag_oppose, equipe: d.equipe_opposee, conviction: conv, cote: 'réponse', actif: true })}</div>
      ${memeCamp ? `<div class="phase8-warning"><strong>Tu as déjà pris ${esc(createurTag)}.</strong><span>Un duel doit opposer les deux camps ; ton prono verrouillé ne peut pas être changé.</span></div>` : `<div class="phase8-conviction-block"><div><small>TA CONVICTION</small><strong>${dejaOppose ? 'Ton prono est déjà verrouillé.' : 'À quel point tu assumes ce contre-call ?'}</strong></div><div class="phase8-convictions">${renduConvictions(conv, dejaOppose)}</div></div>`}
      ${memeCamp ? `<a class="phase8-btn phase8-btn--ghost" href="#/matchs/${encodeURIComponent(d.match_id)}">Retour au match</a>` : `<button class="phase8-btn phase8-btn--accept" type="button" data-phase8-accept="${esc(d.token)}" data-conviction="${esc(conv)}">${connecte ? `Prendre ${esc(d.tag_oppose || d.equipe_opposee)} et verrouiller le duel` : `Prendre ${esc(d.tag_oppose || d.equipe_opposee)}`}</button><small class="phase8-auth-note">${connecte ? 'Ton prono classé normal sera utilisé pour ce duel.' : 'Choisis d’abord. Tu créeras ton profil juste après pour verrouiller le défi.'}</small>`}
    </div></div></section>`;
}

function etatSimple(d) {
  const expire = d.statut === 'expire';
  return `<section class="phase8-page"><div class="phase8-shell"><div class="phase8-state"><span>⚔</span><h1>${expire ? 'TROP TARD.' : 'DÉFI ANNULÉ.'}</h1><p>${expire ? 'Le match a déjà commencé : ce duel ne peut plus être accepté.' : 'Le challenger a retiré cette invitation.'}</p><a class="phase8-btn" href="#/matchs">Trouver un autre match</a></div></div></section>`;
}

async function rendreDefi(racine, token) {
  const id = ++renduToken;
  loading(racine);
  try {
    const d = await defis.lireDefi(token);
    if (id !== renduToken) return;
    if (!d) return erreur(racine, 'Ce lien de défi n’existe pas.');
    let duel = null;
    if (d.statut === 'termine' && defis.estConnecte() && d.moi_role !== 'visiteur') {
      duel = await defis.duelResultat(d.match_id).catch(() => null);
    }
    if (id !== renduToken) return;
    racine.dataset.phase8Route = `defi:${token}`;
    if (d.statut === 'accepte' || d.statut === 'termine') racine.innerHTML = duelLocked(d, duel);
    else if (d.statut === 'en_attente') {
      const pending = lirePending();
      racine.innerHTML = invitation(d, pending?.token === token ? pending.conviction : 'normal');
    } else racine.innerHTML = etatSimple(d);
  } catch (e) {
    if (id === renduToken) erreur(racine, e.message);
  }
}

function ligneDefi(d) {
  const moiCreateur = d.moi_role === 'createur';
  const adversaire = moiCreateur ? (d.accepteur_pseudo || 'En attente') : d.createur_pseudo;
  const monChoix = moiCreateur ? d.createur_choix : d.accepteur_choix;
  const monTag = monChoix ? tagPourChoix(d, monChoix) : '—';
  const etat = d.statut === 'termine' ? 'Terminé' : d.statut === 'accepte' ? 'Verrouillé' : d.statut === 'annule' ? 'Annulé' : 'En attente';
  return `<a class="phase8-list-item" href="#/defis/${encodeURIComponent(d.token)}"><div><small>${esc(nomJeu(d.jeu))} · ${esc(d.evenement || '')}</small><strong>${esc(monTag)} <i>VS</i> ${esc(adversaire)}</strong><span>${esc(formatDate(d.debut))}</span></div><b class="phase8-status phase8-status--${esc(d.statut)}">${esc(etat)}</b></a>`;
}

async function rendreListe(racine) {
  const id = ++renduToken;
  racine.dataset.phase8Route = 'liste';
  if (!defis.estConnecte()) {
    racine.innerHTML = `<section class="phase8-page"><div class="phase8-shell"><header class="phase8-head"><a href="#/social/amis">← Social</a><span>CLUTCH // DUELS</span></header><div class="phase8-state"><span>⚔</span><h1>TES RIVALITÉS T’ATTENDENT.</h1><p>Connecte-toi pour retrouver tes défis envoyés, acceptés et terminés.</p><a class="phase8-btn" href="#/connexion-login">Se connecter</a></div></div></section>`;
    return;
  }
  loading(racine, 'Chargement de tes duels…');
  try {
    const liste = await defis.mesDefis(40);
    if (id !== renduToken) return;
    racine.dataset.phase8Route = 'liste';
    racine.innerHTML = `<section class="phase8-page"><div class="phase8-shell"><header class="phase8-head"><a href="#/social/amis">← Social</a><span>CLUTCH // DUELS</span></header><div class="phase8-list-head"><div><small>RIVALITÉS</small><h1>MES DUELS</h1><p>Un prono. Deux camps. Un seul résultat.</p></div><a class="phase8-btn phase8-btn--ghost" href="#/matchs">Trouver un match</a></div><div class="phase8-list">${Array.isArray(liste) && liste.length ? liste.map(ligneDefi).join('') : '<div class="phase8-empty"><span>⚔</span><strong>Aucun duel pour l’instant.</strong><p>Verrouille un prono puis défie un pote.</p><a href="#/matchs">Voir les matchs</a></div>'}</div></div></section>`;
  } catch (e) {
    if (id === renduToken) erreur(racine, e.message);
  }
}

async function rendreRoute() {
  const racine = document.getElementById('contenu');
  if (!racine) return;
  const token = tokenCourant();
  if (token) return rendreDefi(racine, token);
  if (ROUTE_LISTE.test(location.hash || '')) return rendreListe(racine);
}

async function creerDepuisProno(btn) {
  const matchId = matchIdCourant();
  if (!matchId || btn.disabled) return;
  btn.disabled = true;
  const ancien = btn.textContent;
  btn.textContent = 'Création du duel…';
  try {
    const d = await defis.creerDefi(matchId);
    location.hash = `#/defis/${encodeURIComponent(d.token)}`;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = ancien;
    toast(e.message, 'erreur');
  }
}

function injecterCTA() {
  const success = document.querySelector('.phase5-success');
  if (success && !success.querySelector('[data-phase8-create]')) {
    const done = success.querySelector('[data-phase5-done]');
    if (done) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'phase8-inline-challenge';
      b.dataset.phase8Create = '1';
      b.innerHTML = '<span>⚔</span><strong>Défier un pote</strong><small>Oppose ton call au sien</small>';
      done.before(b);
    }
  }

  const match = document.querySelector('.match-center .match-ticket--locked');
  if (match && !document.querySelector('[data-phase8-create-locked]')) {
    const cible = document.querySelector('.match-center .match-my-picks__heading') || match;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'phase8-match-challenge';
    b.dataset.phase8Create = '1';
    b.dataset.phase8CreateLocked = '1';
    b.textContent = '⚔ Défier un pote';
    cible.append(b);
  }
}

async function copier(token) {
  const lien = urlDefi(token);
  try {
    await navigator.clipboard.writeText(lien);
    toast('Lien du défi copié.', 'succes');
  } catch {
    window.prompt('Copie ce lien :', lien);
  }
}

async function partager(token) {
  const lien = urlDefi(token);
  const d = await defis.lireDefi(token).catch(() => null);
  const texte = d ? `${d.createur_pseudo} te défie sur ${d.tag_a || d.equipe_a} vs ${d.tag_b || d.equipe_b}.` : 'Je te défie sur Clutch.';
  if (navigator.share) {
    try { await navigator.share({ title: 'Duel Clutch', text: texte, url: lien }); return; }
    catch (e) { if (e?.name === 'AbortError') return; }
  }
  await copier(token);
}

async function accepter(token, conv, bouton) {
  if (bouton?.disabled) return;
  const d = await defis.lireDefi(token);
  if (!d || d.statut !== 'en_attente') return rendreRoute();

  if (!defis.estConnecte()) {
    sauverPending({ token, matchId: d.match_id, choix: d.choix_oppose, conviction: conv || 'normal', creeLe: Date.now() });
    location.hash = '#/connexion';
    return;
  }

  if (bouton) { bouton.disabled = true; bouton.textContent = 'Verrouillage…'; }
  try {
    if (!d.mon_prono) {
      await defis.placerPronoDefi({ matchId: d.match_id, choix: d.choix_oppose, conviction: conv || 'normal' });
    } else if (d.mon_prono.choix !== d.choix_oppose) {
      throw new Error('Ton pronostic déjà verrouillé est du même camp que le challenger.');
    }
    await defis.accepterDefi(token);
    effacerPending();
    toast('Duel verrouillé.', 'succes');
    await rendreRoute();
  } catch (e) {
    if (bouton) { bouton.disabled = false; bouton.textContent = `Prendre ${d.tag_oppose || d.equipe_opposee} et verrouiller le duel`; }
    toast(e.message, 'erreur');
  }
}

async function reprendrePending() {
  if (repriseEnCours || !defis.estConnecte()) return;
  const p = lirePending();
  if (!p?.token) return;
  repriseEnCours = true;
  try {
    const d = await defis.lireDefi(p.token);
    if (!d || d.statut !== 'en_attente') {
      effacerPending();
      if (d) location.hash = `#/defis/${encodeURIComponent(p.token)}`;
      return;
    }
    if (d.moi_role === 'createur') { effacerPending(); return; }
    if (!d.mon_prono) {
      await defis.placerPronoDefi({ matchId: d.match_id, choix: d.choix_oppose, conviction: p.conviction || 'normal' });
    } else if (d.mon_prono.choix !== d.choix_oppose) {
      effacerPending();
      location.hash = `#/defis/${encodeURIComponent(p.token)}`;
      return;
    }
    await defis.accepterDefi(p.token);
    effacerPending();
    toast('Profil créé. Ton duel est verrouillé.', 'succes');
    location.hash = `#/defis/${encodeURIComponent(p.token)}`;
  } catch {
    // Le compte/profil peut être encore en cours d'initialisation. On garde le pending.
  } finally {
    repriseEnCours = false;
  }
}

document.addEventListener('click', (event) => {
  const create = event.target.closest?.('[data-phase8-create]');
  if (create) { event.preventDefault(); void creerDepuisProno(create); return; }

  const conv = event.target.closest?.('[data-phase8-conviction]');
  if (conv && !conv.disabled) {
    const page = conv.closest('.phase8-page');
    page?.querySelectorAll('[data-phase8-conviction]').forEach((b) => b.classList.toggle('is-active', b === conv));
    const accept = page?.querySelector('[data-phase8-accept]');
    if (accept) accept.dataset.conviction = conv.dataset.phase8Conviction;
    return;
  }

  const accept = event.target.closest?.('[data-phase8-accept]');
  if (accept) { void accepter(accept.dataset.phase8Accept, accept.dataset.conviction || 'normal', accept); return; }

  const copy = event.target.closest?.('[data-phase8-copy]');
  if (copy) { void copier(copy.dataset.phase8Copy); return; }

  const share = event.target.closest?.('[data-phase8-share]');
  if (share) { void partager(share.dataset.phase8Share); return; }

  const cancel = event.target.closest?.('[data-phase8-cancel]');
  if (cancel) {
    cancel.disabled = true;
    void defis.annulerDefi(cancel.dataset.phase8Cancel)
      .then(() => { toast('Défi annulé.', 'succes'); return rendreRoute(); })
      .catch((e) => { cancel.disabled = false; toast(e.message, 'erreur'); });
  }
});

window.addEventListener('hashchange', () => { setTimeout(() => void rendreRoute(), 0); setTimeout(injecterCTA, 80); });
window.addEventListener('focus', () => void reprendrePending());

const observer = new MutationObserver(() => {
  injecterCTA();
  const racine = document.getElementById('contenu');
  const estRoute = tokenCourant() || ROUTE_LISTE.test(location.hash || '');
  if (estRoute && racine && !racine.querySelector('.phase8-page')) void rendreRoute();
});
observer.observe(document.body, { childList: true, subtree: true });

setInterval(() => { if (lirePending()) void reprendrePending(); }, 1800);
setTimeout(() => { injecterCTA(); void rendreRoute(); void reprendrePending(); }, 0);
