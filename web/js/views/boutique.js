/**
 * THE VAULT — Boutique V2.
 *
 * La logique économique ne bouge pas : les Frags restent le gameplay, les
 * Volts restent la monnaie cosmétique, et les RPC Supabase restent la source
 * de vérité pour l'achat et l'équipement. Cette vue ne fait qu'une chose :
 * transformer le catalogue technique en showroom désirable.
 */

import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, vide, toast, jetonVolt } from '../ui.js';
import { formaterFrags } from '../core.js';

const EMPLACEMENTS = {
  piece: { nom: 'La Room', court: 'ROOM', description: 'L’espace qui donne le ton à tout ton setup.' },
  boitier: { nom: 'Boîtier', court: 'CASE', description: 'La pièce maîtresse du setup.' },
  gpu: { nom: 'Carte graphique', court: 'GPU', description: 'Le cœur visuel de ta machine.' },
  refroidissement: { nom: 'Refroidissement', court: 'COOL', description: 'Du métal, du verre et une lumière contenue.' },
  ventilation: { nom: 'Ventilation', court: 'AIR', description: 'Le mouvement et la respiration du setup.' },
  memoire: { nom: 'Mémoire', court: 'RAM', description: 'Des lignes nettes, visibles derrière la vitre.' },
  cablage: { nom: 'Câblage', court: 'WIRE', description: 'Le détail qui fait passer un bureau de propre à obsessionnel.' },
};

const COLLECTIONS = [
  {
    id: 'genesis',
    surtitre: 'COLLECTION SIGNATURE',
    nom: 'CLUTCH LAB // GENESIS',
    description: 'Le sommet de la première génération Clutch. Noir, verre et énergie Volt.',
    ids: ['piece-3', 'boitier-4', 'gpu-4', 'refroid-4', 'vent-4'],
  },
  {
    id: 'volt-core',
    surtitre: 'SÉRIE ÉNERGIE',
    nom: 'VOLT // CORE',
    description: 'La ligne qui fait apparaître l’énergie Clutch dans chaque détail du setup.',
    ids: ['boitier-3', 'gpu-3', 'refroid-3', 'vent-3', 'memoire-3', 'cablage-3'],
  },
  {
    id: 'workshop',
    surtitre: 'SÉRIE WORKSHOP',
    nom: 'WORKSHOP // MK II',
    description: 'Le premier vrai saut visuel : propre, construit, déjà personnel.',
    ids: ['piece-2', 'boitier-2', 'gpu-2', 'refroid-2', 'vent-2', 'memoire-2', 'cablage-2'],
  },
];

const TABS = [
  ['a-la-une', 'À la une'],
  ['room', 'Room'],
  ['profil', 'Profil'],
  ['collections', 'Collections'],
  ['pass', 'Pass'],
  ['mes-objets', 'Mes objets'],
];

const ROMAINS = ['', 'I', 'II', 'III', 'IV'];

