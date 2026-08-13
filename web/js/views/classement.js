import * as api from '../api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, frags, dateLisible, vide } from '../ui.js';

export async function vueClassement(racine) {
  const [lignes, palmares] = await Promise.all([api.classementGlobal(), api.palmares()]);

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Classement</h1>
        <p>${esc(contexte.saison?.nom ?? '')} — chaque saison repart de zéro pour tout le monde.</p>
      </div>
    </div>
    ${bandeauSaison()}
    <div class="carte">${lignes.length ? tableauClassement(lignes) : vide('Personne encore', 'Sois le premier.')}</div>

    ${
      palmares.length
        ? `<h2 style="margin-top:30px">Palmarès</h2>
           <div class="carte">
             <table class="tableau">
               <tbody>
                 ${palmares
                   .map(
                     (p) => `<tr>
                       <td>${esc(p.saison.nom)}
                         <div style="font-size:0.75rem;color:var(--texte-faible)">
                           close le ${esc(dateLisible(p.saison.fin))}
                         </div>
                       </td>
                       <td><strong>${esc(p.vainqueur?.pseudo ?? '—')}</strong></td>
                       <td class="num">${p.vainqueur ? esc(frags(p.vainqueur.solde)) : ''}</td>
                     </tr>`
                   )
                   .join('')}
               </tbody>
             </table>
           </div>`
        : ''
    }`;
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
