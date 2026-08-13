import * as api from '../api.js';
import { contexte, majSolde, bandeauSaison } from '../app.js';
import { esc, frags, dateLisible, nomJeu, toast, vide, surClic } from '../ui.js';
import { CALL_MISE_MIN, CALL_MISE_MAX } from '../core.js';

/**
 * Le call de la saison.
 *
 * Un seul pronostic par saison, posé avant que le tournoi visé ne commence, et
 * affiché sur le profil jusqu'à la finale. C'est le pari qui garde en vie un
 * joueur mal parti — et la phrase qu'il pourra ressortir en avril.
 */
export async function vueCall(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil pour poser ton call de la saison.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const [call, evenements] = await Promise.all([api.monCall(), api.listerEvenementsSaison()]);

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Le call de la saison</h1>
        <p>${esc(contexte.saison?.nom ?? '')} — un seul pronostic, posé avant le tournoi, affiché jusqu'à la fin.</p>
      </div>
    </div>
    ${bandeauSaison()}
    <div id="zone-call"></div>`;

  const zone = racine.querySelector('#zone-call');

  if (call) {
    zone.innerHTML = carteCallPose(call) + `
      <p style="color:var(--texte-faible);font-size:0.85rem;margin-top:16px">
        Un call par saison, et il ne se reprend pas. Rendez-vous à la finale.
      </p>`;
    return;
  }

  const ouverts = evenements.filter((e) => e.statut === 'ouvert');
  if (!ouverts.length) {
    zone.innerHTML = vide(
      'Aucun tournoi ouvert',
      "Tous les tournois de cette saison ont déjà commencé : le call se pose avant le premier match. Reviens à l'ouverture du prochain.",
      '<a class="btn btn--fantome" href="#/matchs">Voir les matchs</a>'
    );
    return;
  }

  let evenementActif = ouverts[0].id;
  let equipeActive = null;

  const dessiner = async () => {
    const ev = ouverts.find((e) => e.id === evenementActif);
    const cotes = await api.cotesEvenement(evenementActif);

    zone.innerHTML = `
      <div class="encart" style="margin-bottom:20px">
        Ta mise est bloquée jusqu'au sacre. Si ton équipe gagne le tournoi, tu récupères
        la mise multipliée par la cote ; sinon elle est perdue. Entre
        ${CALL_MISE_MIN} et ${CALL_MISE_MAX} Frags.
      </div>

      <h2>1. Le tournoi</h2>
      <div class="filtres" id="filtres-evenement">
        ${ouverts
          .map(
            (e) => `<button class="puce${e.id === evenementActif ? ' actif' : ''}" data-evenement="${esc(e.id)}">
              ${esc(e.nom)}
            </button>`
          )
          .join('')}
      </div>
      <p style="color:var(--texte-faible);font-size:0.85rem">
        ${esc(nomJeu(ev.jeu))} · ${ev.nb_equipes ?? ev.nb_equipes_brut ?? '?'} équipes ·
        premier match le ${esc(dateLisible(ev.debut))}
      </p>

      <h2 style="margin-top:24px">2. Le vainqueur</h2>
      <div class="grille grille--3" id="grille-equipes">
        ${cotes
          .map(
            (c) => `<button class="carte-call${c.id === equipeActive ? ' carte-call--actif' : ''}" data-equipe="${esc(c.id)}">
              <span class="carte-call__nom">${esc(c.nom)}</span>
              <span class="carte-call__cote">${Number(c.cote).toFixed(2)}</span>
              <span class="carte-call__proba">${Math.round(c.proba * 100)} % selon les Elo</span>
            </button>`
          )
          .join('')}
      </div>

      <h2 style="margin-top:24px">3. La mise</h2>
      <div class="carte">
        <label class="champ">
          <span class="champ__libelle">Frags engagés (solde : ${esc(frags(contexte.utilisateur.solde))})</span>
          <input type="number" id="mise" min="${CALL_MISE_MIN}" max="${CALL_MISE_MAX}" step="10" value="${CALL_MISE_MIN * 2}" />
        </label>
        <div id="apercu" style="color:var(--texte-doux);font-size:0.9rem;margin-bottom:14px"></div>
        <button class="btn btn--large" id="poser" ${equipeActive ? '' : 'disabled'}>
          ${equipeActive ? 'Poser mon call' : "Choisis d'abord une équipe"}
        </button>
      </div>`;

    const apercu = () => {
      const choisie = cotes.find((c) => c.id === equipeActive);
      const mise = Number(zone.querySelector('#mise').value);
      zone.querySelector('#apercu').innerHTML = choisie
        ? `Si <strong>${esc(choisie.nom)}</strong> gagne ${esc(ev.nom)}, tu encaisses
           <strong style="color:var(--accent)">${esc(frags(Math.round(mise * choisie.cote)))}</strong>.`
        : 'Choisis une équipe pour voir le gain potentiel.';
    };
    apercu();
    zone.querySelector('#mise').addEventListener('input', apercu);

    zone.querySelector('#poser').addEventListener('click', async (e) => {
      const mise = Number(zone.querySelector('#mise').value);
      e.currentTarget.disabled = true;
      try {
        await api.placerCall({ eventId: evenementActif, equipeId: equipeActive, mise });
        toast('Call posé. Plus qu’à attendre la finale.', 'succes');
        await majSolde();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(err.message, 'erreur');
        e.currentTarget.disabled = false;
      }
    });
  };

  await dessiner();

  surClic(zone, '[data-evenement]', async (btn) => {
    evenementActif = btn.dataset.evenement;
    equipeActive = null;
    await dessiner();
  });
  surClic(zone, '[data-equipe]', async (btn) => {
    equipeActive = btn.dataset.equipe;
    await dessiner();
  });
}

/** Carte affichée une fois le call posé — réutilisée par le profil. */
export function carteCallPose(call) {
  const etat =
    call.statut === 'gagne'
      ? `<span class="badge badge--gagne">Réussi · +${esc(frags(call.gain))}</span>`
      : call.statut === 'perdu'
        ? '<span class="badge badge--perdu">Manqué</span>'
        : '<span class="badge badge--attente">En attente du sacre</span>';

  return `
    <div class="carte carte-call-pose">
      <div class="carte-call-pose__haut">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(call.jeu ?? '')}"></span>
          <span>${esc(call.evenement)}</span>
        </span>
        ${etat}
      </div>
      <p class="carte-call-pose__phrase">
        « <strong>${esc(call.equipe)}</strong> gagne ${esc(call.evenement)}. »
      </p>
      <div class="carte-call-pose__chiffres">
        <span><strong>${esc(frags(call.mise))}</strong> engagés</span>
        <span>cote <strong>${Number(call.cote).toFixed(2)}</strong></span>
        <span>${call.statut === 'en_cours' ? 'gain potentiel' : 'valait'}
          <strong style="color:var(--accent)">${esc(frags(call.gain_potentiel ?? Math.round(call.mise * call.cote)))}</strong>
        </span>
      </div>
    </div>`;
}