export async function vueBoutique(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'The Vault est verrouillé',
      'Crée ton profil pour gagner des Volts et construire ton identité Clutch.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  let donnees = await api.boutique();
  if (!donnees) {
    racine.innerHTML = vide('The Vault est hors ligne', 'Impossible de charger le catalogue pour le moment.');
    return;
  }

  let onglet = 'a-la-une';
  let previewId = null;
  let unlockId = null;
  let busy = false;

  const rendre = () => {
    racine.innerHTML = pageVault(donnees, { onglet, previewId, unlockId });
  };

  rendre();

  racine.addEventListener('click', async (event) => {
    const tab = event.target.closest('[data-vault-tab]');
    if (tab) {
      onglet = tab.dataset.vaultTab;
      previewId = null;
      unlockId = null;
      rendre();
      return;
    }

    const preview = event.target.closest('[data-preview]');
    if (preview) {
      previewId = preview.dataset.preview;
      unlockId = null;
      rendre();
      requestAnimationFrame(() => racine.querySelector('.vault-preview__close')?.focus());
      return;
    }

    if (event.target.closest('[data-close-preview]')) {
      previewId = null;
      rendre();
      return;
    }

    if (event.target.closest('[data-close-unlock]')) {
      unlockId = null;
      rendre();
      return;
    }

    const voirUnlock = event.target.closest('[data-open-unlock-preview]');
    if (voirUnlock) {
      previewId = voirUnlock.dataset.openUnlockPreview;
      unlockId = null;
      rendre();
      return;
    }

    const acheter = event.target.closest('[data-acheter]');
    if (acheter && !busy) {
      const id = acheter.dataset.acheter;
      busy = true;
      acheter.disabled = true;
      try {
        const reponse = await api.acheterObjet(id);
        donnees = await api.boutique();
        previewId = null;
        unlockId = id;
        synchroniserSoldeVolts(reponse?.solde ?? donnees.solde);
        rendre();
      } catch (e) {
        toast(e.message || 'Achat impossible.', 'erreur');
        acheter.disabled = false;
      } finally {
        busy = false;
      }
      return;
    }

    const equiper = event.target.closest('[data-equiper]');
    if (equiper && !busy) {
      const id = equiper.dataset.equiper;
      busy = true;
      equiper.disabled = true;
      try {
        await api.equiperObjet(id);
        donnees = await api.boutique();
        previewId = null;
        toast('Objet équipé dans ta Room.', 'succes');
        rendre();
      } catch (e) {
        toast(e.message || 'Impossible d’équiper cet objet.', 'erreur');
        equiper.disabled = false;
      } finally {
        busy = false;
      }
    }
  });
}

function pageVault({ solde = 0, objets = [] }, etat) {
  const payants = objets.filter((o) => o.niveau > 1);
  const possedes = payants.filter((o) => o.possede).length;
  const preview = objets.find((o) => o.id === etat.previewId) ?? null;
  const unlock = objets.find((o) => o.id === etat.unlockId) ?? null;

  return `
    <div class="vault">
      <header class="vault-head">
        <div>
          <span class="vault-kicker">BOUTIQUE // COLLECTION</span>
          <h1>THE VAULT</h1>
          <p>Personnalise ton identité. Construis ta Room. Rien ici n’améliore tes pronostics.</p>
        </div>
        <div class="vault-balance" title="Tes Volts disponibles">
          ${jetonVolt(20)}
          <span>${esc(formaterFrags(solde))}</span>
          <small>VOLTS</small>
        </div>
      </header>

      <nav class="vault-tabs" aria-label="Sections de The Vault">
        ${TABS.map(([id, label]) => `
          <button type="button" class="vault-tab${etat.onglet === id ? ' is-active' : ''}"
                  data-vault-tab="${id}"${etat.onglet === id ? ' aria-current="page"' : ''}>
            ${label}
          </button>`).join('')}
      </nav>

      ${contenuOnglet(etat.onglet, objets, solde)}
      ${preview ? panneauPreview(preview, solde) : ''}
      ${unlock ? panneauUnlock(unlock) : ''}
    </div>

    <p class="vault-legal">
      ${possedes} objet${possedes > 1 ? 's' : ''} cosmétique${possedes > 1 ? 's' : ''} débloqué${possedes > 1 ? 's' : ''}
      sur ${payants.length}. Les Volts ne sont ni misables, ni convertibles, ni liés à ton classement.
    </p>`;
}

function contenuOnglet(onglet, objets, solde) {
  switch (onglet) {
    case 'room':
      return ongletRoom(objets, solde);
    case 'profil':
      return ongletProfil();
    case 'collections':
      return ongletCollections(objets, solde);
    case 'pass':
      return ongletPass();
    case 'mes-objets':
      return ongletInventaire(objets, solde);
    case 'a-la-une':
    default:
      return ongletUne(objets, solde);
  }
}

