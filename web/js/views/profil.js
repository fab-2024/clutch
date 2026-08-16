import * as api from '../api.js';
import { contexte, majSolde, bandeauSaison } from '../app.js';
import { esc, frags, dateLisible, toast, vide } from '../ui.js';
import { badgePari } from './match.js';
import { PRIME_SERIE_MAX, RARETE_BADGE, xpDetaillee, progressionNiveau } from '../core.js';

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
    <div class="profil-v2">
      ${heroProfil(stats, badges, regles, enCours)}
      ${arsenalProfil(badges)}
      ${primeCompacte(prime)}
    </div>

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

function infosNiveau(donnees, stats) {
  const u = contexte.utilisateur;
  return progressionNiveau(
    xpDetaillee({
      badges: donnees?.badges ?? [],
      recap: donnees?.recap ?? {},
      note: u?.note ?? null,
      note_paris: u?.note_paris ?? stats.paris ?? 0,
    }).total
  );
}

function classePrestige(niveau) {
  if (niveau >= 50) return 'clutch';
  if (niveau >= 35) return 'master';
  if (niveau >= 20) return 'elite';
  if (niveau >= 10) return 'challenger';
  if (niveau >= 5) return 'initie';
  return 'recrue';
}

function logoClutch(niveau) {
  const prestige = classePrestige(niveau);
  return `
    <div class="profil-embleme profil-embleme--${prestige}" title="Prestige ${esc(prestige)}">
      <svg class="profil-embleme__logo" viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="27" fill="var(--accent)" />
        <path d="M 63.6 63.6 A 19.2 19.2 0 1 1 63.6 36.4"
              fill="none" stroke="var(--sur-accent)" stroke-width="11.5" />
      </svg>
    </div>`;
}

function rareteBadge(b) {
  return RARETE_BADGE[b?.cle] ?? 'commun';
}

function badgesExposes(donnees, limite = 4) {
  return [...(donnees?.badges ?? [])]
    .filter((b) => b.obtenu)
    .sort((a, b) => (ORDRE_RARETE[rareteBadge(a)] ?? 9) - (ORDRE_RARETE[rareteBadge(b)] ?? 9))
    .slice(0, limite);
}

function heroProfil(stats, donnees, regles, enCours) {
  const u = contexte.utilisateur;
  const eq = u.equipe_favorite;
  const n = infosNiveau(donnees, stats);
  const exposes = badgesExposes(donnees, 4);
  const libres = Math.max(0, 4 - exposes.length);
  const gagnes = regles.filter((p) => p.statut === 'gagne').length;
  const precision = regles.length ? Math.round((gagnes / regles.length) * 100) : 0;
  const serie = serieGagnante(regles);

  return `
    <section class="profil-hero"${eq ? '' : ' data-sans-equipe'}>
      ${eq ? `<div class="profil-hero__tag" aria-hidden="true">${esc(eq.tag)}</div>` : ''}

      <div class="profil-hero__badges" aria-label="Badges exposés">
        ${exposes
          .map(
            (b) => `<span class="profil-pin profil-pin--${esc(rareteBadge(b))}"
                         title="${esc(b.nom)} — ${esc(b.description)}">
              ${sceau(b.famille)}
            </span>`
          )
          .join('')}
        ${Array.from({ length: libres })
          .map(() => `<span class="profil-pin profil-pin--vide" aria-hidden="true">+</span>`)
          .join('')}
      </div>

      <div class="profil-hero__principal">
        ${logoClutch(n.niveau)}
        <div class="profil-identite">
          <div class="profil-identite__sur">Niveau ${n.niveau} · ${esc(n.titre)}</div>
          <div class="profil-identite__pseudo">${esc(u.pseudo || u.email || 'Mon profil')}</div>
          <div class="profil-identite__meta">
            ${eq ? `Fan de ${esc(eq.nom)}` : '<a href="#/parametres">Choisis ton équipe favorite</a>'}
            · membre depuis le ${esc(new Date(u.cree_le).toLocaleDateString('fr-FR'))}
          </div>

          <div class="profil-xp">
            <div class="profil-xp__ligne">
              <strong>${n.xp.toLocaleString('fr-FR')} XP</strong>
              <span>${Math.round(n.part * 100)} % du niveau</span>
            </div>
            <div class="profil-xp__barre"><i style="width:${Math.max(2, Math.round(n.part * 100))}%"></i></div>
          </div>
        </div>
      </div>

      <div class="profil-stats">
        <div class="profil-stat"><b>${precision} %</b><span>Précision</span></div>
        <div class="profil-stat"><b>${serie ? `🔥 ${serie}` : '—'}</b><span>Série gagnante</span></div>
        <div class="profil-stat"><b>${stats.paris ?? regles.length}</b><span>Pronostics réglés</span></div>
        <div class="profil-stat"><b>${enCours.length}</b><span>En cours</span></div>
      </div>
    </section>`;
}

