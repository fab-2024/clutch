/** Accueil V2 — Clutch Hub, branché sur l'économie classée. */
import * as api from '../api.js';
import * as economie from '../economy-api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, quand, nomJeu, ecusson, teinteEquipe, jeton } from '../ui.js';
import { formaterFrags, progressionNiveau, palierCommunaute } from '../core.js';
import { evaluerBadgesV2, xpDetailleeV2 } from '../badges-v2.js';
import { bombonne } from './bombonne.js';

export async function vueAccueil(racine) {
  const connecte = Boolean(contexte.utilisateur);
  const [matchs, pronostics, badgesBruts, communautes, ligues, activite] = await Promise.all([
    api.listerMatchs({ jeu: null, statut: 'a_venir', equipe: null }).catch(() => []),
    connecte ? economie.mesPronosticsClasses().catch(() => []) : Promise.resolve([]),
    connecte ? api.mesBadges().catch(() => null) : Promise.resolve(null),
    api.classementCommunautes().catch(() => []),
    connecte ? api.mesLigues().catch(() => []) : Promise.resolve([]),
    connecte ? api.activiteAmis().catch(() => []) : Promise.resolve([]),
  ]);

  const badges = badgesBruts
    ? { ...badgesBruts, badges: evaluerBadgesV2(badgesBruts.recap ?? {}) }
    : null;
  const hero = [...matchs].sort((a, b) => new Date(a.debut) - new Date(b.debut))[0] ?? null;
  const projection = hero ? await economie.projectionMatchFrags(hero.id).catch(() => null) : null;
  const monProno = hero ? pronostics.find((p) => p.match_id === hero.id) ?? null : null;

  racine.innerHTML = `
    ${bandeauSaison()}
    ${intro(badges)}
    ${heroMatch(hero, projection, monProno)}
    ${objectifs(pronostics, ligues)}
    <div class="hub-split">${apercuCommunaute(communautes)}${apercuRoom(badges)}</div>
    ${flux(activite)}
  `;
}

function intro(badges) {
  const u = contexte.utilisateur;
  if (!u) {
    return `<section class="hub-intro hub-intro--invite"><div><span class="sur-titre">Clutch Hub</span><h1>Ton prochain move est ici.</h1><p>Pronostique, progresse, rejoins ta faction et construis ce que ton profil raconte de toi.</p></div><a class="btn" href="#/connexion">Créer mon profil</a></section>`;
  }

  const detail = xpDetailleeV2({ badges: badges?.badges ?? [], recap: badges?.recap ?? {} });
  const niv = progressionNiveau(detail.total);
  const serie = Number(badges?.recap?.serie_jours_actifs_max ?? 0);
  const pseudo = u.pseudo || u.email?.split('@')[0] || 'joueur';
  const rating = contexte.frags?.frags ?? 1000;

  return `<section class="hub-intro">
    <div class="hub-intro__salut"><span class="sur-titre">Clutch Hub</span><h1>Salut ${esc(pseudo)}.</h1><p>Voilà ce qui mérite ton attention aujourd'hui.</p></div>
    <div class="hub-career" aria-label="Progression du joueur">
      <div class="hub-career__ligne"><span><strong>Niv. ${niv.niveau}</strong> · ${esc(niv.titre)}</span><span>${esc(formaterFrags(niv.xp))} XP</span></div>
      <div class="hub-career__jauge"><i style="width:${Math.max(2, Math.round(niv.part * 100))}%"></i></div>
      <div class="hub-career__meta"><span>🔥 ${serie} jour${serie > 1 ? 's' : ''} actif${serie > 1 ? 's' : ''}</span><span>${jeton(16)} ${esc(formaterFrags(rating))} Frags</span></div>
    </div>
  </section>`;
}

