import * as api from '../api.js';
import { contexte, majSolde, bandeauSaison } from '../app.js';
import { esc, frags, dateLisible, toast, vide } from '../ui.js';
import { badgePari } from './match.js';
import { PRIME_SERIE_MAX, progressionNiveau } from '../core.js';
import {
  NB_BADGES_PUBLICS,
  evaluerBadgesV2,
  xpDetailleeV2,
  ordreRareteV2,
  rareteBadgeV2,
  libelleRareteV2,
  iconeFamilleBadge,
} from '../badges-v2.js';
import { preferencesProfil, sauverPreferencesProfil } from '../profile-prefs.js';

export async function vueProfil(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil pour suivre tes pronostics.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const [paris, stats, prime, badgesBruts] = await Promise.all([
    api.mesParis(),
    api.statistiques(),
    api.etatPrime(),
    api.mesBadges().catch(() => null),
  ]);

  const badges = badgesBruts
    ? { ...badgesBruts, badges: evaluerBadgesV2(badgesBruts.recap ?? {}) }
    : null;

  const enCours = paris.filter((p) => p.statut === 'en_cours');
  const regles = paris.filter((p) => p.statut !== 'en_cours');
  const selection = selectionProfil(badges);
  const niveau = infosNiveau(badges, stats);

  racine.innerHTML = `
    ${bandeauSaison()}
    <div class="profil-v2">
      ${heroProfil(stats, badges, regles, enCours, selection, niveau)}
      ${editeurShell()}
      ${arsenalProfil(badges, selection)}
      ${primeCompacte(prime, badges)}
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

  monterPersonnalisation(racine, badges, selection);
  verifierLevelUp(racine, niveau);

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
    xpDetailleeV2({
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

function libellePrestige(niveau) {
  return {
    recrue: 'Recrue',
    initie: 'Initié',
    challenger: 'Challenger',
    elite: 'Elite',
    master: 'Master',
    clutch: 'CLUTCH',
  }[classePrestige(niveau)];
}

function logoClutch(niveau) {
  const prestige = classePrestige(niveau);
  return `
    <div class="profil-embleme profil-embleme--${prestige}" title="${esc(libellePrestige(niveau))} · niveau ${niveau}">
      <span class="profil-embleme__orbite profil-embleme__orbite--1" aria-hidden="true"></span>
      <span class="profil-embleme__orbite profil-embleme__orbite--2" aria-hidden="true"></span>
      <span class="profil-embleme__eclats" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <svg class="profil-embleme__logo" viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="27" fill="var(--accent)" />
        <path d="M 63.6 63.6 A 19.2 19.2 0 1 1 63.6 36.4"
              fill="none" stroke="var(--sur-accent)" stroke-width="11.5" />
      </svg>
      <span class="profil-embleme__niveau">${niveau}</span>
    </div>`;
}

function obtenusTries(donnees) {
  return [...(donnees?.badges ?? [])]
    .filter((b) => b.obtenu)
    .sort((a, b) => ordreRareteV2(a) - ordreRareteV2(b) || a.nom.localeCompare(b.nom, 'fr'));
}

function selectionProfil(donnees) {
  const obtenus = obtenusTries(donnees);
  const parCle = new Map(obtenus.map((b) => [b.cle, b]));
  const prefs = preferencesProfil(contexte.utilisateur);

  const vedette = parCle.get(prefs.vedette) ?? obtenus[0] ?? null;
  const secondaires = [];
  for (const cle of prefs.banniere) {
    const badge = parCle.get(cle);
    if (badge && badge.cle !== vedette?.cle && !secondaires.some((b) => b.cle === badge.cle)) secondaires.push(badge);
  }
  for (const badge of obtenus) {
    if (secondaires.length >= 3) break;
    if (badge.cle !== vedette?.cle && !secondaires.some((b) => b.cle === badge.cle)) secondaires.push(badge);
  }

  const arsenal = [];
  for (const cle of prefs.arsenal) {
    const badge = parCle.get(cle);
    if (badge && !arsenal.some((b) => b.cle === badge.cle)) arsenal.push(badge);
  }
  for (const badge of obtenus) {
    if (arsenal.length >= 5) break;
    if (!arsenal.some((b) => b.cle === badge.cle)) arsenal.push(badge);
  }

  return { vedette, secondaires: secondaires.slice(0, 3), arsenal: arsenal.slice(0, 5) };
}

function medailleBadge(badge, { vedette = false, mini = false, lien = false } = {}) {
  if (!badge) return '';
  const rarete = rareteBadgeV2(badge);
  const secret = badge.secret ? ' badge-medaille--secret' : '';
  const hero = vedette ? ' badge-medaille--vedette' : '';
  const compact = mini ? ' badge-medaille--mini' : '';
  const contenu = `
    <span class="badge-medaille__corps">
      <span class="badge-medaille__centre">${iconeFamilleBadge(badge.famille, vedette ? 26 : mini ? 17 : 21)}</span>
    </span>
    <span class="badge-medaille__ruban badge-medaille__ruban--g" aria-hidden="true"></span>
    <span class="badge-medaille__ruban badge-medaille__ruban--d" aria-hidden="true"></span>`;

  const titre = `${badge.nom} · ${badge.secret ? 'Légendaire secret' : libelleRareteV2(badge)}`;
  if (lien) {
    return `<a class="badge-medaille badge-medaille--${esc(rarete)}${secret}${hero}${compact}" href="#/badges" title="${esc(titre)}">${contenu}</a>`;
  }
  return `<span class="badge-medaille badge-medaille--${esc(rarete)}${secret}${hero}${compact}" title="${esc(titre)}">${contenu}</span>`;
}

function heroProfil(stats, donnees, regles, enCours, selection, niveau) {
  const u = contexte.utilisateur;
  const eq = u.equipe_favorite;
  const gagnes = regles.filter((p) => p.statut === 'gagne').length;
  const precision = regles.length ? Math.round((gagnes / regles.length) * 100) : 0;
  const serie = serieGagnante(regles);
  const secondaires = selection.secondaires;

  return `
    <section class="profil-hero profil-hero--${classePrestige(niveau.niveau)}"${eq ? '' : ' data-sans-equipe'}>
      ${eq ? `<div class="profil-hero__tag" aria-hidden="true">${esc(eq.tag)}</div>` : ''}

      <div class="profil-etendard">
        <div class="profil-etendard__haut">
          <span>Étendard</span>
          <button class="profil-action-discrete" type="button" data-open-personnalisation="banniere">Personnaliser</button>
        </div>
        <div class="profil-hero__badges profil-hero__badges--medailles" aria-label="Badges épinglés">
          ${selection.vedette
            ? medailleBadge(selection.vedette, { vedette: true, lien: true })
            : '<button class="badge-medaille-vide badge-medaille-vide--vedette" type="button" data-open-personnalisation="banniere" aria-label="Choisir ton badge vedette">+</button>'}
          ${secondaires.map((b) => medailleBadge(b, { mini: true, lien: true })).join('')}
          ${Array.from({ length: Math.max(0, 3 - secondaires.length) })
            .map(() => '<button class="badge-medaille-vide badge-medaille-vide--mini" type="button" data-open-personnalisation="banniere" aria-label="Choisir un badge à épingler">+</button>')
            .join('')}
        </div>
      </div>

      <div class="profil-hero__principal">
        ${logoClutch(niveau.niveau)}
        <div class="profil-identite">
          <div class="profil-identite__sur">Niveau ${niveau.niveau} · ${esc(niveau.titre)}</div>
          <div class="profil-identite__pseudo">${esc(u.pseudo || u.email || 'Mon profil')}</div>
          <div class="profil-identite__meta">
            ${eq ? `Fan de ${esc(eq.nom)}` : '<a href="#/parametres">Choisis ton équipe favorite</a>'}
            · membre depuis le ${esc(new Date(u.cree_le).toLocaleDateString('fr-FR'))}
          </div>

          <div class="profil-xp">
            <div class="profil-xp__ligne">
              <strong>${niveau.xp.toLocaleString('fr-FR')} XP</strong>
              <span>${Math.round(niveau.part * 100)} % du niveau · ${esc(libellePrestige(niveau.niveau))}</span>
            </div>
            <div class="profil-xp__barre"><i style="width:${Math.max(2, Math.round(niveau.part * 100))}%"></i></div>
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

function arsenalProfil(donnees, selection) {
  const badges = donnees?.badges ?? [];
  const obtenus = badges.filter((b) => b.obtenu);
  const publicsObtenus = obtenus.filter((b) => !b.secret);
  const secretsObtenus = obtenus.filter((b) => b.secret);
  const libres = Math.max(0, 5 - selection.arsenal.length);

  return `
    <section class="profil-section profil-section--arsenal">
      <div class="profil-section__haut">
        <div>
          <strong>Arsenal</strong>
          <small>Ta vitrine publique</small>
        </div>
        <div class="profil-section__actions">
          <span>
            ${publicsObtenus.length} / ${NB_BADGES_PUBLICS} découverts
            ${secretsObtenus.length ? ` · ✦ ${secretsObtenus.length} secret${secretsObtenus.length > 1 ? 's' : ''}` : ' · secrets classifiés'}
          </span>
          <button class="profil-action-discrete" type="button" data-open-personnalisation="arsenal">Modifier la vitrine</button>
        </div>
      </div>
      <div class="profil-section__corps">
        <div class="profil-arsenal profil-arsenal--medailles">
          ${selection.arsenal
            .map(
              (b) => `<a class="profil-badge-item" href="#/badges" title="${esc(b.description)}">
                ${medailleBadge(b)}
                <span class="profil-badge-item__nom">${esc(b.nom)}</span>
                <small>${esc(libelleRareteV2(b))}</small>
              </a>`
            )
            .join('')}
          ${Array.from({ length: libres })
            .map(() => '<button class="profil-badge-item profil-badge-item--vide" type="button" data-open-personnalisation="arsenal" aria-label="Choisir une distinction"><i>+</i></button>')
            .join('')}
        </div>
        <p class="profil-arsenal__aide">
          ${
            obtenus.length
              ? `Tu choisis ce que tu exposes. <a href="#/badges">Ouvrir l’Arsenal complet</a> pour voir toute la collection.`
              : `Ton Arsenal est encore vide. <a href="#/badges">Voir les badges à décrocher</a>.`
          }
        </p>
      </div>
    </section>`;
}

function editeurShell() {
  return `
    <section class="profil-editeur" id="profil-editeur" hidden>
      <div class="profil-editeur__entete">
        <div>
          <span class="profil-editeur__eyebrow">Personnalisation</span>
          <h2>Construis ton identité Clutch</h2>
          <p>Le premier emplacement de l’étendard est ton badge vedette. La vitrine possède ses propres choix.</p>
        </div>
        <button class="profil-editeur__fermer" type="button" data-editor-action="cancel" aria-label="Fermer">×</button>
      </div>
      <div id="profil-editeur-corps"></div>
    </section>`;
}

function monterPersonnalisation(racine, donnees, selection) {
  const editeur = racine.querySelector('#profil-editeur');
  const corps = racine.querySelector('#profil-editeur-corps');
  if (!editeur || !corps) return;

  const obtenus = obtenusTries(donnees);
  const parCle = new Map(obtenus.map((b) => [b.cle, b]));
  const state = {
    actif: { zone: 'banniere', index: 0 },
    banniere: [selection.vedette?.cle ?? null, ...selection.secondaires.map((b) => b.cle)].slice(0, 4),
    arsenal: selection.arsenal.map((b) => b.cle).slice(0, 5),
  };
  while (state.banniere.length < 4) state.banniere.push(null);
  while (state.arsenal.length < 5) state.arsenal.push(null);

  const rendre = () => {
    corps.innerHTML = contenuEditeur(state, obtenus, parCle);
  };

  racine.querySelectorAll('[data-open-personnalisation]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const zone = bouton.dataset.openPersonnalisation === 'arsenal' ? 'arsenal' : 'banniere';
      state.actif = { zone, index: 0 };
      editeur.hidden = false;
      rendre();
      editeur.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  editeur.addEventListener('click', async (e) => {
    const slot = e.target.closest('[data-editor-slot]');
    if (slot) {
      state.actif = { zone: slot.dataset.editorZone, index: Number(slot.dataset.editorSlot) };
      rendre();
      return;
    }

    const badge = e.target.closest('[data-editor-badge]');
    if (badge) {
      const cle = badge.dataset.editorBadge;
      const tableau = state.actif.zone === 'arsenal' ? state.arsenal : state.banniere;
      for (let i = 0; i < tableau.length; i++) if (tableau[i] === cle) tableau[i] = null;
      tableau[state.actif.index] = cle;
      rendre();
      return;
    }

    const vider = e.target.closest('[data-editor-clear]');
    if (vider) {
      const tableau = vider.dataset.editorZone === 'arsenal' ? state.arsenal : state.banniere;
      tableau[Number(vider.dataset.editorClear)] = null;
      rendre();
      return;
    }

    const action = e.target.closest('[data-editor-action]')?.dataset.editorAction;
    if (action === 'cancel') {
      editeur.hidden = true;
      return;
    }
    if (action === 'save') {
      const bouton = e.target.closest('[data-editor-action]');
      bouton.disabled = true;
      try {
        const maj = await sauverPreferencesProfil(contexte.utilisateur, {
          vedette: state.banniere[0],
          banniere: state.banniere.slice(1).filter(Boolean),
          arsenal: state.arsenal.filter(Boolean),
        });
        Object.assign(contexte.utilisateur, maj);
        toast('Ton étendard et ta vitrine sont enregistrés.', 'succes');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(err.message, 'erreur');
        bouton.disabled = false;
      }
    }
  });
}

function contenuEditeur(state, obtenus, parCle) {
  const ligne = (zone, liste, noms) => `
    <div class="profil-editeur__zone">
      <div class="profil-editeur__zone-titre">
        <strong>${zone === 'banniere' ? 'Étendard' : 'Vitrine Arsenal'}</strong>
        <span>${zone === 'banniere' ? '1 vedette + 3 badges secondaires' : '5 distinctions au choix'}</span>
      </div>
      <div class="profil-editeur__slots profil-editeur__slots--${zone}">
        ${liste.map((cle, index) => {
          const badge = parCle.get(cle);
          const actif = state.actif.zone === zone && state.actif.index === index;
          return `<div class="profil-editeur__slot-wrap">
            <button class="profil-editeur__slot${actif ? ' actif' : ''}" type="button"
                    data-editor-zone="${zone}" data-editor-slot="${index}">
              ${badge ? medailleBadge(badge, { vedette: zone === 'banniere' && index === 0, mini: zone === 'banniere' && index > 0 }) : '<span class="profil-editeur__plus">+</span>'}
            </button>
            <span>${esc(noms[index])}</span>
            ${badge ? `<button class="profil-editeur__retirer" type="button" data-editor-zone="${zone}" data-editor-clear="${index}">Retirer</button>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;

  return `
    <div class="profil-editeur__grille">
      ${ligne('banniere', state.banniere, ['Vedette', 'Badge 2', 'Badge 3', 'Badge 4'])}
      ${ligne('arsenal', state.arsenal, ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5'])}
    </div>

    <div class="profil-editeur__collection">
      <div class="profil-editeur__zone-titre">
        <strong>Tes distinctions</strong>
        <span>${obtenus.length} badge${obtenus.length > 1 ? 's' : ''} disponible${obtenus.length > 1 ? 's' : ''}</span>
      </div>
      ${obtenus.length
        ? `<div class="profil-editeur__badges">
            ${obtenus.map((badge) => `
              <button class="profil-editeur__badge" type="button" data-editor-badge="${esc(badge.cle)}">
                ${medailleBadge(badge, { mini: true })}
                <span><strong>${esc(badge.nom)}</strong><small>${esc(libelleRareteV2(badge))} · ${esc(badge.famille)}</small></span>
              </button>`).join('')}
          </div>`
        : '<p class="profil-editeur__vide">Décroche ton premier badge pour commencer à personnaliser ton profil.</p>'}
    </div>

    <div class="profil-editeur__bas">
      <button class="btn btn--secondaire" type="button" data-editor-action="cancel">Annuler</button>
      <button class="btn" type="button" data-editor-action="save">Enregistrer mon profil</button>
    </div>`;
}

function primeCompacte(prime, donnees) {
  if (!prime) return '';
  const serie = prime.disponible ? prime.serie_prochaine : prime.serie_actuelle;
  const heures = Math.ceil((prime.attente_ms || 0) / 3600000);
  const inarretable = donnees?.badges?.find((b) => b.cle === 'inarretable');

  const jours = Array.from({ length: PRIME_SERIE_MAX }, (_, i) => {
    const jour = i + 1;
    const acquis = prime.disponible ? jour < serie : jour <= serie;
    const vise = prime.disponible && jour === serie;
    const coffre = jour === PRIME_SERIE_MAX;
    const montant = prime.paliers?.[i] ?? '';
    return `<span class="profil-prime__jour${acquis ? ' profil-prime__jour--ok' : ''}${vise ? ' profil-prime__jour--maintenant' : ''}${coffre ? ' profil-prime__jour--coffre' : ''}"
                  title="Jour ${jour} : ${montant} Frags">
              <small>J${jour}</small>
              <b>${coffre ? '🎁' : `+${montant}`}</b>
            </span>`;
  }).join('');

  return `
    <section class="profil-section profil-section--serie">
      <div class="profil-section__corps profil-prime">
        <div class="profil-prime__contenu">
          <div class="profil-prime__titre">
            <strong>🔥 Série de connexion</strong>
            <span>Jour ${serie} / ${PRIME_SERIE_MAX}</span>
          </div>
          <div class="profil-prime__jours">${jours}</div>
          <p class="profil-prime__aide">
            ${
              prime.disponible
                ? `Aujourd’hui : +${prime.montant} Frags.${!inarretable?.obtenu ? ' Termine une série 7/7 pour décrocher le badge Rare « Inarrêtable ».' : ' Le jour 7 reste ton coffre de série.'}`
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

function verifierLevelUp(racine, niveau) {
  const id = contexte.utilisateur?.id;
  if (!id) return;
  const cle = `clutch.profile.level.${id}`;
  const precedent = Number(localStorage.getItem(cle) || 0);
  localStorage.setItem(cle, String(niveau.niveau));
  if (!precedent || niveau.niveau <= precedent) return;

  const overlay = document.createElement('div');
  overlay.className = 'profil-levelup';
  overlay.innerHTML = `
    <div class="profil-levelup__carte">
      <span class="profil-levelup__sur">Niveau supérieur</span>
      ${logoClutch(niveau.niveau)}
      <strong>NIVEAU ${niveau.niveau}</strong>
      <h2>${esc(niveau.titre)}</h2>
      <p>Ton emblème Clutch vient d’évoluer.</p>
      <button class="btn" type="button">Continuer</button>
    </div>`;
  overlay.querySelector('button')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  racine.appendChild(overlay);
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
