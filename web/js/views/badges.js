import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, frags, vide } from '../ui.js';
import {
  FAMILLES_BADGES, RARETE_BADGE, xpDuBadge, xpDetaillee, progressionNiveau,
} from '../core.js';

/**
 * L'Arsenal — les badges, mis en scène.
 *
 * Ce ne sont PAS de nouveaux trophées. Les vingt et un badges existent, sont
 * calculés, et vivaient jusqu'ici dans une grille plate. L'Arsenal les sort de
 * la grille : socles, les plus rares en avant, les non obtenus visibles mais
 * éteints — un badge qu'on ne voit pas ne donne envie de rien, c'est la règle
 * depuis le premier jour.
 *
 * Une seconde collection parallèle aurait signifié deux endroits où lire la
 * même performance, et deux jeux de règles à tenir. Écarté.
 *
 * Le niveau vit ici parce que c'est ici qu'il se gagne : l'essentiel de l'XP
 * vient des badges. Voir le bandeau et la vitrine côte à côte, c'est voir la
 * cause et l'effet.
 */

const ORDRE_RARETE = { rare: 0, exigeant: 1, commun: 2 };
const LIBELLE_RARETE = { rare: 'Rare', exigeant: 'Exigeant', commun: 'Commun' };

export async function vueBadges(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil, pronostique, et l’arsenal se remplira.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const donnees = await api.mesBadges();
  if (!donnees) {
    racine.innerHTML = vide('Rien à afficher', 'Impossible de calculer ton arsenal pour le moment.');
    return;
  }

  const { badges, recap } = donnees;
  const u = contexte.utilisateur;
  const xp = xpDetaillee({
    badges,
    recap,
    note: u?.note ?? null,
    note_paris: u?.note_paris ?? recap.paris ?? 0,
  });
  const n = progressionNiveau(xp.total);
  const obtenus = badges.filter((b) => b.obtenu);

  racine.innerHTML = `
    <p><a href="#/profil">← Mon profil</a></p>
    <div class="entete-page">
      <h1>Arsenal</h1>
      <p>${obtenus.length} trophée${obtenus.length > 1 ? 's' : ''} sur ${badges.length} —
         sur toute ta carrière, saisons confondues.</p>
    </div>

    ${bandeauNiveau(n, xp)}

    ${vitrine(obtenus)}

    ${FAMILLES_BADGES.map((f) => famille(f, badges.filter((b) => b.famille === f))).join('')}

    <h2 style="margin-top:34px">Où tu en es</h2>
    <div class="grille grille--stats">
      <div class="stat"><div class="stat__valeur">${recap.paris}</div><div class="stat__libelle">Pronostics réglés</div></div>
      <div class="stat"><div class="stat__valeur">${Number(recap.cote_max_gagnee).toFixed(2)}</div><div class="stat__libelle">Plus gros multiplicateur</div></div>
      <div class="stat"><div class="stat__valeur">${recap.plus_longue_serie}</div><div class="stat__libelle">Plus longue série</div></div>
      <div class="stat"><div class="stat__valeur">${recap.saisons_jouees ?? 0}</div><div class="stat__libelle">Saisons jouées</div></div>
      <div class="stat">
        <div class="stat__valeur ${recap.net >= 0 ? 'positif' : 'negatif'}">${recap.net >= 0 ? '+' : ''}${esc(frags(recap.net))}</div>
        <div class="stat__libelle">Bénéfice net</div>
      </div>
    </div>`;
}

