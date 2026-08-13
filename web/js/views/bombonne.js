/**
 * La bombonne d'élixir.
 *
 * Une vraie dame-jeanne dessinée en SVG : bouchon, col, épaules, panse. Le
 * liquide est un rectangle plein, découpé (`clipPath`) par la silhouette de la
 * bouteille — c'est ce découpage qui fait que le jus épouse exactement la forme
 * du verre au lieu de flotter dedans, y compris dans les épaules où la largeur
 * change.
 *
 * Aucune image, aucune dépendance : le fichier pèse ce que pèse son texte, et
 * reste net sur un écran Retina comme sur une carte partagée en 1200 px.
 */

const SILHOUETTE =
  'M 50 20 L 50 44 C 50 54 16 66 16 112 C 16 148 34 168 60 168 ' +
  'C 86 168 104 148 104 112 C 104 66 70 54 70 44 L 70 20 Z';

/**
 * Niveau du liquide. 166 = le fond, 43 = la naissance du col.
 *
 * On s'arrête volontairement sous le col : dans un goulot de 20 px de large,
 * l'ondulation de surface devient une diagonale qui donne l'impression d'un
 * dessin cassé plutôt que d'une bouteille pleine.
 */
const FOND = 166;
const PLEIN = 43;

let compteur = 0;

/**
 * @param {object} p  le retour de core.palierCommunaute()
 * @param {object} options
 * @param {boolean} options.bulles  fait monter trois bulles (défaut : oui)
 */
export function bombonne(p, { bulles = true } = {}) {
  // Chaque instance a ses propres identifiants : deux bombonnes sur la même
  // page partageraient sinon le même clipPath, et la seconde effacerait la
  // première.
  const id = `bb${++compteur}`;
  const taux = Math.min(1, Math.max(0, p.progression));
  const y = FOND - taux * (FOND - PLEIN);

  // Une surface parfaitement plate ferait « verre à moitié rempli sur un
  // schéma » ; deux ondulations suffisent à faire liquide. L'amplitude
  // s'écrase à mesure qu'on approche du plein : en haut la bouteille se
  // resserre, et une grosse vague y déborderait de la silhouette.
  const amplitude = (7 * (1 - 0.75 * taux)).toFixed(2);
  const vague =
    `M 0 ${y.toFixed(1)} q 15 -${amplitude} 30 0 t 30 0 t 30 0 t 30 0 t 30 0 ` +
    `L 150 180 L 0 180 Z`;

  return `
    <div class="bombonne${taux === 0 ? ' bombonne--vide' : ''}" role="img"
         aria-label="${p.membres} membre${p.membres > 1 ? 's' : ''}, palier ${p.nom}${
           p.max ? ', au maximum' : ` sur ${p.objectif}`
         }">
      <svg viewBox="0 0 120 180">
        <defs>
          <clipPath id="${id}-verre"><path d="${SILHOUETTE}" /></clipPath>
          <linearGradient id="${id}-jus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--accent)" />
            <stop offset="1" stop-color="var(--accent-sombre)" />
          </linearGradient>
          <linearGradient id="${id}-reflet" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="rgba(255,255,255,0.22)" />
            <stop offset="1" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <!-- Le verre vide, derrière tout le reste -->
        <path d="${SILHOUETTE}" class="bombonne__verre" />

        <!-- Le liquide, découpé par la silhouette -->
        <g clip-path="url(#${id}-verre)">
          ${taux > 0 ? `<path class="bombonne__jus" d="${vague}" fill="url(#${id}-jus)" />` : ''}
          ${
            bulles && taux > 0.08
              ? `<g class="bombonne__bulles" style="--plancher:${(FOND - y).toFixed(0)}px">
                   <circle cx="46" cy="160" r="3.1" />
                   <circle cx="66" cy="160" r="2.2" />
                   <circle cx="56" cy="160" r="4" />
                 </g>`
              : ''
          }
        </g>

        <!-- Reflet et contour, par-dessus le liquide -->
        <path d="M 34 74 C 26 88 24 104 24 118" class="bombonne__eclat" />
        <path d="${SILHOUETTE}" class="bombonne__contour" fill="none" />

        <!-- Col et bouchon -->
        <rect x="45" y="6" width="30" height="13" rx="4" class="bombonne__bouchon" />
        <path d="M 50 20 h 20" class="bombonne__contour" fill="none" />
      </svg>
    </div>`;
}