function serieGagnante(regles) {
  const tries = [...regles].sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
  let serie = 0;
  for (const p of tries) {
    if (p.statut !== 'gagne') break;
    serie += 1;
  }
  return serie;
}

function arsenalProfil(donnees) {
  const badges = donnees?.badges ?? [];
  const obtenus = badges.filter((b) => b.obtenu);
  const exposes = badgesExposes(donnees, 5);
  const libres = Math.max(0, 5 - exposes.length);

  return `
    <section class="profil-section">
      <div class="profil-section__haut">
        <strong>Arsenal</strong>
        <span>${obtenus.length}${badges.length ? ` / ${badges.length}` : ''} trophée${obtenus.length > 1 ? 's' : ''}</span>
      </div>
      <div class="profil-section__corps">
        <div class="profil-arsenal">
          ${exposes
            .map(
              (b) => `<a class="profil-trophee profil-trophee--${esc(rareteBadge(b))}" href="#/badges"
                          title="${esc(b.description)}">
                ${sceau(b.famille)}
                <span class="profil-trophee__nom">${esc(b.nom)}</span>
              </a>`
            )
            .join('')}
          ${Array.from({ length: libres })
            .map(() => `<span class="profil-trophee profil-trophee--vide" aria-hidden="true">+</span>`)
            .join('')}
        </div>
        <p style="color:var(--texte-faible);font-size:.78rem;margin:12px 0 0">
          ${
            obtenus.length
              ? `Tes trophées les plus rares sont exposés ici. <a href="#/badges">Ouvrir l’Arsenal complet</a>.`
              : `Ton Arsenal est encore vide. <a href="#/badges">Voir les trophées à décrocher</a>.`
          }
        </p>
      </div>
    </section>`;
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

function primeCompacte(prime) {
  if (!prime) return '';
  const serie = prime.disponible ? prime.serie_prochaine : prime.serie_actuelle;
  const heures = Math.ceil((prime.attente_ms || 0) / 3600000);

  const jours = Array.from({ length: PRIME_SERIE_MAX }, (_, i) => {
    const jour = i + 1;
    const acquis = prime.disponible ? jour < serie : jour <= serie;
    const vise = prime.disponible && jour === serie;
    const coffre = jour === PRIME_SERIE_MAX;
    return `<span class="profil-prime__jour${acquis ? ' profil-prime__jour--ok' : ''}${vise ? ' profil-prime__jour--maintenant' : ''}${coffre ? ' profil-prime__jour--coffre' : ''}"
                  title="Jour ${jour} : ${prime.paliers[i]} Frags">${jour}</span>`;
  }).join('');

  return `
    <section class="profil-section">
      <div class="profil-section__corps profil-prime">
        <div>
          <div class="profil-prime__titre">
            <strong>🔥 Série de connexion</strong>
            <span>Jour ${serie} / ${PRIME_SERIE_MAX}</span>
          </div>
          <div class="profil-prime__jours">${jours}</div>
          <p class="profil-prime__aide">
            ${
              prime.disponible
                ? `Récompense du jour : ${prime.montant} Frags. Le jour 7 contient le coffre de série.`
                : `Jour ${serie} encaissé. Prochain bonus dans ${heures} h.`
            }
          </p>
        </div>
        <button class="btn profil-prime__action" id="prime" ${prime.disponible ? '' : 'disabled'}>
          ${prime.disponible ? `Encaisser +${prime.montant}` : `Dans ${heures} h`}
        </button>
      </div>
    </section>`;
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