function ongletUne(objets, solde) {
  const hero = objetsCollection(objets, COLLECTIONS[0]);
  const recommandations = pourToi(objets, solde);
  const drop = dropDuJour(objets);
  const equipes = setupEquipe(objets);

  return `
    ${heroCollection(COLLECTIONS[0], hero)}

    <section class="vault-section vault-section--tight">
      <div class="vault-section__head">
        <div>
          <span class="vault-kicker">SÉLECTION PERSONNELLE</span>
          <h2>Pour toi</h2>
        </div>
        <span class="vault-section__note">Choisis. Prévisualise. Débloque.</span>
      </div>
      <div class="vault-picks">
        ${recommandations.map((o, i) => carteObjet(o, solde, { featured: i === 0 })).join('') || videInterne('Tout est déjà dans ta collection.')}
      </div>
    </section>

    ${drop ? dropSection(drop, solde) : ''}

    <section class="vault-section">
      <div class="vault-section__head">
        <div>
          <span class="vault-kicker">TON ESPACE</span>
          <h2>Room preview</h2>
        </div>
        <button class="vault-text-link" type="button" data-vault-tab="room">Explorer les upgrades →</button>
      </div>
      ${roomStage(equipes)}
    </section>

    <section class="vault-section">
      <div class="vault-section__head">
        <div>
          <span class="vault-kicker">ENSEMBLES</span>
          <h2>Collections</h2>
        </div>
        <button class="vault-text-link" type="button" data-vault-tab="collections">Tout voir →</button>
      </div>
      <div class="vault-collection-strip">
        ${COLLECTIONS.map((c) => miniCollection(c, objets)).join('')}
      </div>
    </section>

    ${passPreview()}`;
}

function heroCollection(collection, liste) {
  const acquis = liste.filter((o) => o.possede).length;
  const objetsVisuels = (liste.length ? liste : []).slice(0, 4);
  return `
    <section class="vault-hero">
      <div class="vault-hero__copy">
        <span class="vault-kicker">${esc(collection.surtitre)}</span>
        <p class="vault-hero__season">DROP 01 // GENESIS</p>
        <h2>CLUTCH<br><span>LAB</span></h2>
        <p>${esc(collection.description)}</p>
        <div class="vault-hero__meta">
          <span>${acquis} / ${liste.length} possédés</span>
          <span>100 % cosmétique</span>
        </div>
        <button type="button" class="vault-cta" data-vault-tab="collections">
          EXPLORER LA COLLECTION <span>↗</span>
        </button>
      </div>
      <div class="vault-hero__stage" aria-label="Objets de la collection Genesis">
        <div class="vault-hero__orb vault-hero__orb--one"></div>
        <div class="vault-hero__orb vault-hero__orb--two"></div>
        ${objetsVisuels.map((o, i) => `
          <button type="button" class="vault-hero-object vault-hero-object--${i + 1}"
                  data-preview="${esc(o.id)}" aria-label="Voir ${esc(o.nom)}">
            ${artefact(o, 'hero')}
            <span>${esc(o.nom)}</span>
          </button>`).join('')}
        <div class="vault-hero__grid" aria-hidden="true"></div>
      </div>
      <div class="vault-hero__stamp" aria-hidden="true">VLT<br>01</div>
    </section>`;
}

function pourToi(objets, solde) {
  const verrouilles = objets
    .filter((o) => o.niveau > 1 && !o.possede)
    .sort((a, b) => Number(b.prix <= solde) - Number(a.prix <= solde) || a.prix - b.prix);

  if (verrouilles.length >= 3) return verrouilles.slice(0, 3);

  const acquis = objets
    .filter((o) => o.niveau > 1 && o.possede)
    .sort((a, b) => b.niveau - a.niveau || b.prix - a.prix);

  return [...verrouilles, ...acquis.filter((o) => !verrouilles.some((x) => x.id === o.id))].slice(0, 3);
}

function dropDuJour(objets) {
  const payants = objets.filter((o) => o.niveau > 1);
  if (!payants.length) return null;
  const jour = Math.floor(Date.now() / 86400000);
  return payants[jour % payants.length];
}

function dropSection(o, solde) {
  const date = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date());
  return `
    <section class="vault-drop">
      <div class="vault-drop__index">DROP // ${esc(date)}</div>
      <button class="vault-drop__object" type="button" data-preview="${esc(o.id)}">
        ${artefact(o, 'drop')}
      </button>
      <div class="vault-drop__copy">
        <span class="vault-rarity vault-rarity--${rareteClasse(o)}">${rarete(o)}</span>
        <h2>${esc(o.nom)}</h2>
        <p>${esc(descriptionObjet(o))}</p>
        <div class="vault-drop__foot">
          <span>${prixObjet(o)}</span>
          <button type="button" class="vault-text-link" data-preview="${esc(o.id)}">Voir l’objet →</button>
        </div>
      </div>
      <div class="vault-drop__rule" aria-hidden="true"></div>
    </section>`;
}