function heroMatch(match, projection, monProno) {
  if (!match) {
    return `<section class="hub-hero hub-hero--vide"><div><span class="sur-titre">Prochain match</span><h2>Le calme avant la prochaine affiche.</h2><p>Aucun match n'est encore programmé. Profite-en pour regarder ta faction ou tes ligues.</p></div><a class="btn btn--fantome" href="#/ligues">Voir mes ligues</a></section>`;
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
    <div class="hub-duel">${camp(match.equipe_a, match.tag_a, match.elo_a)}<div class="hub-duel__centre"><span>BO${esc(String(match.format))}</span><strong>VS</strong>${favoriNom && probaFavori !== null ? `<small>${esc(favoriNom)} · ${probaFavori}% favori</small>` : '<small>Choisis ton camp</small>'}</div>${camp(match.equipe_b, match.tag_b, match.elo_b, true)}</div>
    <div class="hub-hero__bottom">${resumeProno(match, monProno)}<a class="hub-cta" href="#/matchs/${encodeURIComponent(match.id)}"><span>${monProno ? 'Voir mon pronostic' : 'Faire mon pronostic'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a></div>
  </section>`;
}

function camp(nom, tag, elo, droite = false) {
  return `<div class="hub-team${droite ? ' hub-team--right' : ''}">${ecusson(tag, nom)}<div class="hub-team__txt"><strong>${esc(nom)}</strong><span>${esc(tag)} · Elo ${esc(String(elo))}</span></div></div>`;
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
  return `<section class="hub-missions"><div class="hub-section-label"><span class="sur-titre">Aujourd'hui</span><span>${missions.filter((m) => m.fait).length} / ${missions.length} bouclé${missions.filter((m) => m.fait).length > 1 ? 's' : ''}</span></div><div class="hub-missions__rail">${missions.map(mission).join('')}</div></section>`;
}

function mission(m) { return `<a class="hub-mission${m.fait ? ' hub-mission--done' : ''}" href="${m.href}"><span class="hub-mission__check">${m.fait ? '✓' : ''}</span><span><strong>${esc(m.nom)}</strong><small>${esc(m.detail)}</small></span></a>`; }
function estAujourdhui(date) { if (!date) return false; const d = new Date(date); const n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); }

function apercuCommunaute(communautes) {
  if (!communautes.length) return `<section class="hub-faction hub-panel"><span class="sur-titre">Communauté</span><h2>La première faction attend ses membres.</h2><p>Choisis ton équipe favorite : c'est elle qui devient ta faction dans Clutch.</p><a class="hub-link" href="#/parametres">Choisir mon équipe →</a></section>`;
  const mienne = communautes.find((c) => c.moi) ?? null;
  const c = mienne ?? communautes[0]; const p = palierCommunaute(c.membres); const teinte = teinteEquipe(c.tag, c.nom); const progression = Math.round(p.progression * 100);
  return `<section class="hub-faction hub-panel" style="--faction:${esc(teinte)}"><div class="hub-panel__heading"><div><span class="sur-titre">${mienne ? 'Ma faction' : 'Faction en tête'}</span><h2>${esc(c.nom)}</h2></div><span class="hub-rank">#${communautes.indexOf(c) + 1}</span></div><div class="hub-faction__body"><div class="hub-faction__relic">${bombonne(p, { teinte })}</div><div class="hub-faction__copy"><strong>${esc(formaterFrags(c.membres))} supporter${c.membres > 1 ? 's' : ''}</strong><span>${p.max ? `${esc(p.nom)} · palier maximum` : `En route vers ${esc(p.nom)} · ${progression}%`}</span><div class="hub-faction__bar"><i style="width:${Math.max(3, progression)}%"></i></div><small>${p.max ? 'La relique a atteint sa forme finale.' : `Encore ${esc(formaterFrags(p.restant))} avant la prochaine mutation.`}</small></div></div><a class="hub-link" href="#/communaute">Entrer dans la communauté →</a></section>`;
}

function apercuRoom(badges) {
  const obtenus = (badges?.badges ?? []).filter((b) => b.obtenu); const dernier = obtenus[obtenus.length - 1] ?? null;
  return `<section class="hub-room hub-panel"><div class="hub-panel__heading"><div><span class="sur-titre">Clutch Room</span><h2>Ton espace, pas ton inventaire.</h2></div><span class="hub-room__tag">3D</span></div><div class="hub-room__scene" aria-hidden="true"><div class="hub-room__wall"></div><div class="hub-room__screen"><i></i></div><div class="hub-room__desk"></div><div class="hub-room__pc"></div><div class="hub-room__shelf"><i></i><i></i><i></i></div><div class="hub-room__glow"></div></div><p>${dernier ? `Dernier trophée prêt à être exposé : <strong>${esc(dernier.nom)}</strong>.` : 'Tes trophées, objets et récompenses finiront ici — visibles, pas rangés dans une liste.'}</p><span class="hub-room__soon">Prototype 3D à brancher à l'application</span></section>`;
}

function flux(activite) {
  if (!contexte.utilisateur || !activite?.length) return '';
  return `<section class="hub-feed"><div class="hub-section-label"><span class="sur-titre">Ça bouge autour de toi</span><a href="#/ligues">Voir les amis</a></div><div class="hub-feed__list">${activite.slice(0, 4).map((e) => `<div class="hub-feed__item"><span class="hub-feed__avatar">${esc(initiales(e.pseudo))}</span><p><strong>${esc(e.pseudo)}</strong> a joué ${esc(e.libelle_choix ?? e.choix)} sur ${esc(e.equipe_a)} – ${esc(e.equipe_b)} et ${e.statut === 'gagne' ? '<b class="positif">a eu raison</b>' : '<b class="negatif">s’est raté</b>'}.</p><time>${esc(quand(e.quand))}</time></div>`).join('')}</div></section>`;
}

function initiales(nom) { const mots = String(nom || '?').trim().split(/[\s._-]+/).filter(Boolean); if (!mots.length) return '?'; if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase(); return (mots[0][0] + mots[1][0]).toUpperCase(); }
