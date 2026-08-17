/**
 * Pont temporaire entre Match Arena legacy et Economy V2.
 *
 * Il intercepte uniquement les clics sur les deux camps du match héros.
 * L'ancien formulaire de mise ne s'ouvre plus : on affiche le risque de rating
 * puis on appelle `placer_pronostic_classe` sans aucun montant à engager.
 *
 * Cette couche pourra disparaître quand matchs.js sera entièrement migré vers
 * les RPC V2 ; elle permet aujourd'hui de tester la nouvelle économie sans
 * casser les autres vues qui utilisent encore le backend historique.
 */
import * as api from './api.js';
import * as economyApi from './economy-api.js';
import { MODE_DEMO } from './config.js';
import { esc, toast } from './ui.js';

let hydrationEnCours = false;
let dernierMatchHydrate = null;

function idMatchDepuisHero(hero) {
  const href = hero?.querySelector('.arena-details')?.getAttribute('href') || '';
  const match = href.match(/^#\/matchs\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function choixProjection(projection, cle) {
  return projection?.choix?.find?.((x) => x.cle === cle) ?? null;
}

function verrouillerHero(hero, choix) {
  if (!hero) return;
  hero.querySelectorAll('[data-arena-choix]').forEach((btn) => {
    btn.disabled = true;
    btn.classList.add('arena-team--locked');
    btn.removeAttribute('data-arena-choix');
    if (btn.dataset.cle === choix) btn.classList.add('is-selected', 'arena-team--ranked-pick');
  });
}

function ticketConnexion(dock, libelle) {
  dock.innerHTML = `
    <div class="arena-ticket arena-ticket--login economy-v2-ticket">
      <div>
        <span>Ton choix</span>
        <strong>${esc(libelle)}</strong>
        <small>Crée ton profil pour jouer en classement.</small>
      </div>
      <a class="btn" href="#/connexion">Créer mon profil</a>
    </div>`;
}

function ticketProjection({ dock, hero, matchId, cle, libelle, projection, detail }) {
  const gain = Math.abs(Number(detail.gain || 0));
  const perte = Math.abs(Number(detail.perte || 0));
  const proba = Math.round(Number(detail.proba || 0) * 100);
  const placements = Number(projection.placements_restants || 0);
  const placement = Number(projection.k) > 40;

  dock.innerHTML = `
    <div class="arena-ticket economy-v2-ticket">
      <div class="arena-ticket__pick">
        <span>Pronostic classé</span>
        <strong>${esc(libelle)}</strong>
        <small>Probabilité Clutch figée : ${esc(String(proba))} %</small>
      </div>

      <div class="economy-v2-risk" aria-label="Impact possible sur ton classement">
        <div class="economy-v2-risk__case economy-v2-risk__case--win">
          <span>Si tu as raison</span>
          <strong>+${esc(String(gain))} 💥</strong>
        </div>
        <div class="economy-v2-risk__divider">/</div>
        <div class="economy-v2-risk__case economy-v2-risk__case--loss">
          <span>Si tu te trompes</span>
          <strong>−${esc(String(perte))} 💥</strong>
        </div>
      </div>

      <div class="economy-v2-meta">
        <span>${placement ? `Placement · K=${esc(String(projection.k))}` : `Classé · K=${esc(String(projection.k))}`}</span>
        ${placement ? `<small>${esc(String(placements))} placement${placements > 1 ? 's' : ''} restant${placements > 1 ? 's' : ''}</small>` : '<small>Les Frags ne sont jamais dépensés.</small>'}
      </div>

      <button class="arena-ticket__confirm" data-economy-v2-confirm type="button">Verrouiller ce pronostic</button>
    </div>`;

  const confirmer = dock.querySelector('[data-economy-v2-confirm]');
  confirmer.addEventListener('click', async () => {
    confirmer.disabled = true;
    confirmer.textContent = 'Verrouillage…';
    try {
      const cree = await economyApi.placerPronosticClasse({ matchId, choix: cle });
      const gainFinal = Math.abs(Number(cree?.gain_si_correct ?? gain));
      const perteFinale = Math.abs(Number(cree?.perte_si_faux ?? perte));
      verrouillerHero(hero, cle);
      dock.innerHTML = `
        <div class="arena-lock economy-v2-lock">
          <span class="arena-lock__icon">✓</span>
          <div>
            <span>PRONOSTIC CLASSÉ VERROUILLÉ</span>
            <strong>${esc(libelle)}</strong>
            <small>+${esc(String(gainFinal))} 💥 si correct · −${esc(String(perteFinale))} 💥 si faux · aucun Frag dépensé</small>
          </div>
        </div>`;
      const hint = hero.querySelector('.arena-hero__hint');
      if (hint) hint.innerHTML = '<span class="arena-live-pulse"></span> Ton choix est verrouillé jusqu’au résultat du match.';
      toast(`Pronostic classé validé : ${libelle}`, 'succes');
    } catch (e) {
      toast(e.message, 'erreur');
      confirmer.disabled = false;
      confirmer.textContent = 'Verrouiller ce pronostic';
    }
  });
}

async function ouvrirTicketV2(btn) {
  const hero = btn.closest('.arena-hero');
  const dock = hero?.querySelector('#arena-dock');
  if (!hero || !dock) return;

  const matchId = idMatchDepuisHero(hero);
  if (!matchId) return;

  hero.querySelectorAll('.arena-team.is-selected').forEach((el) => el.classList.remove('is-selected'));
  btn.classList.add('is-selected');

  const cle = btn.dataset.cle || '';
  const libelle = btn.dataset.libelle || '';
  const utilisateur = await api.utilisateurCourant().catch(() => null);
  if (!utilisateur) {
    ticketConnexion(dock, libelle);
    return;
  }

  dock.innerHTML = '<div class="economy-v2-loading"><span class="spinner"></span><span>Calcul du risque classé…</span></div>';
  try {
    const projection = await economyApi.projectionMatchFrags(matchId);
    const detail = choixProjection(projection, cle);
    if (!detail) throw new Error('Projection de Frags indisponible pour ce choix.');
    ticketProjection({ dock, hero, matchId, cle, libelle, projection, detail });
  } catch (e) {
    dock.innerHTML = `<div class="arena-ticket arena-ticket--login economy-v2-ticket"><div><span>Classement indisponible</span><strong>${esc(libelle)}</strong><small>${esc(e.message)}</small></div></div>`;
  }
}

async function hydraterHero() {
  if (MODE_DEMO || hydrationEnCours) return;
  const hero = document.querySelector('.arena-hero');
  if (!hero) {
    dernierMatchHydrate = null;
    return;
  }

  const matchId = idMatchDepuisHero(hero);
  if (!matchId || matchId === dernierMatchHydrate) return;
  hydrationEnCours = true;
  dernierMatchHydrate = matchId;

  try {
    const utilisateur = await api.utilisateurCourant().catch(() => null);
    if (!utilisateur) return;
    const saison = await api.saisonCourante().catch(() => null);
    if (!saison?.id) return;
    const pronos = await economyApi.mesPronosticsClasses(saison.id);
    const prono = pronos.find((x) => x.match_id === matchId && x.statut !== 'annule');
    if (!prono) return;

    const btn = hero.querySelector(`[data-cle="${CSS.escape(prono.choix)}"]`);
    const libelle = btn?.dataset.libelle || (prono.choix === 'a' ? prono.equipe_a : prono.equipe_b) || 'Ton choix';
    verrouillerHero(hero, prono.choix);

    const hint = hero.querySelector('.arena-hero__hint');
    if (hint) hint.innerHTML = '<span class="arena-live-pulse"></span> Ton pronostic classé est déjà verrouillé sur cette affiche.';

    const dock = hero.querySelector('#arena-dock');
    if (dock && prono.statut === 'en_cours') {
      const gain = Math.abs(Math.round(Number(prono.k_frags) * (1 - Number(prono.proba_scoring))));
      const perte = Math.abs(Math.round(Number(prono.k_frags) * Number(prono.proba_scoring)));
      dock.innerHTML = `
        <div class="arena-lock economy-v2-lock economy-v2-lock--restored">
          <span class="arena-lock__icon">✓</span>
          <div><span>PRONOSTIC CLASSÉ</span><strong>${esc(libelle)}</strong><small>+${esc(String(gain))} 💥 / −${esc(String(perte))} 💥 au résultat</small></div>
        </div>`;
    }
  } catch (e) {
    console.warn('[Clutch Economy V2] hydratation impossible', e);
    dernierMatchHydrate = null;
  } finally {
    hydrationEnCours = false;
  }
}

if (!MODE_DEMO) {
  // Capture = ce handler passe avant le listener délégué de matchs.js et
  // empêche l'ancien dock « mise de Frags » de s'ouvrir.
  document.addEventListener('click', (event) => {
    const btn = event.target.closest?.('.arena-hero [data-arena-choix]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    ouvrirTicketV2(btn);
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(hydraterHero));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {
    dernierMatchHydrate = null;
    setTimeout(hydraterHero, 0);
  });
  hydraterHero();
}