function ongletRoom(objets, solde) {
  const groupes = Object.keys(EMPLACEMENTS)
    .map((id) => [id, objets.filter((o) => o.emplacement === id).sort((a, b) => a.niveau - b.niveau)])
    .filter(([, liste]) => liste.length);

  return `
    <section class="vault-room-intro">
      <div>
        <span class="vault-kicker">BUILD MODE</span>
        <h2>Construis la Room, objet par objet.</h2>
        <p>Les niveaux techniques existent toujours sous le capot. Ici, ils deviennent des évolutions visuelles.</p>
      </div>
      <div class="vault-room-intro__stage">${roomStage(setupEquipe(objets), true)}</div>
    </section>

    <div class="vault-racks">
      ${groupes.map(([id, liste]) => railEmplacement(id, liste, solde)).join('')}
    </div>`;
}

function railEmplacement(id, liste, solde) {
  const meta = EMPLACEMENTS[id] ?? { nom: id, court: id.toUpperCase(), description: '' };
  const equipe = liste.find((o) => o.equipe) ?? liste.find((o) => o.niveau === 1);
  return `
    <section class="vault-rack">
      <div class="vault-rack__label">
        <span>${esc(meta.court)}</span>
        <h3>${esc(meta.nom)}</h3>
        <p>${esc(meta.description)}</p>
        <small>Actuel · ${esc(equipe?.nom ?? 'Base')}</small>
      </div>
      <div class="vault-rack__rail">
        ${liste.map((o) => carteObjet(o, solde, { compact: true })).join('')}
      </div>
    </section>`;
}

function ongletProfil() {
  return `
    <section class="vault-coming">
      <div class="vault-coming__copy">
        <span class="vault-kicker">PROFILE LAB // APERÇU</span>
        <h2>Ta vitrine personnelle arrive dans The Vault.</h2>
        <p>
          Bannières, cadres, rails de badges et effets de logo seront essayables directement sur ton vrai profil.
          Les badges de performance, eux, resteront toujours à gagner — jamais à acheter.
        </p>
        <div class="vault-coming__chips">
          <span>BANNIÈRES</span><span>CADRES</span><span>BADGE RAILS</span><span>LOGO FX</span>
        </div>
      </div>
      <div class="vault-profile-demo" aria-hidden="true">
        <div class="vault-profile-demo__banner">
          <span>CLUTCH // IDENTITY</span>
          <b>${esc(contexte.utilisateur?.pseudo ?? 'PLAYER')}</b>
          <div class="vault-profile-demo__badges"><i></i><i></i><i></i></div>
        </div>
        <div class="vault-profile-demo__avatar">${esc(initiales(contexte.utilisateur?.pseudo ?? 'CL'))}</div>
      </div>
    </section>

    <section class="vault-section">
      <div class="vault-section__head"><div><span class="vault-kicker">PRINCIPE</span><h2>Essayer avant de débloquer</h2></div></div>
      <div class="vault-concepts">
        ${concept('01', 'Bannière dynamique', 'Voir ton pseudo, tes badges et ton équipe directement dans l’aperçu.')}
        ${concept('02', 'Support de badges', 'On vend la manière d’exposer un badge, jamais le badge lui-même.')}
        ${concept('03', 'Effet de logo', 'Halo, scan, particules et transformations liées à ton niveau.')}
      </div>
    </section>`;
}

function ongletCollections(objets, solde) {
  return `
    <div class="vault-collections-page">
      ${COLLECTIONS.map((collection, index) => {
        const liste = objetsCollection(objets, collection);
        const acquis = liste.filter((o) => o.possede).length;
        return `
          <section class="vault-collection-band vault-collection-band--${index + 1}">
            <div class="vault-collection-band__copy">
              <span class="vault-kicker">${esc(collection.surtitre)}</span>
              <h2>${esc(collection.nom)}</h2>
              <p>${esc(collection.description)}</p>
              <div class="vault-progress-line"><i style="--progress:${liste.length ? (acquis / liste.length) * 100 : 0}%"></i></div>
              <small>${acquis} / ${liste.length} possédés</small>
            </div>
            <div class="vault-collection-band__items">
              ${liste.map((o) => carteObjet(o, solde, { compact: true })).join('') || videInterne('Collection indisponible.')}
            </div>
          </section>`;
      }).join('')}
    </div>`;
}

