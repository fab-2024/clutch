/** Clutch Hub — Phase 2 final composition, branchée sur l'économie classée. */
import * as api from '../api.js';
import * as economie from '../economy-api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, quand, nomJeu, teinteEquipe } from '../ui.js';
import { Button, ProgressBar, SectionHeading, TeamBadge } from '../components-v4.js';
import { formaterFrags, palierCommunaute } from '../core.js';
import { evaluerBadgesV2 } from '../badges-v2.js';
import { bombonne } from './bombonne.js';
import { dashboardFriendQuests } from '../friend-quests-api.js';
import { friendQuestCompact, revelerFriendQuest } from './friend-quests.js';

export async function vueAccueil(racine) {
  const connecte = Boolean(contexte.utilisateur);
  const [matchs, pronostics, badgesBruts, communautes, ligues, activite, quests] = await Promise.all([
    api.listerMatchs({ jeu: null, statut: 'a_venir', equipe: null }).catch(() => []),
    connecte ? economie.mesPronosticsClasses().catch(() => []) : Promise.resolve([]),
    connecte ? api.mesBadges().catch(() => null) : Promise.resolve(null),
    api.classementCommunautes().catch(() => []),
    connecte ? api.mesLigues().catch(() => []) : Promise.resolve([]),
    connecte ? api.activiteAmis().catch(() => []) : Promise.resolve([]),
    connecte ? dashboardFriendQuests().catch(() => null) : Promise.resolve(null),
  ]);

  const badges = badgesBruts
    ? { ...badgesBruts, badges: evaluerBadgesV2(badgesBruts.recap ?? {}) }
    : null;
  const hero = [...matchs].sort((a, b) => new Date(a.debut) - new Date(b.debut))[0] ?? null;
  const projection = hero ? await economie.projectionMatchFrags(hero.id).catch(() => null) : null;
  const monProno = hero ? pronostics.find((p) => p.match_id === hero.id) ?? null : null;
  const meilleureQuete = quests?.actives?.[0] ?? null;

  racine.innerHTML = `
    ${bandeauSaison()}
    ${intro()}
    ${heroMatch(hero, projection, monProno)}
    ${friendQuestCompact(meilleureQuete)}
    ${objectifs(pronostics, ligues)}
    ${focusContextuel(communautes, badges)}
    ${flux(activite)}
  `;

  racine.querySelectorAll('[data-phase13-rival]').forEach((el) => el.addEventListener('click', () => {
    const pseudo = el.dataset.phase13Rival;
    if (!pseudo) return;
    try { localStorage.setItem('clutch:challenge:rival', JSON.stringify({ pseudo, creeLe: Date.now(), source: 'friend_quest' })); } catch { /* no-op */ }
  }));
  if (quests?.a_reveler) setTimeout(() => void revelerFriendQuest(quests.a_reveler), 220);
}

function intro() {
  const u = contexte.utilisateur;
  if (!u) {
    return `<section class="hub-intro hub-intro--invite"><div><span class="sur-titre">Clutch // aujourd'hui</span><h1 data-display="clutch">Ton premier call commence ici.</h1><p>Choisis ton camp sur un vrai match. Le classement, la faction et le reste viennent ensuite.</p></div>${Button({ label: 'Créer mon profil', href: '#/connexion' })}</section>`;
  }
  const pseudo = u.pseudo || u.email?.split('@')[0] || 'joueur';
  return `<section class="hub-intro"><div class="hub-intro__salut"><span class="sur-titre">Clutch // aujourd'hui</span><h1 data-display="clutch">${esc(pseudo)}, ton prochain call.</h1><p>Un match. Un camp. Le reste de l'application réagit à ton choix.</p></div></section>`;
}

