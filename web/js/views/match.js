/** Match Center — pronostic classé Economy V2, sans mise. */
import * as api from '../api.js';
import * as economie from '../economy-api.js';
import { projectionFrags } from '../economy.js';
import { contexte } from '../app.js';
import { esc, quand, dateLisible, nomJeu, toast, surClic, frags, ecusson } from '../ui.js';

export async function vueMatch(racine, id) {
  const m = await api.lireMatch(id);
  if (!m) {
    racine.innerHTML = `<div class="vide"><h3>Match introuvable</h3><p><a href="#/matchs">Retour aux matchs</a></p></div>`;
    return;
  }

  const saisonMatch = contexte.saisons.find((s) => s.id === m.saison_id) ?? contexte.saison;
  const saisonOuverte = saisonMatch?.statut === 'en_cours';
  const ouvert = saisonOuverte && m.statut === 'a_venir' && new Date(m.debut) > new Date();
  const projection = m.statut === 'termine' ? null : await economie.projectionMatchFrags(m.id).catch(() => null);
  const mesPronostics = contexte.utilisateur
    ? (await economie.mesPronosticsClasses(m.saison_id).catch(() => [])).filter((p) => p.match_id === m.id)
    : [];
  const monProno = mesPronostics[0] ?? null;

  racine.innerHTML = `
    <section class="match-center" data-jeu="${esc(m.jeu)}">
      <a class="match-center__back" href="#/matchs">← Retour à la Match Arena</a>
      ${heroMatchCenter(m, projection)}
      <div class="match-center__layout">
        <main class="match-center__main">
          ${monProno ? blocMesPronostics(m, [monProno]) : ''}
          ${zonePronostic({ m, projection, ouvert, saisonOuverte, saisonMatch, monProno })}
        </main>
        <aside class="match-center__side">
          <div class="match-ticket-shell" id="match-ticket">${ticketInitial(m, ouvert, monProno)}</div>
          ${blocRepere(m, projection)}
        </aside>
      </div>
    </section>`;

  if (!ouvert || monProno || !projection) return;
  surClic(racine, '[data-prono-choice]', (btn) => {
    racine.querySelectorAll('[data-prono-choice].is-selected').forEach((el) => el.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    ouvrirTicket(racine, m, projection, btn);
  });
}

function heroMatchCenter(m, projection) {
  const pA = Math.round(Number(projection?.choix?.find((c) => c.cle === 'a')?.proba ?? 0.5) * 100);
  const pB = Math.round(Number(projection?.choix?.find((c) => c.cle === 'b')?.proba ?? 0.5) * 100);
  const termine = m.statut === 'termine';
  const live = !termine && new Date(m.debut).getTime() <= Date.now();
  const gagnantA = termine && Number(m.score_a) > Number(m.score_b);
  const gagnantB = termine && Number(m.score_b) > Number(m.score_a);

  return `
    <section class="match-center__hero">
      <div class="match-center__hero-glow" aria-hidden="true"></div>
      <div class="match-center__meta">
        <span class="arena-game-dot"></span><strong>${esc(nomJeu(m.jeu))}</strong><i></i>
        <span>${esc(m.evenement)}</span><i></i><span>BO${esc(String(m.format))}</span>
        <span class="match-center__date${live ? ' is-live' : ''}">${live ? '● LIVE' : esc(dateLisible(m.debut))}</span>
      </div>
      <div class="match-center__duel">
        <div class="match-center__team${gagnantA ? ' gagnant' : ''}">
          ${ecusson(m.tag_a, m.equipe_a)}<span>${esc(m.tag_a)}</span><strong>${esc(m.equipe_a)}</strong>
          ${termine ? `<b class="match-center__score">${esc(String(m.score_a))}</b>` : ''}
        </div>
        <div class="match-center__versus"><span>BO${esc(String(m.format))}</span><strong>${termine ? 'FINAL' : 'VS'}</strong><small>${termine ? 'Match terminé' : esc(quand(m.debut))}</small></div>
        <div class="match-center__team match-center__team--right${gagnantB ? ' gagnant' : ''}">
          ${ecusson(m.tag_b, m.equipe_b)}<span>${esc(m.tag_b)}</span><strong>${esc(m.equipe_b)}</strong>
          ${termine ? `<b class="match-center__score">${esc(String(m.score_b))}</b>` : ''}
        </div>
      </div>
      ${termine || !projection ? '' : `
        <div class="match-center__probability" role="img" aria-label="${pA} % pour ${esc(m.equipe_a)}, ${pB} % pour ${esc(m.equipe_b)}">
          <span><strong>${pA}%</strong> ${esc(m.tag_a)}</span><i><b style="width:${pA}%"></b></i><span>${esc(m.tag_b)} <strong>${pB}%</strong></span>
        </div>`}
    </section>`;
}

function zonePronostic({ m, projection, ouvert, saisonOuverte, saisonMatch, monProno }) {
  if (m.statut === 'termine') return fermeture('Terminé', 'Le verdict est tombé.', 'Ton delta Frags est figé dans ton historique.');
  if (!saisonOuverte) return fermeture('Pronostics fermés', "Cette saison n'est plus active.", `Ce match appartient à ${esc(saisonMatch?.nom ?? 'une autre saison')}.`);
  if (!ouvert) return fermeture('Match en cours', 'Les choix sont verrouillés.', 'Après le coup d’envoi, aucun nouveau pronostic classé n’est accepté.');
  if (monProno) return fermeture('Pronostic verrouillé', 'Ton choix est enregistré.', 'Tu ne peux poser qu’un seul pronostic classé par match.');
  if (!projection) return fermeture('Pronostic indisponible', 'Le modèle arrive bientôt.', 'La probabilité figée du match n’est pas encore disponible.');

  const a = projection.choix.find((c) => c.cle === 'a');
  const b = projection.choix.find((c) => c.cle === 'b');
  return `
    <section class="match-markets">
      <div class="match-markets__heading">
        <div><span class="sur-titre">Pronostic classé</span><h2>Qui remporte le match ?</h2></div>
        <span>Aucune mise · rating uniquement</span>
      </div>
      <section class="match-market match-market--main">
        <header><div><h3>Vainqueur</h3><p>Le risque est calculé à partir de la probabilité figée avant ton choix.</p></div><span>${projection.placements_restants > 0 ? 'Placement' : 'Classé'}</span></header>
        <div class="match-market__choices">
          ${choixClasse('a', m.equipe_a, a)}${choixClasse('b', m.equipe_b, b)}
        </div>
      </section>
      <div class="encart" style="margin-top:16px">Correct : plus de Frags. Faux : moins de Frags. <strong>Aucun Frag n’est jamais engagé ni dépensé.</strong></div>
    </section>`;
}

function fermeture(surtitre, titre, texte) {
  return `<section class="match-closed"><span class="sur-titre">${esc(surtitre)}</span><h2>${esc(titre)}</h2><p>${texte}</p></section>`;
}

function choixClasse(cle, libelle, p) {
  if (!p) return '';
  const confiance = Math.round(Number(p.proba) * 100);
  return `<button class="match-choice" data-prono-choice="1" data-choix="${cle}" data-libelle="${esc(libelle)}" type="button">
    <span class="match-choice__label">${esc(libelle)}</span><strong>${confiance}%</strong>
    <small><b class="positif">+${Math.abs(p.gain)}</b> si correct · <b class="negatif">−${Math.abs(p.perte)}</b> si faux</small>
  </button>`;
}

function ticketInitial(m, ouvert, p) {
  if (p) {
    const libelle = libelleChoix(m, p.choix);
    const risque = projectionFrags(p.proba_scoring, { k: p.k_frags });
    return `<div class="match-ticket match-ticket--locked"><span class="sur-titre">Ton pronostic classé</span><span class="match-ticket__lock">✓</span><strong>${esc(libelle)}</strong>
      <div class="ranked-risk"><span><small>Si correct</small><strong class="positif">+${Math.abs(risque.gain)} 💥</strong></span><span><small>Si faux</small><strong class="negatif">−${Math.abs(risque.perte)} 💥</strong></span></div>
      <small>${p.k_frags === 60 ? 'Placement en cours' : 'Rating établi'} · aucun Frag engagé.</small></div>`;
  }
  if (!ouvert) return '<div class="match-ticket match-ticket--idle"><span class="sur-titre">Pronostic</span><strong>Choix verrouillés</strong><p>Le Match Center reste consultable.</p></div>';
  return '<div class="match-ticket match-ticket--idle"><span class="sur-titre">Ton pronostic</span><div class="match-ticket__target">+</div><strong>Choisis une équipe.</strong><p>Le risque +/− Frags apparaîtra ici avant validation.</p></div>';
}

function ouvrirTicket(racine, m, projection, btn) {
  const zone = racine.querySelector('#match-ticket');
  const choix = btn.dataset.choix;
  const libelle = btn.dataset.libelle;
  const p = projection.choix.find((c) => c.cle === choix);
  if (!p) return;

  if (!contexte.utilisateur) {
    zone.innerHTML = `<div class="match-ticket match-ticket--login"><span class="sur-titre">${esc(libelle)}</span><strong>Crée ton profil pour jouer.</strong><p>Ton rating démarre à 1000 Frags.</p><a class="btn" href="#/connexion">Créer mon profil</a></div>`;
    scrollTicket(zone); return;
  }

  zone.innerHTML = `<div class="match-ticket match-ticket--active"><span class="sur-titre">Pronostic classé</span><div class="match-ticket__selected"><small>${esc(m.equipe_a)} vs ${esc(m.equipe_b)}</small><strong>${esc(libelle)}</strong></div>
    <div class="ranked-risk"><span><small>Si correct</small><strong class="positif">+${Math.abs(p.gain)} 💥</strong></span><span><small>Si faux</small><strong class="negatif">−${Math.abs(p.perte)} 💥</strong></span></div>
    <small class="match-ticket__balance">${projection.placements_restants > 0 ? `${projection.placements_restants} placement(s) restant(s)` : 'Rating établi'} · K=${projection.k}</small>
    <button class="match-ticket__confirm" id="match-valider" type="button">Verrouiller mon pronostic</button></div>`;

  zone.querySelector('#match-valider')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await economie.placerPronosticClasse({ matchId: m.id, choix });
      toast(`Pronostic classé verrouillé : ${libelle}`, 'succes');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur'); e.currentTarget.disabled = false;
    }
  });
  scrollTicket(zone);
}