function ongletPass() {
  return `
    <section class="vault-pass-page">
      <div class="vault-pass-page__hero">
        <div>
          <span class="vault-kicker">CLUTCH PASS // S01</span>
          <h2>Une saison entière à exposer.</h2>
          <p>Le Pass reliera missions, pronostics, Ligues, Communauté et objets exclusifs. Cette surface prépare son arrivée sans introduire d’avantage compétitif.</p>
          <span class="vault-status-chip">BIENTÔT</span>
        </div>
        <div class="vault-pass-emblem" aria-hidden="true"><span>C</span><i></i></div>
      </div>
      ${passTrack()}
    </section>`;
}

function ongletInventaire(objets, solde) {
  const acquis = objets
    .filter((o) => o.niveau === 1 || o.possede)
    .sort((a, b) => Number(b.equipe) - Number(a.equipe) || b.niveau - a.niveau);

  return `
    <section class="vault-inventory">
      <div class="vault-section__head">
        <div><span class="vault-kicker">MA COLLECTION</span><h2>Ce que tu peux exposer maintenant.</h2></div>
        <span class="vault-section__note">${acquis.length} objet${acquis.length > 1 ? 's' : ''}</span>
      </div>
      <div class="vault-inventory__grid">
        ${acquis.map((o) => carteObjet(o, solde)).join('') || videInterne('Ta collection est encore vide.')}
      </div>
    </section>`;
}

function carteObjet(o, solde, options = {}) {
  const classes = [
    'vault-item',
    options.featured ? 'vault-item--featured' : '',
    options.compact ? 'vault-item--compact' : '',
    o.equipe ? 'is-equipped' : '',
    o.possede ? 'is-owned' : '',
  ].filter(Boolean).join(' ');

  return `
    <article class="${classes}">
      <button type="button" class="vault-item__visual" data-preview="${esc(o.id)}" aria-label="Voir ${esc(o.nom)}">
        <span class="vault-item__index">${String(o.niveau).padStart(2, '0')}</span>
        ${artefact(o, options.compact ? 'compact' : 'card')}
        ${o.equipe ? '<span class="vault-equipped-dot">ÉQUIPÉ</span>' : ''}
      </button>
      <div class="vault-item__body">
        <div class="vault-item__meta">
          <span class="vault-rarity vault-rarity--${rareteClasse(o)}">${rarete(o)}</span>
          <span>${esc(EMPLACEMENTS[o.emplacement]?.court ?? o.emplacement)}</span>
        </div>
        <h3>${esc(o.nom)}</h3>
        ${!options.compact ? `<p>${esc(descriptionObjet(o))}</p>` : ''}
        <div class="vault-item__foot">
          <span class="vault-item__price">${prixObjet(o)}</span>
          ${actionObjet(o, solde, true)}
        </div>
      </div>
    </article>`;
}

function roomStage(objets, compact = false) {
  const visibles = objets.filter(Boolean).slice(0, compact ? 5 : 6);
  return `
    <div class="vault-room-stage${compact ? ' vault-room-stage--compact' : ''}">
      <div class="vault-room-stage__wall"></div>
      <div class="vault-room-stage__desk"></div>
      <div class="vault-room-stage__screen"><i></i></div>
      <div class="vault-room-stage__light"></div>
      ${visibles.map((o, i) => `
        <button type="button" class="vault-room-node vault-room-node--${(i % 6) + 1}"
                data-preview="${esc(o.id)}" title="${esc(o.nom)}">
          ${artefact(o, 'room')}
          <span>${esc(o.nom)}</span>
        </button>`).join('')}
      <div class="vault-room-stage__floor"></div>
    </div>`;
}

function setupEquipe(objets) {
  return Object.keys(EMPLACEMENTS)
    .map((emplacement) => {
      const liste = objets.filter((o) => o.emplacement === emplacement);
      return liste.find((o) => o.equipe) ?? liste.find((o) => o.niveau === 1) ?? null;
    })
    .filter(Boolean);
}

