import * as api from '../api.js';
import { esc, frags, vide } from '../ui.js';

export async function vueClassement(racine) {
  const lignes = await api.classementGlobal();
  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Classement général</h1>
        <p>Tous les joueurs, classés au solde de Frags.</p>
      </div>
    </div>
    <div class="carte">${lignes.length ? tableauClassement(lignes) : vide('Personne encore', 'Sois le premier.')}</div>`;
}

/** Rendu partagé entre le classement global et celui d'une ligue. */
export function tableauClassement(lignes) {
  return `
    <table class="tableau">
      <thead>
        <tr>
          <th class="rang">#</th>
          <th>Joueur</th>
          <th class="num">Paris</th>
          <th class="num">Réussite</th>
          <th class="num">Solde</th>
        </tr>
      </thead>
      <tbody>
        ${lignes
          .map((l, i) => {
            const reussite = l.paris ? Math.round((l.gagnes / l.paris) * 100) : null;
            return `<tr${l.moi ? ' class="moi"' : ''}>
              <td class="rang rang--${i + 1}">${i + 1}</td>
              <td>${esc(l.pseudo)}${l.moi ? ' <span class="badge">toi</span>' : ''}</td>
              <td class="num">${l.paris ?? 0}</td>
              <td class="num">${reussite === null ? '—' : reussite + ' %'}</td>
              <td class="num"><strong>${esc(frags(l.solde))}</strong></td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>`;
}