function blocMesPronostics(m, pronostics) {
  return `<section class="match-my-picks" id="mes-pronostics"><div class="match-my-picks__heading"><div><span class="sur-titre">Déjà posé</span><h2>Ton pronostic</h2></div></div><div class="match-my-picks__list">${pronostics.map((p) => lignePronostic(m, p)).join('')}</div></section>`;
}

function lignePronostic(m, p) {
  const delta = p.delta_frags;
  return `<div class="match-my-pick"><div><span>Vainqueur</span><strong>${esc(libelleChoix(m, p.choix))}</strong></div><div><span>${Math.round(Number(p.proba_figee) * 100)}% modèle</span><small>K=${p.k_frags}</small></div>${badgePronostic(p, delta)}</div>`;
}

function badgePronostic(p, delta = p.delta_frags) {
  if (p.statut === 'gagne') return `<span class="match-pick-status match-pick-status--win">+${esc(frags(Math.abs(delta ?? 0)))}</span>`;
  if (p.statut === 'perdu') return `<span class="match-pick-status match-pick-status--loss">−${esc(frags(Math.abs(delta ?? 0)))}</span>`;
  return '<span class="match-pick-status">En cours</span>';
}

// Nom historique conservé pour les imports existants du Profil.
export function badgePari(p) {
  if (p.statut === 'gagne') return `<span class="badge badge--gagne">+${esc(frags(Math.abs(p.delta_frags ?? p.gain ?? 0)))}</span>`;
  if (p.statut === 'perdu') return `<span class="badge badge--perdu">−${esc(frags(Math.abs(p.delta_frags ?? 0)))}</span>`;
  return '<span class="badge badge--attente">En cours</span>';
}

function blocRepere(m, projection) {
  if (!projection?.choix?.length) return '';
  const favori = [...projection.choix].sort((a, b) => Number(b.proba) - Number(a.proba))[0];
  return `<div class="match-insight"><span class="sur-titre">Repère</span><strong>${esc(libelleChoix(m, favori.cle))} part favori.</strong><p>${Math.round(Number(favori.proba) * 100)}% selon le snapshot du modèle.</p><small>Cette probabilité est figée pour tous les joueurs.</small></div>`;
}

function libelleChoix(m, choix) { return choix === 'a' ? m.equipe_a : m.equipe_b; }
function scrollTicket(zone) { if (window.matchMedia('(max-width: 760px)').matches) zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