function miniCollection(collection, objets) {
  const liste = objetsCollection(objets, collection);
  const acquis = liste.filter((o) => o.possede).length;
  const premier = liste[0];
  return `
    <button type="button" class="vault-mini-collection" data-vault-tab="collections">
      <div class="vault-mini-collection__visual">${premier ? artefact(premier, 'mini') : ''}</div>
      <div>
        <span>${esc(collection.surtitre)}</span>
        <h3>${esc(collection.nom)}</h3>
        <small>${acquis}/${liste.length} possédés</small>
      </div>
      <i style="--progress:${liste.length ? (acquis / liste.length) * 100 : 0}%"></i>
    </button>`;
}

function passPreview() {
  return `
    <section class="vault-pass-preview">
      <div>
        <span class="vault-kicker">CLUTCH PASS // S01</span>
        <h2>Ta saison, transformée en collection.</h2>
        <p>Objets Room, titres, cadres et reliques — sans bonus de performance.</p>
      </div>
      <div class="vault-pass-preview__nodes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <button type="button" class="vault-text-link" data-vault-tab="pass">APERÇU DU PASS →</button>
    </section>`;
}

function passTrack() {
  const recompenses = ['ROOM', 'BADGE FX', 'VOLTS', 'BANNIÈRE', 'RELIQUE', 'TITLE'];
  return `
    <section class="vault-pass-track">
      ${recompenses.map((nom, index) => `
        <div class="vault-pass-node">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <i></i>
          <b>${nom}</b>
        </div>`).join('')}
    </section>`;
}

function concept(numero, titre, texte) {
  return `
    <article class="vault-concept">
      <span>${numero}</span>
      <h3>${esc(titre)}</h3>
      <p>${esc(texte)}</p>
    </article>`;
}

function panneauPreview(o, solde) {
  const collection = COLLECTIONS.find((c) => c.ids.includes(o.id));
  return `
    <div class="vault-preview-layer" role="presentation">
      <button class="vault-preview__backdrop" type="button" data-close-preview aria-label="Fermer l’aperçu"></button>
      <section class="vault-preview" role="dialog" aria-modal="true" aria-labelledby="vault-preview-title">
        <button type="button" class="vault-preview__close" data-close-preview aria-label="Fermer">×</button>
        <div class="vault-preview__visual">
          <span class="vault-preview__serial">VLT/${esc(String(o.niveau).padStart(2, '0'))}</span>
          ${artefact(o, 'preview')}
          <div class="vault-preview__halo"></div>
        </div>
        <div class="vault-preview__copy">
          <span class="vault-kicker">${esc(collection?.nom ?? 'CLUTCH WORKSHOP')}</span>
          <div class="vault-preview__meta">
            <span class="vault-rarity vault-rarity--${rareteClasse(o)}">${rarete(o)}</span>
            <span>${esc(EMPLACEMENTS[o.emplacement]?.nom ?? o.emplacement)}</span>
          </div>
          <h2 id="vault-preview-title">${esc(o.nom)}</h2>
          <p>${esc(descriptionObjet(o))}</p>
          <dl class="vault-preview__specs">
            <div><dt>Évolution</dt><dd>${esc(ROMAINS[o.niveau] ?? String(o.niveau))}</dd></div>
            <div><dt>Usage</dt><dd>Cosmétique</dd></div>
            <div><dt>Collection</dt><dd>${esc(collection?.nom ?? 'Workshop')}</dd></div>
          </dl>
          <div class="vault-preview__purchase">
            <strong>${prixObjet(o)}</strong>
            ${actionObjet(o, solde, false)}
          </div>
          ${!o.possede && o.niveau > 1 && solde < o.prix
            ? `<small class="vault-preview__missing">Il te manque ${esc(formaterFrags(o.prix - solde))} Volts.</small>`
            : ''}
        </div>
      </section>
    </div>`;
}