function heroMatch(match, projection, monProno) {
  if (!match) {
    return `<section class="hub-hero hub-hero--vide"><div><span class="sur-titre">Prochain match</span><h2 data-display="clutch">Le calme avant la prochaine affiche.</h2><p>Aucun match n'est encore programmé. Profite-en pour regarder ta faction ou tes ligues.</p></div>${Button({ label: 'Voir mes ligues', href: '#/ligues', variant: 'ghost' })}</section>`;
  }

  const choix = projection?.choix ?? [];
  const favori = choix.length ? [...choix].sort((a, b) => Number(b.proba) - Number(a.proba))[0] : null;
  const probaFavori = favori ? Math.round(Number(favori.proba) * 100) : null;
  const favoriNom = favori ? (favori.cle === 'a' ? match.equipe_a : match.equipe_b) : null;
  const debut = new Date(match.debut);
  const live = debut.getTime() <= Date.now();
  const heure = debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return `<section class="hub-hero" data-jeu="${esc(match.jeu)}">
    <div class="hub-hero__aura" aria-hidden="true"></div>
    <div class="hub-hero__top"><div class="hub-hero__event"><span class="hub-game-dot"></span><span>${esc(nomJeu(match.jeu))}</span><i></i><span>${esc(match.evenement)}</span></div><span class="hub-hero__time${live ? ' hub-hero__time--live' : ''}">${live ? '<b></b> LIVE' : `${esc(quand(match.debut))} · ${esc(heure)}`}</span></div>
    <div class="hub-hero__question"><span>Match du moment</span><strong>Ce soir, tu prends qui ?</strong></div>
    <div class="hub-duel">${camp(match.equipe_a, match.tag_a, match.elo_a)}<div class="hub-duel__centre"><span>BO${esc(String(match.format))}</span><strong>VS</strong>${favoriNom && probaFavori !== null ? `<small>${esc(favoriNom)} · ${probaFavori}% favori</small>` : '<small>Choisis ton camp</small>'}</div>${camp(match.equipe_b, match.tag_b, match.elo_b, true)}</div>
    <div class="hub-hero__bottom">${resumeProno(match, monProno)}<a class="hub-cta" href="#/matchs/${encodeURIComponent(match.id)}"><span>${monProno ? 'Voir mon pronostic' : 'Prendre position'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a></div>
  </section>`;
}

function camp(nom, tag, elo, droite = false) {
  return `<div class="hub-team${droite ? ' hub-team--right' : ''}">${TeamBadge({ tag, name: nom })}<div class="hub-team__txt"><strong>${esc(nom)}</strong><span>${esc(tag)} · Elo ${esc(String(elo))}</span></div></div>`;
}

function resumeProno(match, p) {
  if (!p) return '<div class="hub-hero__hint"><span class="hub-pulse"></span> Ton choix n’est pas encore posé.</div>';
  const nom = p.choix === 'a' ? match.equipe_a : match.equipe_b;
  const statut = p.statut === 'en_cours' ? 'En attente du résultat' : p.statut === 'gagne' ? `+${Math.abs(Number(p.delta_frags ?? 0))} Frags` : `−${Math.abs(Number(p.delta_frags ?? 0))} Frags`;
  return `<div class="hub-mybet"><span>Ton choix</span><strong>${esc(nom)}</strong><small>${esc(statut)} · aucun Frag engagé</small></div>`;
}

function objectifs(pronostics, ligues) {
  if (!contexte.utilisateur) return '';
  const aujourdhui = pronostics.filter((p) => estAujourdhui(p.cree_le));
  const placements = Number(contexte.frags?.placements_restants ?? 5);
  const missions = [
    { nom: 'Premier prono', detail: `${Math.min(1, aujourdhui.length)} / 1`, fait: aujourdhui.length >= 1, href: '#/matchs' },
    { nom: 'Triplé du jour', detail: `${Math.min(3, aujourdhui.length)} / 3`, fait: aujourdhui.length >= 3, href: '#/matchs' },
    { nom: 'Établir ton rating', detail: placements > 0 ? `${5 - placements} / 5 placements` : 'Rating établi', fait: placements === 0, href: '#/matchs' },
    { nom: 'Jouer en ligue', detail: ligues.length ? `${ligues.length} active${ligues.length > 1 ? 's' : ''}` : 'À rejoindre', fait: ligues.length > 0, href: '#/ligues' },
  ];
  const faits = missions.filter((m) => m.fait).length;
  return `<section class="hub-missions">${SectionHeading({ eyebrow: "Aujourd'hui", title: 'Boucle du jour', meta: `${faits} / ${missions.length} bouclé${faits > 1 ? 's' : ''}` })}<div class="hub-missions__rail">${missions.map(mission).join('')}</div></section>`;
}

function mission(m) {
  return `<a class="hub-mission${m.fait ? ' hub-mission--done' : ''}" href="${m.href}"><span class="hub-mission__check">${m.fait ? '✓' : ''}</span><span><strong>${esc(m.nom)}</strong><small>${esc(m.detail)}</small></span></a>`;
}

