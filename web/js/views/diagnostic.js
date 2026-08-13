import * as api from '../api.js';
import { SUPABASE_URL, MODE_DEMO } from '../config.js';
import { esc } from '../ui.js';

/**
 * Page de diagnostic : teste la chaîne complète (configuration, connexion,
 * clé, tables, données, moteur de cotes, session) et affiche ce qui bloque,
 * en français, avec la marche à suivre.
 *
 * Les étapes sont jouées une par une et affichées au fur et à mesure : si
 * l'une traîne, on voit quand même le résultat des précédentes. C'est le
 * premier réflexe quand le site ne se charge pas.
 */
export async function vueDiagnostic(racine) {
  const etapes = api.etapesDiagnostic();
  const resultats = etapes.map((e) => ({ libelle: e.libelle, aide: e.aide, etat: 'attente', detail: '' }));

  const dessiner = () => {
    const echec = resultats.find((r) => r.etat === 'echec');
    const encours = resultats.find((r) => r.etat === 'encours');
    const fini = !encours && !resultats.some((r) => r.etat === 'attente');

    racine.innerHTML = `
      <div class="entete-page">
        <div>
          <h1>Diagnostic</h1>
          <p>${
            MODE_DEMO
              ? "Aucune clé n'est configurée : le site tourne en mode démo."
              : `Base visée : ${esc(SUPABASE_URL)}`
          }</p>
        </div>
      </div>

      ${
        echec
          ? `<div class="carte" style="border-color:var(--danger);margin-bottom:20px">
               <h2>Ça bloque ici : ${esc(echec.libelle)}</h2>
               <p style="color:var(--texte-doux);margin-bottom:12px">${esc(echec.detail)}</p>
               ${echec.aide ? `<div class="encart"><strong>À faire :</strong> ${esc(echec.aide)}</div>` : ''}
             </div>`
          : fini
            ? `<div class="carte" style="border-color:var(--accent);margin-bottom:20px">
                 <h2>Tout est vert</h2>
                 <p style="color:var(--texte-doux);margin:0">
                   La base répond, les données sont là et le moteur de cotes tourne.
                   <a href="#/matchs">Retour aux matchs</a>.
                 </p>
               </div>`
            : ''
      }

      <div class="carte">
        <table class="tableau">
          <tbody>
            ${resultats
              .map(
                (r) => `<tr>
                  <td style="width:40px">${
                    r.etat === 'ok' ? '✅' : r.etat === 'echec' ? '❌' : r.etat === 'encours' ? '⏳' : '·'
                  }</td>
                  <td>
                    <strong style="${r.etat === 'attente' ? 'color:var(--texte-faible)' : ''}">${esc(r.libelle)}</strong>
                    ${r.detail ? `<div style="font-size:0.8rem;color:var(--texte-faible)">${esc(r.detail)}</div>` : ''}
                  </td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="encart" style="margin-top:20px">
        <strong>Rappel de l'ordre des fichiers SQL :</strong>
        01_schema.sql → 02_fonctions.sql → 03_securite.sql → 04_donnees.sql.
        Chacun doit afficher un message vert avant de passer au suivant. Si l'un
        d'eux a été sauté, le site ne peut pas démarrer.
      </div>`;
  };

  dessiner();

  // Une étape après l'autre, avec redessin entre chaque : la page reste
  // vivante même si une requête met dix secondes à échouer.
  for (let i = 0; i < etapes.length; i++) {
    resultats[i].etat = 'encours';
    resultats[i].detail = 'test en cours…';
    dessiner();
    try {
      resultats[i].detail = (await etapes[i].executer()) ?? 'OK';
      resultats[i].etat = 'ok';
    } catch (e) {
      resultats[i].detail = e.message;
      resultats[i].etat = 'echec';
    }
    dessiner();
  }
}
