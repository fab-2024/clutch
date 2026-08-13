import * as api from '../api.js';
import { contexte, majSolde, bandeauSaison } from '../app.js';
import { esc, frags, jeton, dateLisible, toast, vide } from '../ui.js';
import { badgePari } from './match.js';
import { carteCallPose } from './call.js';
import { PRIME_SERIE_MAX } from '../core.js';

export async function vueProfil(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil pour suivre tes paris.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const [paris, stats, prime, call, badges] = await Promise.all([
    api.mesParis(),
    api.statistiques(),
    api.etatPrime(),
    api.monCall(),
    api.mesBadges().catch(() => null),
  ]);
  const enCours = paris.filter((p) => p.statut === 'en_cours');
  const regles = paris.filter((p) => p.statut !== 'en_cours');
  const benefice = stats.gains - stats.mises;
  const favorite = contexte.utilisateur.equipe_favorite;
  const obtenus = badges?.badges?.filter((b) => b.obtenu)?.length ?? 0;
  const total = badges?.badges?.length ?? 0;

  racine.innerHTML = `
    ${bandeauSaison()}

    <!-- La carte d'identité, en premier : qui je suis, mon titre, mon équipe. -->
    <div class="bloc bloc--volt">
      <div class="bloc__titre">
        <span>Mon profil</span>
        <span>${esc(contexte.saison?.nom ?? '')}</span>
      </div>
      <div class="bloc__corps">
        <h1 style="margin-bottom:8px">${esc(contexte.utilisateur.pseudo || contexte.utilisateur.email || 'Mon profil')}</h1>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          ${favorite ? `<span class="badge badge--equipe">★ ${esc(favorite.tag)} · ${esc(favorite.nom)}</span>` : ''}
          ${total ? `<span class="badge">${obtenus} / ${total} badges</span>` : ''}
          <span class="badge">membre depuis le ${esc(new Date(contexte.utilisateur.cree_le).toLocaleDateString('fr-FR'))}</span>
        </div>
        <div class="grille grille--stats">
          <div class="stat"><div class="stat__valeur">${jeton(20)} ${esc(frags(stats.solde))}</div><div class="stat__libelle">Solde</div></div>
          <div class="stat"><div class="stat__valeur">${stats.paris}</div><div class="stat__libelle">Paris réglés</div></div>
          <div class="stat"><div class="stat__valeur">${stats.paris ? Math.round((stats.gagnes / stats.paris) * 100) : 0} %</div><div class="stat__libelle">Réussite</div></div>
          <div class="stat">
            <div class="stat__valeur ${benefice >= 0 ? 'positif' : 'negatif'}">${benefice >= 0 ? '+' : ''}${esc(frags(benefice))}</div>
            <div class="stat__libelle">Bénéfice net</div>
          </div>
          <div class="stat">
            <div class="stat__valeur ${stats.roi >= 0 ? 'positif' : 'negatif'}">${stats.roi >= 0 ? '+' : ''}${Number(stats.roi).toFixed(1)} %</div>
            <div class="stat__libelle">Retour sur mise</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grille grille--2" style="margin-bottom:16px">
      ${cartePrime(prime)}
      ${carteCall(call)}
    </div>

    <div class="bloc">
      <div class="bloc__titre"><span>Mon dossier</span></div>
      <div class="bloc__corps">
        <div class="grille grille--3">
          <a class="tuile" href="#/analyste">
            <span class="tuile__titre">Profil d'analyste</span>
            <span class="tuile__aide">Où tu gagnes vraiment</span>
          </a>
          <a class="tuile" href="#/badges">
            <span class="tuile__titre">Badges</span>
            <span class="tuile__aide">${total ? `${obtenus} sur ${total} décrochés` : 'À décrocher'}</span>
          </a>
          <a class="tuile" href="#/cartes">
            <span class="tuile__titre">Je l'avais dit</span>
            <span class="tuile__aide">Tes paris à partager</span>
          </a>
        </div>
      </div>
    </div>

    <div class="bloc">
      <div class="bloc__titre">
        <span>Paris en cours</span>
        <span>${enCours.length} en attente de résultat</span>
      </div>
      <div class="bloc__corps" style="padding:${enCours.length ? '0' : '18px'}">
        ${enCours.length ? tableauParis(enCours) : vide('Rien en cours', 'Va miser sur un match.')}
      </div>
    </div>

    <div class="bloc">
      <div class="bloc__titre">
        <span>Historique des paris</span>
        <span>${regles.length} réglé${regles.length > 1 ? 's' : ''} sur ${esc(contexte.saison?.nom ?? 'la saison')}</span>
      </div>
      <div class="bloc__corps" style="padding:${regles.length ? '0' : '18px'}">
        ${regles.length ? tableauParis(regles) : vide('Historique vide', 'Tes paris réglés apparaîtront ici.')}
      </div>
    </div>

    <p style="color:var(--texte-faible);font-size:0.84rem">
      Équipe préférée, prono par défaut, saison, déconnexion :
      <a href="#/parametres">c'est dans les paramètres</a>.
    </p>`;

  racine.querySelector('#prime')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      const r = await api.reclamerPrime();
      const montant = typeof r === 'number' ? r : r.montant;
      const serie = typeof r === 'number' ? null : r.serie;
      toast(
        serie ? `+${montant} Frags — jour ${serie} de ta série.` : `+${montant} Frags encaissés.`,
        'succes'
      );
      await majSolde();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      e.currentTarget.disabled = false;
    }
  });
}