function estAujourdhui(date) {
  if (!date) return false;
  const d = new Date(date);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function focusContextuel(communautes, badges) {
  const mienne = communautes.find((c) => c.moi) ?? null;
  if (mienne) {
    const palier = palierCommunaute(mienne.membres);
    if (!palier.max && palier.progression >= .55) return `<section class="hub-context-focus">${apercuCommunaute(communautes)}</section>`;
  }
  return `<section class="hub-context-focus">${apercuRoom(badges)}</section>`;
}

function apercuCommunaute(communautes) {
  if (!communautes.length) return `<section class="hub-faction hub-panel"><span class="sur-titre">Communauté</span><h2>La première faction attend ses membres.</h2><p>Choisis ton équipe favorite : c'est elle qui devient ta faction dans Clutch.</p><a class="hub-link" href="#/parametres">Choisir mon équipe →</a></section>`;
  const mienne = communautes.find((c) => c.moi) ?? null;
  const c = mienne ?? communautes[0];
  const p = palierCommunaute(c.membres);
  const teinte = teinteEquipe(c.tag, c.nom);
  const progression = Math.round(p.progression * 100);
  return `<section class="hub-faction hub-panel" style="--faction:${esc(teinte)}"><div class="hub-panel__heading"><div><span class="sur-titre">${mienne ? 'Mutation proche' : 'Faction en tête'}</span><h2>${esc(c.nom)}</h2></div><span class="hub-rank">#${communautes.indexOf(c) + 1}</span></div><div class="hub-faction__body"><div class="hub-faction__relic">${bombonne(p, { teinte })}</div><div class="hub-faction__copy"><strong>${esc(formaterFrags(c.membres))} supporter${c.membres > 1 ? 's' : ''}</strong><span>${p.max ? `${esc(p.nom)} · palier maximum` : `En route vers ${esc(p.nom)}`}</span>${ProgressBar({ value: progression, max: 100, meta: `${progression}%` })}<small>${p.max ? 'La relique a atteint sa forme finale.' : `Encore ${esc(formaterFrags(p.restant))} avant la prochaine mutation.`}</small></div></div><a class="hub-link" href="#/communaute">Entrer dans la faction →</a></section>`;
}

function apercuRoom(badges) {
  const obtenus = (badges?.badges ?? []).filter((b) => b.obtenu);
  const dernier = obtenus[obtenus.length - 1] ?? null;
  return `<section class="hub-room hub-panel"><div class="hub-panel__heading"><div><span class="sur-titre">À exposer</span><h2>Ta Clutch Room raconte ta progression.</h2></div><span class="hub-room__tag">3D</span></div><div class="hub-room__scene" aria-hidden="true"><div class="hub-room__wall"></div><div class="hub-room__screen"><i></i></div><div class="hub-room__desk"></div><div class="hub-room__pc"></div><div class="hub-room__shelf"><i></i><i></i><i></i></div><div class="hub-room__glow"></div></div><p>${dernier ? `Dernier trophée prêt à être exposé : <strong>${esc(dernier.nom)}</strong>.` : 'Tes trophées, objets et récompenses finiront ici — visibles, pas rangés dans une liste.'}</p><span class="hub-room__soon">Room intégrée à venir · aucun faux bouton</span></section>`;
}

function flux(activite) {
  if (!contexte.utilisateur || !activite?.length) return '';
  return `<section class="hub-feed">${SectionHeading({ eyebrow: 'Autour de toi', title: 'Le serveur bouge', meta: 'Activité récente' })}<div class="hub-feed__list">${activite.slice(0, 4).map((e) => `<div class="hub-feed__item"><span class="hub-feed__avatar">${esc(initiales(e.pseudo))}</span><p><strong>${esc(e.pseudo)}</strong> a joué ${esc(e.libelle_choix ?? e.choix)} sur ${esc(e.equipe_a)} – ${esc(e.equipe_b)} et ${e.statut === 'gagne' ? '<b class="positif">a eu raison</b>' : '<b class="negatif">s’est raté</b>'}.</p><time>${esc(quand(e.quand))}</time></div>`).join('')}</div></section>`;
}

function initiales(nom) {
  const mots = String(nom || '?').trim().split(/[\s._-]+/).filter(Boolean);
  if (!mots.length) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}
