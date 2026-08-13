import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, dateLisible, nomJeu, toast, vide } from '../ui.js';

/**
 * Console d'administration : c'est ici qu'on saisit les scores et qu'on
 * déclenche le règlement des paris. Tant que la récupération automatique des
 * résultats n'est pas branchée, c'est l'écran le plus important du produit.
 */
export async function vueAdmin(racine) {
  if (!contexte.admin) {
    racine.innerHTML = vide('Accès réservé', 'Cette page est réservée aux administrateurs.');
    return;
  }

  const [aVenir, termines] = await Promise.all([
    api.listerMatchs({ statut: 'a_venir' }),
    api.listerMatchs({ statut: 'termine' }),
  ]);

  const maintenant = Date.now();
  const aRegler = aVenir.filter((m) => new Date(m.debut).getTime() < maintenant);
  const prochains = aVenir.filter((m) => new Date(m.debut).getTime() >= maintenant);

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Administration</h1>
        <p>Saisis les scores : les paris se règlent et les Elo se recalculent automatiquement.</p>
      </div>
    </div>

    <div class="encart" style="margin-bottom:22px">
      Le score doit respecter le format : un BO3 se termine forcément à 2 maps gagnées,
      un BO5 à 3. Un score incohérent est refusé.
    </div>

    <h2>Matchs commencés, en attente de résultat (${aRegler.length})</h2>
    <div class="grille grille--2" style="margin-bottom:30px">
      ${aRegler.length ? aRegler.map(carteReglement).join('') : vide('Rien à régler', 'Tous les matchs commencés sont réglés.')}
    </div>

    ${
      api.estDemo
        ? `<h2>Simuler un résultat (démo)</h2>
           <div class="encart encart--alerte" style="margin-bottom:14px">
             En mode démo tu peux régler un match qui n'a pas encore eu lieu, pour vérifier
             que le calcul des gains et des Elo fonctionne. En production, cette section
             ne montre que les matchs réellement commencés.
           </div>
           <div class="grille grille--2" style="margin-bottom:30px">
             ${prochains.slice(0, 4).map(carteReglement).join('')}
           </div>`
        : ''
    }

    <h2>Prochains matchs (${prochains.length})</h2>
    <div class="carte" style="margin-bottom:30px">
      <table class="tableau">
        <tbody>
          ${prochains
            .slice(0, 12)
            .map(
              (m) => `<tr>
                <td>${esc(nomJeu(m.jeu))}</td>
                <td>${esc(m.equipe_a)} vs ${esc(m.equipe_b)} <span class="badge">BO${m.format}</span></td>
                <td class="num">${esc(dateLisible(m.debut))}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <h2>Derniers matchs réglés (${termines.length})</h2>
    <div class="carte">
      <table class="tableau">
        <tbody>
          ${termines
            .slice(-10)
            .reverse()
            .map(
              (m) => `<tr>
                <td>${esc(nomJeu(m.jeu))}</td>
                <td>${esc(m.equipe_a)} <strong>${m.score_a} – ${m.score_b}</strong> ${esc(m.equipe_b)}</td>
                <td class="num">Elo ${m.elo_a} / ${m.elo_b}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;

  racine.querySelectorAll('[data-regler]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.regler;
      const a = Number(form.querySelector('[name=a]').value);
      const b = Number(form.querySelector('[name=b]').value);
      try {
        const r = await api.reglerMatch(id, a, b);
        toast(`${r.regles} pari(s) réglé(s). Nouveaux Elo : ${r.elo_a} / ${r.elo_b}.`, 'succes');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(err.message, 'erreur');
      }
    });
  });
}

function carteReglement(m) {
  const max = Math.ceil(m.format / 2);
  return `
    <form class="carte" data-regler="${esc(m.id)}">
      <div class="match__haut" style="border:0;padding:0 0 10px">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(m.jeu)}"></span>
          <span>${esc(m.evenement)} · BO${m.format}</span>
        </span>
        <span>${esc(dateLisible(m.debut))}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 64px 16px 64px 1fr;align-items:center;gap:8px">
        <strong style="font-size:0.9rem">${esc(m.equipe_a)}</strong>
        <input type="number" name="a" min="0" max="${max}" value="0" required />
        <span style="text-align:center;color:var(--texte-faible)">–</span>
        <input type="number" name="b" min="0" max="${max}" value="0" required />
        <strong style="font-size:0.9rem;text-align:right">${esc(m.equipe_b)}</strong>
      </div>
      <button class="btn btn--large" style="margin-top:14px">Régler ce match</button>
    </form>`;
}
