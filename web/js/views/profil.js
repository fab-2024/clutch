import * as api from '../api.js';
import { contexte, majSolde, bandeauSaison } from '../app.js';
import { esc, frags, jeton, dateLisible, toast, vide, ecusson } from '../ui.js';
import { badgePari } from './match.js';
import { PRIME_SERIE_MAX, RARETE_BADGE, xpDetaillee, progressionNiveau } from '../core.js';

/**
 * Le profil, en cinq étages, dans cet ordre :
 *
 *   1. la bannière — qui je suis
 *   2. la vitrine de badges — ce que j'ai décroché
 *   3. le bonus de connexion — ce que je peux prendre maintenant
 *   4. les pronostics en cours — ce que j'attends
 *   5. l'historique — ce que j'ai fait
 *
 * L'ordre va de l'identité vers l'activité : on ouvre son profil pour se
 * regarder, pas pour travailler. Le poste de pilotage, c'est l'écran des
 * matchs.
 *
 * Le call de la saison n'est plus ici : son rappel vit sur l'écran des
 * matchs, c'est-à-dire au moment où le joueur pense déjà à pronostiquer.
 * L'afficher aux deux endroits le diluait.
 */

const ORDRE_RARETE = { rare: 0, exigeant: 1, commun: 2 };

export async function vueProfil(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil pour suivre tes pronostics.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const [paris, stats, prime, badges] = await Promise.all([
    api.mesParis(),
    api.statistiques(),
    api.etatPrime(),
    api.mesBadges().catch(() => null),
  ]);

  const enCours = paris.filter((p) => p.statut === 'en_cours');
  const regles = paris.filter((p) => p.statut !== 'en_cours');

  racine.innerHTML = `
    ${bandeauSaison()}
    ${banniere(stats, badges)}
    ${vitrineBadges(badges)}
    ${cartePrime(prime)}

    <div class="bloc">
      <div class="bloc__titre">
        <span>Pronostics en cours</span>
        <span>${enCours.length} en attente de résultat</span>
      </div>
      <div class="bloc__corps" style="padding:${enCours.length ? '0' : '18px'}">
        ${enCours.length ? tableauParis(enCours) : vide('Rien en cours', 'Va pronostiquer sur un match.')}
      </div>
    </div>

    <div class="bloc">
      <div class="bloc__titre">
        <span>Historique des pronostics</span>
        <span>${regles.length} réglé${regles.length > 1 ? 's' : ''} sur ${esc(contexte.saison?.nom ?? 'la saison')}</span>
      </div>
      <div class="bloc__corps" style="padding:${regles.length ? '0' : '18px'}">
        ${regles.length ? tableauParis(regles) : vide('Historique vide', 'Tes pronostics réglés apparaîtront ici.')}
      </div>
    </div>

    <p style="color:var(--texte-faible);font-size:0.84rem">
      <a href="#/analyste">Profil d'analyste</a> ·
      <a href="#/cartes">Cartes « je l'avais dit »</a> ·
      <a href="#/parametres">Paramètres</a>
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

/**
 * La bannière.
 *
 * Le tag de l'équipe en filigrane remplace le logo qu'on n'a pas, et le fond
 * prend sa teinte : l'identité vient de l'équipe, sans jamais charger d'image.
 * Elle porte le niveau parce que c'est le seul compteur qui traverse les
 * saisons — les Frags, eux, repartent à zéro.
 */
function banniere(stats, donnees) {
  const u = contexte.utilisateur;
  const eq = u.equipe_favorite;
  const benefice = stats.gains - stats.mises;

  const n = progressionNiveau(
    xpDetaillee({
      badges: donnees?.badges ?? [],
      recap: donnees?.recap ?? {},
      note: u?.note ?? null,
      note_paris: u?.note_paris ?? stats.paris ?? 0,
    }).total
  );

  return `
    <div class="ban"${eq ? '' : ' data-sans-equipe'}>
      <div class="ban__fond"></div>
      ${eq ? `<div class="ban__filigrane" aria-hidden="true">${esc(eq.tag)}</div>` : ''}
      <div class="ban__corps">
        <div class="ban__haut">
          ${eq ? ecusson(eq.tag, eq.nom) : ''}
          <div class="ban__id">
            <div class="ban__pseudo">${esc(u.pseudo || u.email || 'Mon profil')}</div>
            <div class="ban__eq">
              ${eq ? esc(eq.nom) : '<a href="#/parametres">Choisis ton équipe</a>'}
              · membre depuis le ${esc(new Date(u.cree_le).toLocaleDateString('fr-FR'))}
            </div>
          </div>
        </div>

        <div class="ban__niv">
          <span><strong>Niveau ${n.niveau}</strong> <span class="ban__titre">${esc(n.titre)}</span></span>
          <span class="ban__xp">${n.xp.toLocaleString('fr-FR')} XP</span>
        </div>
        <div class="ban__jauge"><i style="width:${Math.max(2, Math.round(n.part * 100))}%"></i></div>

        <div class="ban__chiffres">
          <div><b>${jeton(17)} ${esc(String(stats.solde))}</b><span>Frags</span></div>
          <div><b class="${benefice >= 0 ? 'positif' : 'negatif'}">${benefice >= 0 ? '+' : ''}${esc(String(benefice))}</b><span>Bénéfice</span></div>
          <div><b class="${stats.roi >= 0 ? 'positif' : 'negatif'}">${stats.roi >= 0 ? '+' : ''}${Number(stats.roi).toFixed(1)} %</b><span>Retour</span></div>
          <div><b>${stats.paris}</b><span>Réglés</span></div>
        </div>
      </div>
    </div>`;
}

/**
 * La vitrine de badges.
 *
 * Cinq emplacements, les plus rares d'abord, et les emplacements libres
 * restent visibles en pointillé : c'est le vide qui donne envie de remplir.
 * Le détail complet reste dans l'Arsenal — ici on montre, on n'inventorie pas.
 */
function vitrineBadges(donnees) {
  const badges = donnees?.badges ?? [];
  const obtenus = badges.filter((b) => b.obtenu);
  const total = badges.length;

  const exposes = [...obtenus]
    .sort((a, b) => ORDRE_RARETE[RARETE_BADGE[a.cle]] - ORDRE_RARETE[RARETE_BADGE[b.cle]])
    .slice(0, 5);
  const libres = Math.max(0, 5 - exposes.length);

  return `
    <div class="bloc">
      <div class="bloc__titre">
        <span>Ma vitrine</span>
        <span>${obtenus.length}${total ? ` / ${total}` : ''} trophée${obtenus.length > 1 ? 's' : ''}</span>
      </div>
      <div class="bloc__corps">
        <div class="vitrine-p">
          ${exposes
            .map(
              (b) => `<span class="vitrine-p__t vitrine-p__t--${esc(RARETE_BADGE[b.cle])}"
                            title="${esc(b.nom)} — ${esc(b.description)}">
                ${sceau(b.famille)}
                <span class="vitrine-p__n">${esc(b.nom)}</span>
              </span>`
            )
            .join('')}
          ${Array.from({ length: libres })
            .map(() => `<span class="vitrine-p__t vitrine-p__t--libre" aria-hidden="true">+</span>`)
            .join('')}
        </div>
        <p style="color:var(--texte-faible);font-size:0.8rem;margin:14px 0 0">
          ${
            obtenus.length
              ? `Tes trophées les plus rares. <a href="#/badges">Voir l’Arsenal complet</a>.`
              : `Aucun trophée pour l’instant — <strong>Dans le vert</strong> se décroche dès que ton
                 bénéfice repasse au-dessus de zéro. <a href="#/badges">Voir ce qu’il y a à décrocher</a>.`
          }
        </p>
      </div>
    </div>`;
}

function sceau(famille) {
  const formes = {
    Audace: 'M12 3 4 13h5l-1 8 8-10h-5z',
    Précision: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    Rentabilité: 'M5 17 10 11l3 3 6-7',
    Régularité: 'M6 4v16M12 4v16M18 4v16',
    Connaissance: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
    Social: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M15 20a6 6 0 0 1 6-6',
  };
  const d = formes[famille] ?? formes.Précision;
  const plein = famille === 'Audace' || famille === 'Connaissance';
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="${d}" fill="${plein ? 'currentColor' : 'none'}" stroke="currentColor"
          stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}

/** Prime de connexion : la série de sept jours et ce qu'elle vaut aujourd'hui. */
function cartePrime(prime) {
  if (!prime) return '';
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
    <div class="bloc">
      <div class="bloc__titre">
        <span>Bonus de connexion</span>
        <span>jour ${serie} / ${PRIME_SERIE_MAX}</span>
      </div>
      <div class="bloc__corps">
        <div class="serie">${points}</div>
        <p style="color:var(--texte-doux);font-size:0.86rem;margin:12px 0">
          ${
            prime.disponible
              ? `Disponible maintenant : <strong style="color:var(--accent)">${prime.montant} Frags</strong>.
                 Reviens demain pour passer au jour ${serie >= PRIME_SERIE_MAX ? 1 : serie + 1}.`
              : `Jour ${serie} encaissé. Prochain bonus dans ${heures} h — passer un jour remet la série à zéro.`
          }
        </p>
        <button class="btn btn--large" id="prime" ${prime.disponible ? '' : 'disabled'}>
          ${prime.disponible ? `Encaisser ${prime.montant} Frags` : `Revenir dans ${heures} h`}
        </button>
        <p style="color:var(--texte-faible);font-size:0.76rem;margin:12px 0 0">
          Total encaissé cette saison : ${esc(frags(prime.total_encaisse || 0))}. À partir du
          jour 3, le bonus bonifié demande d'avoir pronostiqué dans la semaine.
        </p>
      </div>
    </div>`;
}

function tableauParis(paris) {
  return `
    <table class="tableau">
      <thead>
        <tr><th>Match</th><th>Pronostic</th><th class="num">Engagé</th><th class="num">Multipl.</th><th class="num">Résultat</th></tr>
      </thead>
      <tbody>
        ${paris
          .map(
            (p) => `<tr>
              <td>
                <a href="#/matchs/${encodeURIComponent(p.match_id)}">${esc(p.match?.equipe_a ?? p.equipe_a ?? '')} – ${esc(p.match?.equipe_b ?? p.equipe_b ?? '')}</a>
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