/** Le bandeau de niveau, et d'où vient l'XP. */
function bandeauNiveau(n, xp) {
  return `
    <div class="niveau">
      <div class="niveau__haut">
        <div>
          <div class="niveau__rang">Niveau ${n.niveau}</div>
          <div class="niveau__titre">${esc(n.titre)}</div>
        </div>
        <div class="niveau__xp">
          <strong>${n.xp.toLocaleString('fr-FR')}</strong> XP
          <div class="niveau__reste">encore ${n.restant.toLocaleString('fr-FR')} avant le niveau ${n.niveau + 1}</div>
        </div>
      </div>
      <div class="niveau__jauge" role="img"
           aria-label="${Math.round(n.part * 100)} % du niveau ${n.niveau + 1}">
        <div class="niveau__remplie" style="width:${Math.max(2, Math.round(n.part * 100))}%"></div>
      </div>
      <div class="niveau__sources">
        ${
          xp.sources.length
            ? xp.sources
                .map(
                  (s) => `<span class="niveau__source">
                    <span class="niveau__source-xp">+${s.xp.toLocaleString('fr-FR')}</span>
                    ${esc(s.libelle)} <span class="niveau__source-detail">${esc(s.detail)}</span>
                  </span>`
                )
                .join('')
            : `<span class="niveau__source niveau__source--vide">
                 Aucune expérience pour l’instant. Un pronostic posé n’en donne jamais —
                 seuls un badge décroché, une saison terminée, un palier de note franchi
                 ou un call réussi en rapportent.
               </span>`
        }
      </div>
    </div>`;
}

/** Les trois plus rares décrochés, sur socle. C'est la vitrine du profil. */
function vitrine(obtenus) {
  if (!obtenus.length) {
    return `<div class="encart" style="margin:20px 0 8px">
        La vitrine est vide. Le premier trophée arrive vite : <strong>Dans le vert</strong>
        se décroche dès que ton bénéfice repasse au-dessus de zéro.
      </div>`;
  }
  const trois = [...obtenus]
    .sort((a, b) => ORDRE_RARETE[RARETE_BADGE[a.cle]] - ORDRE_RARETE[RARETE_BADGE[b.cle]])
    .slice(0, 4);

  return `
    <h2 style="margin-top:28px">Vitrine</h2>
    <p style="color:var(--texte-faible);font-size:0.84rem;margin:-4px 0 14px">
      Tes trophées les plus rares, mis en avant automatiquement.
    </p>
    <div class="vitrine">
      ${trois
        .map(
          (b) => `<div class="socle socle--${esc(RARETE_BADGE[b.cle])}">
            <div class="socle__sceau">${sceau(b.famille)}</div>
            <div class="socle__nom">${esc(b.nom)}</div>
            <div class="socle__rarete">${esc(LIBELLE_RARETE[RARETE_BADGE[b.cle]])} · ${xpDuBadge(b.cle)} XP</div>
          </div>`
        )
        .join('')}
    </div>`;
}

function famille(nom, liste) {
  const obtenus = liste.filter((b) => b.obtenu).length;
  const trie = [...liste].sort(
    (a, b) =>
      Number(b.obtenu) - Number(a.obtenu) ||
      ORDRE_RARETE[RARETE_BADGE[a.cle]] - ORDRE_RARETE[RARETE_BADGE[b.cle]]
  );
  return `
    <h2 style="margin-top:26px">${esc(nom)} <span class="badge">${obtenus} / ${liste.length}</span></h2>
    <div class="grille grille--3">
      ${trie
        .map(
          (b) => `<div class="trophee${b.obtenu ? ' trophee--obtenu' : ''} trophee--${esc(RARETE_BADGE[b.cle])}">
            <div class="trophee__sceau">${b.obtenu ? sceau(b.famille) : '·'}</div>
            <div>
              <div class="trophee__nom">${esc(b.nom)}</div>
              <div class="trophee__desc">${esc(b.description)}</div>
              <div class="trophee__xp">${esc(LIBELLE_RARETE[RARETE_BADGE[b.cle]])} · ${xpDuBadge(b.cle)} XP</div>
            </div>
          </div>`
        )
        .join('')}
    </div>`;
}

/** Un sceau par famille — tracé, jamais chargé. */
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
  return `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
    <path d="${d}" fill="${plein ? 'currentColor' : 'none'}" stroke="currentColor"
          stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}
