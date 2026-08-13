import * as api from '../api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, frags, toast } from '../ui.js';
import { tableauClassement } from './classement.js';

export async function vueLigue(racine, id) {
  const ligue = await api.lireLigue(id);
  if (!ligue) {
    racine.innerHTML = `<div class="vide"><h3>Ligue introuvable</h3><p><a href="#/ligues">Retour</a></p></div>`;
    return;
  }
  const classement = await api.classementLigue(id);

  racine.innerHTML = `
    <p><a href="#/ligues">← Mes ligues</a></p>
    <div class="entete-page">
      <div>
        <h1>${esc(ligue.nom)}</h1>
        <p>${classement.length} membre${classement.length > 1 ? 's' : ''} · ${esc(contexte.saison?.nom ?? '')}</p>
      </div>
    </div>
    ${bandeauSaison()}

    <div class="grille grille--2" style="margin-bottom:22px">
      <div class="carte">
        <h3 style="margin-bottom:10px">Inviter des joueurs</h3>
        <p style="color:var(--texte-doux);font-size:0.86rem">
          Partage ce code, ils le saisissent depuis « Mes ligues ».
        </p>
        <div class="code-ligue">${esc(ligue.code)}</div>
        <button class="btn btn--fantome btn--large" id="copier" style="margin-top:12px">Copier le code</button>
      </div>
      <div class="carte">
        <h3 style="margin-bottom:10px">Comment on gagne</h3>
        <p style="color:var(--texte-doux);font-size:0.86rem;margin:0">
          Le classement se fait au solde de Frags, <strong>saison par saison</strong> : à
          chaque nouvelle saison, tout le monde repart au même niveau. La ligue, elle, reste.
          Un pari saisi une fois compte dans toutes tes ligues.
        </p>
      </div>
    </div>

    <div class="carte">
      ${tableauClassement(classement)}
    </div>`;

  racine.querySelector('#copier').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ligue.code);
      toast('Code copié.', 'succes');
    } catch {
      toast(`Code : ${ligue.code}`);
    }
  });
}