/** Prime de connexion : la série de sept jours et ce qu'elle vaut aujourd'hui. */
function cartePrime(prime) {
  if (!prime) return '';
  // Deux lectures différentes : prime disponible, on montre le jour qu'on est
  // sur le point de prendre ; prime déjà prise, on montre le jour acquis.
  const serie = prime.disponible ? prime.serie_prochaine : prime.serie_actuelle;
  const heures = Math.ceil((prime.attente_ms || 0) / 3600000);

  const points = Array.from({ length: PRIME_SERIE_MAX }, (_, i) => {
    const jour = i + 1;
    const acquis = prime.disponible ? jour < serie : jour <= serie;
    const vise = prime.disponible && jour === serie;
    return `<span class="serie__point${acquis ? ' serie__point--acquis' : ''}${vise ? ' serie__point--vise' : ''}"
                  title="Jour ${jour} : ${prime.paliers[i]} Frags">${jour}</span>`;
  }).join('');

  return `
    <div class="carte carte--prime">
      <div class="carte-call-pose__haut">
        <strong>Prime de connexion</strong>
        <span class="badge">jour ${serie} / ${PRIME_SERIE_MAX}</span>
      </div>
      <div class="serie">${points}</div>
      <p style="color:var(--texte-doux);font-size:0.86rem;margin:12px 0">
        ${
          prime.disponible
            ? `Disponible maintenant : <strong style="color:var(--accent)">${prime.montant} Frags</strong>.
               Reviens demain pour passer au jour ${serie >= PRIME_SERIE_MAX ? 1 : serie + 1}.`
            : `Jour ${serie} encaissé. Prochaine prime dans ${heures} h — passer un jour remet la série à zéro.`
        }
      </p>
      <button class="btn btn--large" id="prime" ${prime.disponible ? '' : 'disabled'}>
        ${prime.disponible ? `Encaisser ${prime.montant} Frags` : `Revenir dans ${heures} h`}
      </button>
      <p style="color:var(--texte-faible);font-size:0.76rem;margin:12px 0 0">
        Total encaissé cette saison : ${esc(frags(prime.total_encaisse || 0))}. À partir du
        jour 3, la prime bonifiée demande d'avoir misé dans la semaine.
      </p>
    </div>`;
}

function carteCall(call) {
  if (call) return carteCallPose(call);
  return `
    <div class="carte carte--appel">
      <div class="carte-call-pose__haut">
        <strong>Le call de la saison</strong>
        <span class="badge badge--attente">à poser</span>
      </div>
      <p style="color:var(--texte-doux);margin:12px 0">
        Un seul pronostic pour toute la saison : qui gagne le tournoi ? Il se pose avant
        le premier match, reste affiché ici jusqu'à la finale, et il ne se reprend pas.
      </p>
      <a class="btn btn--large" href="#/call">Poser mon call</a>
    </div>`;
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
                <a href="#/matchs/${encodeURIComponent(p.match_id)}">${esc(p.match?.equipe_a ?? p.equipe_a ?? '')} vs ${esc(p.match?.equipe_b ?? p.equipe_b ?? '')}</a>
                <div style="font-size:0.75rem;color:var(--texte-faible)">${esc(dateLisible(p.cree_le))}</div>
              </td>
              <td>${esc(p.libelle_choix)}<div style="font-size:0.75rem;color:var(--texte-faible)">${esc(p.libelle_marche)}</div></td>
              <td class="num">${esc(frags(p.mise))}</td>
              <td class="num">${Number(p.cote).toFixed(2)}</td>
              <td class="num">${badgePari(p)}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}
