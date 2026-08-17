/**
 * Economy V2 — garde-fou du Match Center détaillé.
 *
 * Le Match Center legacy sait encore afficher plusieurs marchés et un champ de
 * mise. Cette couche capture ces clics AVANT son handler :
 *   - vainqueur du match -> pronostic classé V2, sans mise ;
 *   - autres marchés -> aucune mise de Frags, futur mode Casual/XP.
 */
import * as api from './api.js';
import * as economyApi from './economy-api.js';
import { MODE_DEMO } from './config.js';
import { esc, toast } from './ui.js';

function matchIdCourant() {
  const m = location.hash.match(/^#\/matchs\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function verrouillerVainqueur(racine, choix) {
  racine.querySelectorAll('[data-prono-choice][data-marche="vainqueur"]').forEach((btn) => {
    btn.disabled = true;
    btn.classList.add('economy-v2-choice-locked');
    if (btn.dataset.choix === choix) btn.classList.add('is-selected', 'economy-v2-choice-picked');
    btn.removeAttribute('data-prono-choice');
  });
}

function afficherCasual(zone, libelle) {
  zone.innerHTML = `
    <div class="match-ticket match-ticket--idle economy-v2-match-ticket">
      <span class="sur-titre">Mode Casual</span>
      <strong>${esc(libelle)}</strong>
      <p>Ce marché ne modifiera pas ton classement. Les marchés secondaires seront branchés plus tard sur XP / missions, jamais sur une mise de Frags.</p>
      <small>💥 Les Frags sont réservés au classement.</small>
    </div>`;
}

async function ouvrirVainqueur(racine, btn) {
  const zone = racine.querySelector('#match-ticket');
  const matchId = matchIdCourant();
  if (!zone || !matchId) return;

  const libelle = btn.dataset.libelle || '';
  const choix = btn.dataset.choix || '';
  const utilisateur = await api.utilisateurCourant().catch(() => null);
  if (!utilisateur) {
    zone.innerHTML = `
      <div class="match-ticket match-ticket--login economy-v2-match-ticket">
        <span class="sur-titre">Pronostic classé</span>
        <strong>${esc(libelle)}</strong>
        <p>Crée ton profil pour entrer dans le classement.</p>
        <a class="btn" href="#/connexion">Créer mon profil</a>
      </div>`;
    return;
  }

  zone.innerHTML = '<div class="economy-v2-loading"><span class="spinner"></span><span>Calcul du risque classé…</span></div>';
  try {
    const projection = await economyApi.projectionMatchFrags(matchId);
    const detail = projection?.choix?.find?.((x) => x.cle === choix);
    if (!detail) throw new Error('Projection de classement indisponible.');

    const gain = Math.abs(Number(detail.gain || 0));
    const perte = Math.abs(Number(detail.perte || 0));
    const proba = Math.round(Number(detail.proba || 0) * 100);
    const placement = Number(projection.k) > 40;

    zone.innerHTML = `
      <div class="match-ticket economy-v2-match-ticket">
        <span class="sur-titre">Pronostic classé</span>
        <strong>${esc(libelle)}</strong>
        <p>Probabilité Clutch figée : <b>${esc(String(proba))} %</b></p>
        <div class="economy-v2-risk economy-v2-risk--vertical">
          <div class="economy-v2-risk__case economy-v2-risk__case--win"><span>Si correct</span><strong>+${esc(String(gain))} 💥</strong></div>
          <div class="economy-v2-risk__divider">/</div>
          <div class="economy-v2-risk__case economy-v2-risk__case--loss"><span>Si faux</span><strong>−${esc(String(perte))} 💥</strong></div>
        </div>
        <small>${placement ? `Placement · K=${esc(String(projection.k))}` : `Classé · K=${esc(String(projection.k))}`} · aucun Frag dépensé</small>
        <button class="btn" data-economy-center-confirm type="button">Verrouiller ce pronostic</button>
      </div>`;

    const confirmer = zone.querySelector('[data-economy-center-confirm]');
    confirmer.addEventListener('click', async () => {
      confirmer.disabled = true;
      try {
        const cree = await economyApi.placerPronosticClasse({ matchId, choix });
        verrouillerVainqueur(racine, choix);
        zone.innerHTML = `
          <div class="match-ticket match-ticket--locked economy-v2-match-ticket">
            <span class="sur-titre">Pronostic classé</span>
            <span class="match-ticket__lock">✓</span>
            <strong>${esc(libelle)}</strong>
            <p>+${esc(String(Math.abs(Number(cree.gain_si_correct))))} 💥 si correct · −${esc(String(Math.abs(Number(cree.perte_si_faux))))} 💥 si faux</p>
            <small>Aucun Frag n'a été dépensé. Le rating bougera uniquement au résultat.</small>
          </div>`;
        toast(`Pronostic classé validé : ${libelle}`, 'succes');
      } catch (e) {
        toast(e.message, 'erreur');
        confirmer.disabled = false;
      }
    });
  } catch (e) {
    zone.innerHTML = `<div class="match-ticket match-ticket--idle economy-v2-match-ticket"><span class="sur-titre">Classement indisponible</span><strong>${esc(libelle)}</strong><p>${esc(e.message)}</p></div>`;
  }
}

async function hydrater() {
  if (MODE_DEMO || !/^#\/matchs\/.+/.test(location.hash)) return;
  const racine = document.querySelector('.match-center');
  if (!racine || racine.dataset.economyV2Hydrated === '1') return;
  racine.dataset.economyV2Hydrated = '1';

  racine.querySelectorAll('[data-prono-choice] small').forEach((x) => x.remove());
  const legende = racine.querySelector('.match-markets__heading > span');
  if (legende) legende.textContent = 'Vainqueur = classé · marchés secondaires = Casual bientôt';

  const utilisateur = await api.utilisateurCourant().catch(() => null);
  if (!utilisateur) return;
  const saison = await api.saisonCourante().catch(() => null);
  if (!saison?.id) return;
  const pronos = await economyApi.mesPronosticsClasses(saison.id).catch(() => []);
  const prono = pronos.find((x) => x.match_id === matchIdCourant() && x.statut !== 'annule');
  if (!prono) return;

  verrouillerVainqueur(racine, prono.choix);
  const zone = racine.querySelector('#match-ticket');
  if (zone) {
    const libelle = prono.choix === 'a' ? prono.equipe_a : prono.equipe_b;
    zone.innerHTML = `
      <div class="match-ticket match-ticket--locked economy-v2-match-ticket">
        <span class="sur-titre">Pronostic classé</span>
        <span class="match-ticket__lock">✓</span>
        <strong>${esc(libelle || 'Ton choix')}</strong>
        <p>${prono.statut === 'en_cours' ? 'En attente du résultat.' : `${Number(prono.delta_frags) >= 0 ? '+' : ''}${esc(String(prono.delta_frags))} 💥`}</p>
        <small>Les Frags ne sont jamais dépensés.</small>
      </div>`;
  }
}

if (!MODE_DEMO) {
  document.addEventListener('click', (event) => {
    const btn = event.target.closest?.('.match-center [data-prono-choice]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const racine = btn.closest('.match-center');
    const zone = racine?.querySelector('#match-ticket');
    if (!racine || !zone) return;

    racine.querySelectorAll('[data-prono-choice].is-selected').forEach((x) => x.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    if (btn.dataset.marche !== 'vainqueur') afficherCasual(zone, btn.dataset.libelle || 'Marché secondaire');
    else ouvrirVainqueur(racine, btn);
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(hydrater));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => setTimeout(hydrater, 0));
  hydrater();
}
