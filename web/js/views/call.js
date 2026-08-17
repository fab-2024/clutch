import * as api from '../api.js';
import * as economie from '../economy-api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, dateLisible, nomJeu, toast, vide, surClic } from '../ui.js';

/**
 * Le Call de la saison V2.
 *
 * Un seul choix de prestige par saison. Il ne coûte aucun Frag, ne rapporte
 * aucun Frag et n'altère jamais le rating. Un Call réussi nourrit uniquement
 * la carrière (XP / badge / vitrine).
 */
export async function vueCall(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil pour poser ton Call de la saison.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const [call, evenements] = await Promise.all([
    api.monCall().catch(() => null),
    api.listerEvenementsSaison().catch(() => []),
  ]);

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Le Call de la saison</h1>
        <p>${esc(contexte.saison?.nom ?? '')} — un tournoi, une équipe, un choix que tu assumes jusqu'au bout.</p>
      </div>
    </div>
    ${bandeauSaison()}
    <div class="encart" style="margin-bottom:20px">
      Le Call est une distinction de carrière : <strong>aucun Frag n'est engagé</strong> et le résultat
      ne modifie jamais ton rating. S'il tombe juste, il peut alimenter ton XP et tes badges.
    </div>
    <div id="zone-call"></div>`;

  const zone = racine.querySelector('#zone-call');
  if (call) {
    zone.innerHTML = carteCallPose(call) + `
      <p style="color:var(--texte-faible);font-size:0.85rem;margin-top:16px">
        Un seul Call par saison. Aucun rachat, aucun multiplicateur : seulement ton choix.
      </p>`;
    return;
  }

  const ouverts = evenements.filter((e) => e.statut === 'ouvert');
  if (!ouverts.length) {
    zone.innerHTML = vide(
      'Aucun tournoi ouvert',
      "Le Call doit être posé avant le premier match du tournoi. Reviens à l'ouverture du prochain.",
      '<a class="btn btn--fantome" href="#/matchs">Voir les matchs</a>'
    );
    return;
  }

  let evenementActif = ouverts[0].id;
  let equipeActive = null;

  const dessiner = async () => {
    const ev = ouverts.find((e) => e.id === evenementActif);
    const modeles = await api.cotesEvenement(evenementActif).catch(() => []);
    const choisie = modeles.find((c) => c.id === equipeActive) ?? null;

    zone.innerHTML = `
      <h2>1. Le tournoi</h2>
      <div class="filtres" id="filtres-evenement">
        ${ouverts.map((e) => `
          <button class="puce${e.id === evenementActif ? ' actif' : ''}" data-evenement="${esc(e.id)}">
            ${esc(e.nom)}
          </button>`).join('')}
      </div>
      <p style="color:var(--texte-faible);font-size:0.85rem">
        ${esc(nomJeu(ev.jeu))} · ${ev.nb_equipes ?? ev.nb_equipes_brut ?? '?'} équipes ·
        premier match le ${esc(dateLisible(ev.debut))}
      </p>

      <h2 style="margin-top:24px">2. Ton vainqueur</h2>
      <div class="grille grille--3" id="grille-equipes">
        ${modeles.map((c) => `
          <button class="carte-call${c.id === equipeActive ? ' carte-call--actif' : ''}" data-equipe="${esc(c.id)}">
            <span class="carte-call__nom">${esc(c.nom)}</span>
            <span class="carte-call__cote">${Math.round(Number(c.proba ?? 0) * 100)}%</span>
            <span class="carte-call__proba">probabilité du modèle Clutch</span>
          </button>`).join('')}
      </div>

      <div class="carte" style="margin-top:24px">
        <span class="sur-titre">3. Verrouiller</span>
        <h3>${choisie ? esc(choisie.nom) : 'Choisis une équipe'}</h3>
        <p style="color:var(--texte-doux)">
          ${choisie
            ? `Tu annonces <strong>${esc(choisie.nom)}</strong> vainqueur de ${esc(ev.nom)}. Ce choix est définitif pour la saison.`
            : 'Aucun Frag, aucun multiplicateur : le Call sert uniquement à raconter ce que tu avais vu venir.'}
        </p>
        <button class="btn btn--large" id="poser" ${equipeActive ? '' : 'disabled'}>
          ${equipeActive ? 'Verrouiller mon Call' : "Choisis d'abord une équipe"}
        </button>
      </div>`;

    zone.querySelector('#poser')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        await economie.placerCallV2({ eventId: evenementActif, equipeId: equipeActive });
        toast('Call verrouillé. Rendez-vous à la finale.', 'succes');
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

/** Carte du Call, réutilisable dans les vues de carrière. */
export function carteCallPose(call) {
  const etat =
    call.statut === 'gagne'
      ? '<span class="badge badge--gagne">Call réussi</span>'
      : call.statut === 'perdu'
        ? '<span class="badge badge--perdu">Call manqué</span>'
        : '<span class="badge badge--attente">En attente du sacre</span>';
  const archive = call.mode === 'archive_legacy'
    ? '<small style="color:var(--texte-faible)">Call historique conservé depuis Economy V1.</small>'
    : '<small style="color:var(--texte-faible)">Choix de prestige · aucun effet sur les Frags.</small>';

  return `
    <div class="carte carte-call-pose">
      <div class="carte-call-pose__haut">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(call.jeu ?? '')}"></span>
          <span>${esc(call.evenement)}</span>
        </span>
        ${etat}
      </div>
      <p class="carte-call-pose__phrase">« <strong>${esc(call.equipe)}</strong> gagne ${esc(call.evenement)}. »</p>
      ${archive}
    </div>`;
}
