import * as api from '../api.js';
import { contexte, majSolde, bandeauSaison } from '../app.js';
import { esc, frags, dateLisible, toast, vide } from '../ui.js';
import { badgePari } from './match.js';
import { BONUS_QUOTIDIEN } from '../core.js';

export async function vueProfil(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil pour suivre tes paris.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const [paris, stats] = await Promise.all([api.mesParis(), api.statistiques()]);
  const enCours = paris.filter((p) => p.statut === 'en_cours');
  const regles = paris.filter((p) => p.statut !== 'en_cours');
  const benefice = stats.gains - stats.mises;

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>${esc(contexte.utilisateur.pseudo || contexte.utilisateur.email || 'Mon profil')}</h1>
        <p>${esc(contexte.saison?.nom ?? '')} — membre depuis le ${esc(new Date(contexte.utilisateur.cree_le).toLocaleDateString('fr-FR'))}</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn--fantome btn--petit" id="prime">Prime quotidienne (+${BONUS_QUOTIDIEN})</button>
        <button class="btn btn--danger btn--petit" id="quitter">Se déconnecter</button>
      </div>
    </div>

    ${bandeauSaison()}

    <div class="grille grille--stats" style="margin-bottom:26px">
      <div class="stat"><div class="stat__valeur">${esc(frags(stats.solde))}</div><div class="stat__libelle">Solde</div></div>
      <div class="stat"><div class="stat__valeur">${stats.paris}</div><div class="stat__libelle">Paris réglés</div></div>
      <div class="stat"><div class="stat__valeur">${stats.paris ? Math.round((stats.gagnes / stats.paris) * 100) : 0} %</div><div class="stat__libelle">Réussite</div></div>
      <div class="stat">
        <div class="stat__valeur ${benefice >= 0 ? 'positif' : 'negatif'}">${benefice >= 0 ? '+' : ''}${esc(frags(benefice))}</div>
        <div class="stat__libelle">Bénéfice net</div>
      </div>
      <div class="stat">
        <div class="stat__valeur ${stats.roi >= 0 ? 'positif' : 'negatif'}">${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)} %</div>
        <div class="stat__libelle">Retour sur mise</div>
      </div>
    </div>

    <h2>Paris en cours (${enCours.length})</h2>
    <p style="color:var(--texte-faible);font-size:0.82rem;margin-top:-8px">
      Seuls les paris de ${esc(contexte.saison?.nom ?? 'la saison')} sont affichés ici.
    </p>
    <div class="carte" style="margin-bottom:26px">${enCours.length ? tableauParis(enCours) : vide('Rien en cours', 'Va miser sur un match.')}</div>

    <h2>Historique (${regles.length})</h2>
    <div class="carte">${regles.length ? tableauParis(regles) : vide('Historique vide', 'Tes paris réglés apparaîtront ici.')}</div>`;

  racine.querySelector('#prime').addEventListener('click', async (e) => {
    try {
      const montant = await api.reclamerPrime();
      toast(`+${montant} Frags encaissés.`, 'succes');
      await majSolde();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
    }
  });

  racine.querySelector('#quitter').addEventListener('click', async () => {
    await api.deconnexion();
    location.hash = '#/matchs';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function tableauParis(paris) {
  return `
    <table class="tableau">
      <thead>
        <tr><th>Match</th><th>Pari</th><th class="num">Mise</th><th class="num">Cote</th><th class="num">Résultat</th></tr>
      </thead>
      <tbody>
        ${paris
          .map(
            (p) => `<tr>
              <td>
                <a href="#/matchs/${encodeURIComponent(p.match_id)}">${esc(p.match?.equipe_a ?? '')} vs ${esc(p.match?.equipe_b ?? '')}</a>
                <div style="font-size:0.75rem;color:var(--texte-faible)">${esc(dateLisible(p.cree_le))}</div>
              </td>
              <td>${esc(p.libelle_choix)}<div style="font-size:0.75rem;color:var(--texte-faible)">${esc(p.libelle_marche)}</div></td>
              <td class="num">${esc(frags(p.mise))}</td>
              <td class="num">${p.cote.toFixed(2)}</td>
              <td class="num">${badgePari(p)}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}