function panneauUnlock(o) {
  return `
    <div class="vault-unlock-layer">
      <button type="button" class="vault-unlock__backdrop" data-close-unlock aria-label="Fermer"></button>
      <section class="vault-unlock" role="dialog" aria-modal="true" aria-label="Objet débloqué">
        <div class="vault-unlock__burst" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <span class="vault-kicker">AJOUTÉ À TA COLLECTION</span>
        <h2>OBJET<br>DÉBLOQUÉ</h2>
        <div class="vault-unlock__artifact">${artefact(o, 'unlock')}</div>
        <span class="vault-rarity vault-rarity--${rareteClasse(o)}">${rarete(o)}</span>
        <h3>${esc(o.nom)}</h3>
        <p>Débloqué et équipé automatiquement dans ta Room.</p>
        <div class="vault-unlock__actions">
          <button type="button" class="vault-cta" data-open-unlock-preview="${esc(o.id)}">VOIR L’OBJET</button>
          <button type="button" class="vault-text-link" data-close-unlock>Continuer la collection</button>
        </div>
      </section>
    </div>`;
}

function actionObjet(o, solde, compact) {
  const gratuit = o.niveau === 1;
  if (o.equipe) return '<span class="vault-action vault-action--equipped">ÉQUIPÉ</span>';
  if (o.possede || gratuit) {
    return `<button type="button" class="vault-action${compact ? ' vault-action--small' : ''}" data-equiper="${esc(o.id)}">ÉQUIPER</button>`;
  }
  if (solde >= o.prix) {
    return `<button type="button" class="vault-action vault-action--buy${compact ? ' vault-action--small' : ''}" data-acheter="${esc(o.id)}">DÉBLOQUER</button>`;
  }
  return `<span class="vault-action vault-action--locked">VERROUILLÉ</span>`;
}

function artefact(o, taille = 'card') {
  const type = typeObjet(o.emplacement);
  const niveau = Math.max(1, Math.min(4, Number(o.niveau) || 1));
  return `
    <span class="vault-artifact vault-artifact--${type} vault-artifact--${taille}" data-level="${niveau}" aria-hidden="true">
      <i class="vault-artifact__a"></i>
      <i class="vault-artifact__b"></i>
      <i class="vault-artifact__c"></i>
      <i class="vault-artifact__spark"></i>
    </span>`;
}

function typeObjet(emplacement) {
  return Object.prototype.hasOwnProperty.call(EMPLACEMENTS, emplacement) ? emplacement : 'piece';
}

function objetsCollection(objets, collection) {
  return collection.ids.map((id) => objets.find((o) => o.id === id)).filter(Boolean);
}

function rarete(o) {
  if (o.niveau >= 4) return 'RELIQUE';
  if (o.niveau === 3) return 'ÉPIQUE';
  if (o.niveau === 2) return 'RARE';
  return 'STANDARD';
}

function rareteClasse(o) {
  if (o.niveau >= 4) return 'relique';
  if (o.niveau === 3) return 'epique';
  if (o.niveau === 2) return 'rare';
  return 'standard';
}

function prixObjet(o) {
  if (o.niveau === 1 || o.prix === 0) return 'INCLUS';
  return `⚡ ${esc(formaterFrags(o.prix))}`;
}

function descriptionObjet(o) {
  const meta = EMPLACEMENTS[o.emplacement];
  const evolutions = {
    1: 'La version de départ. Fonctionnelle, brute, prête à être remplacée.',
    2: 'La première vraie évolution visuelle de ton setup.',
    3: 'Une pièce forte, pensée pour devenir immédiatement identifiable.',
    4: 'La version signature : présence maximale, finition Clutch Lab.',
  };
  return `${meta?.description ?? 'Un objet cosmétique pour ta collection.'} ${evolutions[o.niveau] ?? ''}`.trim();
}

function videInterne(texte) {
  return `<div class="vault-empty"><span>◇</span><p>${esc(texte)}</p></div>`;
}

function synchroniserSoldeVolts(solde) {
  const cible = document.querySelector('#solde-volts .solde__valeur');
  if (cible && Number.isFinite(Number(solde))) cible.textContent = formaterFrags(Number(solde));
}

function initiales(nom) {
  const mots = String(nom || '').trim().split(/[\s._-]+/).filter(Boolean);
  if (!mots.length) return 'CL';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}
