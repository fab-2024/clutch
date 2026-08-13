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

  const [aVenir, termines, evenements] = await Promise.all([
    api.listerMatchs({ statut: 'a_venir' }),
    api.listerMatchs({ statut: 'termine' }),
    api.listerEvenementsSaison(),
  ]);

  // Les équipes engagées, tournoi par tournoi : il faut la liste pour proposer
  // un vainqueur. Un tournoi déjà réglé n'a plus besoin de rien.
  const equipesParEvenement = new Map(
    await Promise.all(
      evenements.map(async (ev) => [
        ev.id,
        ev.statut === 'regle' ? [] : await api.cotesEvenement(ev.id).catch(() => []),
      ])
    )
  );

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

    <h2>Vainqueurs de tournoi (calls de la saison)</h2>
    <div class="encart" style="margin-bottom:14px">
      Désigner le vainqueur d'un tournoi règle d'un coup tous les calls de la saison
      qui le visaient. C'est irréversible : à faire une fois la finale jouée.
    </div>
    <div class="grille grille--2" style="margin-bottom:30px" id="zone-evenements">
      ${
        evenements.length
          ? evenements.map((ev) => carteEvenement(ev, equipesParEvenement.get(ev.id) ?? [])).join('')
          : vide('Aucun tournoi', 'Cette saison ne contient encore aucun match.')
      }
    </div>

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

  racine.querySelectorAll('[data-evenement]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const equipeId = form.querySelector('[name=equipe]').value;
      if (!equipeId) return toast('Choisis une équipe.', 'erreur');
      try {
        const r = await api.reglerEvenement(form.dataset.evenement, equipeId);
        toast(`${r.regles} call(s) réglé(s).`, 'succes');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(err.message, 'erreur');
      }
    });
  });

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

/** Désignation du vainqueur d'un tournoi : c'est ce qui règle les calls. */
function carteEvenement(ev, equipes) {
  const etat =
    ev.statut === 'regle'
      ? `<span class="badge badge--gagne">${esc(ev.vainqueur ?? 'réglé')}</span>`
      : ev.statut === 'ouvert'
        ? '<span class="badge badge--attente">calls ouverts</span>'
        : '<span class="badge">en cours</span>';

  return `
    <form class="carte" data-evenement="${esc(ev.id)}">
      <div class="match__haut" style="border:0;padding:0 0 10px">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(ev.jeu)}"></span>
          <span>${esc(ev.nom)}</span>
        </span>
        ${etat}
      </div>
      <p style="color:var(--texte-faible);font-size:0.8rem;margin:0 0 12px">
        ${ev.nb_matchs} match${ev.nb_matchs > 1 ? 's' : ''} ·
        premier le ${esc(dateLisible(ev.debut))}
      </p>
      ${
        ev.statut === 'regle'
          ? `<p style="margin:0;color:var(--texte-doux);font-size:0.86rem">
               Vainqueur enregistré : <strong>${esc(ev.vainqueur ?? '—')}</strong>.
             </p>`
          : `<label class="champ" style="margin-bottom:12px">
               <span class="champ__libelle">Vainqueur du tournoi</span>
               <select name="equipe">
                 <option value="">À désigner…</option>
                 ${equipes
                   .map((e) => `<option value="${esc(e.id)}">${esc(e.nom)}</option>`)
                   .join('')}
               </select>
             </label>
             <button class="btn btn--large">Désigner et régler les calls</button>`
      }
    </form>`;
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
