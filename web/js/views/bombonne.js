/**
 * Clutch — moteur des récipients communautaires.
 *
 * Le contenant est maintenant l'objet principal : cristal épais, monture
 * métallique, patine, gravures et énergie interne. Les 7 niveaux gardent un
 * même langage, mais leur silhouette change réellement.
 *
 * IMPORTANT : toutes les formes partagent un viewBox 120 × 190 et sont
 * dessinées autour de son centre. On n'a donc plus besoin de déplacer les
 * petites bouteilles à l'œil avec du CSS pour les aligner dans le réacteur.
 */

const RECIPIENTS = [
  {
    // I · Fiole — relique d'amorçage. Fine, mais centrée dans le viewBox.
    d: 'M 54 43 L 54 57 C 54 66 49 70 49 82 L 49 126 C 49 139 53 146 60 146 ' +
       'C 67 146 71 139 71 126 L 71 82 C 71 70 66 66 66 57 L 66 43 Z',
    fond: 143, plein: 71,
    bouchon:
      '<rect x="51" y="30" width="18" height="13" rx="4" class="bb__bouchon bb__metal" />' +
      '<path d="M 52 38 H 68" class="bb__patine" />',
    orn:
      '<path d="M 54 58 H 66" class="bb__metal-ligne" />' +
      '<path d="M 51 87 H 69" class="bb__rune" />' +
      '<path d="M 55 84 v6 M60 84 v6 M65 84 v6" class="bb__rune bb__rune--fin" />',
    bulles: [[56, 137, 1.7], [63, 132, 1.25], [60, 141, 1.1]],
    noyau: [60, 136, 5.5],
    grain: 0.16,
  },
  {
    // II · Flacon — potion premium, ventre plus généreux et monture croisée.
    d: 'M 52 32 L 52 54 C 52 67 36 76 34 103 C 32 132 43 153 60 156 ' +
       'C 77 153 88 132 86 103 C 84 76 68 67 68 54 L 68 32 Z',
    fond: 153, plein: 68,
    bouchon:
      '<rect x="48" y="19" width="24" height="14" rx="5" class="bb__bouchon bb__metal" />' +
      '<path d="M 50 27 H 70" class="bb__patine" />',
    orn:
      '<path d="M 52 54 H 68" class="bb__metal-ligne" />' +
      '<path d="M 42 91 C 51 99 69 99 78 91" class="bb__metal-ligne bb__metal-ligne--doux" />' +
      '<path d="M 41 82 C 51 98 65 111 79 122 M79 82 C 68 98 55 111 42 122" class="bb__rune" />',
    bulles: [[48, 145, 2.1], [70, 140, 1.7], [59, 148, 2.6]],
    noyau: [60, 143, 7],
    grain: 0.2,
  },
  {
    // III · Bombonne — premier vrai réacteur portatif : verre lourd, cage et rivets.
    d: 'M 48 24 L 48 48 C 48 63 22 76 19 112 C 16 145 34 169 60 171 ' +
       'C 86 169 104 145 101 112 C 98 76 72 63 72 48 L 72 24 Z',
    fond: 168, plein: 61,
    bouchon:
      '<rect x="43" y="11" width="34" height="14" rx="4" class="bb__bouchon bb__metal" />' +
      '<circle cx="48" cy="18" r="1.5" class="bb__rivet" /><circle cx="72" cy="18" r="1.5" class="bb__rivet" />',
    orn:
      '<path d="M 48 48 H 72" class="bb__metal-ligne" />' +
      '<path d="M 27 103 C 38 94 48 89 60 89 C 72 89 82 94 93 103" class="bb__metal-ligne" />' +
      '<path d="M 24 139 Q 60 154 96 139" class="bb__metal-ligne" />' +
      '<path d="M 35 78 L 28 139 M85 78 L92 139" class="bb__rune bb__rune--cage" />' +
      '<circle cx="29" cy="139" r="2" class="bb__rivet" /><circle cx="91" cy="139" r="2" class="bb__rivet" />',
    bulles: [[39, 158, 2.6], [78, 151, 2], [60, 162, 3.4], [52, 143, 1.4]],
    noyau: [60, 155, 9],
    grain: 0.25,
  },
  {
    // IV · Calice — la verrerie devient cristal cérémoniel.
    d: 'M 46 34 L 46 56 L 17 88 L 12 130 L 33 176 L 87 176 L 108 130 ' +
       'L 103 88 L 74 56 L 74 34 Z',
    fond: 174, plein: 62,
    bouchon: '<rect x="41" y="20" width="38" height="15" rx="4" class="bb__bouchon bb__metal" />',
    orn:
      '<path d="M 17 88 L 60 106 L 103 88 M 60 106 L 60 176" class="bb__facette" />' +
      '<path d="M 12 130 L 60 148 L 108 130" class="bb__facette" />' +
      '<path d="M 34 69 L 60 82 L 86 69" class="bb__rune" />',
    bulles: [[36, 170, 3], [84, 170, 2.4], [60, 170, 4]],
    noyau: [60, 159, 10],
    grain: 0.28,
  },
  {
    // V · Alambic — machine de transmutation, globe et chambre supérieure.
    d: 'M 60 20 C 74 20 85 30 85 45 C 85 56 79 64 71 69 C 67 71 67 76 71 78 ' +
       'C 94 87 112 111 112 140 C 112 165 89 180 60 180 C 31 180 8 165 8 140 ' +
       'C 8 111 26 87 49 78 C 53 76 53 71 49 69 C 41 64 35 56 35 45 ' +
       'C 35 30 46 20 60 20 Z',
    fond: 178, plein: 34,
    bouchon: '<circle cx="60" cy="16" r="9" class="bb__bouchon bb__metal" />',
    orn:
      '<path d="M 44 74 Q 60 82 76 74" class="bb__metal-ligne" />' +
      '<path d="M 24 133 Q 60 149 96 133" class="bb__rune" />',
    bulles: [[34, 173, 3.2], [86, 173, 2.6], [60, 173, 4.3]],
    noyau: [60, 163, 11],
    grain: 0.3,
  },
  {
    // VI · Cornue — anomalie maîtrisée, volontairement asymétrique.
    d: 'M 8 128 C 8 88 31 58 60 58 C 89 58 112 88 112 128 ' +
       'C 112 160 89 181 60 181 C 31 181 8 160 8 128 Z',
    fond: 179, plein: 74,
    bouchon: '<circle cx="103" cy="26" r="8" class="bb__bouchon bb__metal" />',
    orn:
      '<path d="M 74 62 C 82 44 92 34 100 30" class="bb__col" />' +
      '<path d="M 20 118 Q 60 134 100 118" class="bb__metal-ligne" />' +
      '<path d="M 29 83 Q 60 72 90 86" class="bb__rune" />',
    bulles: [[30, 174, 3.4], [90, 174, 2.8], [60, 174, 4.6]],
    noyau: [61, 165, 12],
    grain: 0.32,
  },
  {
    // VII · Océan — réservoir sacré. La matière existe encore, mais le liquide
    // paraît déjà plus grand que son contenant.
    d: 'M 60 15 C 96 15 117 45 118 93 C 120 143 96 177 60 180 ' +
       'C 24 177 0 143 2 93 C 3 45 24 15 60 15 Z',
    fond: 177, plein: 24,
    bouchon:
      '<path d="M 43 15 Q 60 5 77 15" class="bb__couronne" />' +
      '<circle cx="60" cy="13" r="4" class="bb__rivet bb__rivet--noyau" />',
    orn:
      '<ellipse cx="60" cy="101" rx="57" ry="17" class="bb__anneau" transform="rotate(-18 60 101)" />' +
      '<circle cx="60" cy="98" r="55" class="bb__halo" />' +
      '<path d="M 18 133 Q 60 153 102 133" class="bb__rune" />' +
      '<path d="M 29 44 Q 60 31 91 44" class="bb__metal-ligne bb__metal-ligne--doux" />',
    bulles: [[28, 171, 3.6], [92, 166, 3], [60, 172, 5], [46, 153, 2.1], [78, 145, 1.7]],
    noyau: [60, 158, 14],
    grain: 0.38,
  },
];

const eclat = (x, y, r) =>
  `<path d="M ${x} ${y - r} Q ${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y} ` +
  `Q ${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r} ` +
  `Q ${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y} ` +
  `Q ${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z" class="bb__eclat" />`;

let compteur = 0;

const avecId = (html, id) => (html || '').replaceAll('__ID__', id);

export function bombonne(p, { teinte = null, bulles = true } = {}) {
  const id = `bb${++compteur}`;
  const niveau = Math.min(RECIPIENTS.length, Math.max(1, p.niveau ?? 1));
  const r = RECIPIENTS[niveau - 1];

  const taux = Math.min(1, Math.max(0, p.progression ?? 0));
  const y = r.fond - taux * (r.fond - r.plein);

  const clair = teinte == null ? 'var(--accent)' : `oklch(0.75 0.19 ${teinte})`;
  const moyen = teinte == null ? 'var(--accent)' : `oklch(0.62 0.18 ${teinte})`;
  const sombre = teinte == null ? 'var(--accent-sombre)' : `oklch(0.43 0.14 ${teinte})`;

  const amplitude = (6.2 * (1 - 0.72 * taux)).toFixed(2);
  const vague =
    `M -5 ${y.toFixed(1)} q 15 -${amplitude} 30 0 t 30 0 t 30 0 t 30 0 t 30 0 ` +
    `L 150 195 L -5 195 Z`;

  const [nx, ny, nr] = r.noyau;
  const aria = `${p.membres} membre${p.membres > 1 ? 's' : ''}, palier ${p.nom}${
    p.max ? ', au maximum' : ` sur ${p.objectif}`
  }`;

  return `
    <div class="bombonne bombonne--artefact bombonne--artefact-n${niveau}${taux === 0 ? ' bombonne--vide' : ''}"
         role="img"
         style="--jus-clair:${clair};--jus-moyen:${moyen};--jus-sombre:${sombre};--grain:${r.grain}"
         aria-label="${aria}">
      <svg viewBox="0 0 120 190" aria-hidden="true">
        <defs>
          <clipPath id="${id}-verre"><path d="${r.d}" /></clipPath>

          <linearGradient id="${id}-jus" x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0" stop-color="var(--jus-clair)" />
            <stop offset="0.48" stop-color="var(--jus-moyen)" />
            <stop offset="1" stop-color="var(--jus-sombre)" />
          </linearGradient>

          <linearGradient id="${id}-verre-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#dce8ee" stop-opacity="0.18" />
            <stop offset="0.28" stop-color="#52606d" stop-opacity="0.07" />
            <stop offset="0.62" stop-color="#070b10" stop-opacity="0.34" />
            <stop offset="1" stop-color="#b8c5cd" stop-opacity="0.12" />
          </linearGradient>

          <linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#171c23" />
            <stop offset="0.26" stop-color="#6d5a32" />
            <stop offset="0.48" stop-color="#c2a458" />
            <stop offset="0.68" stop-color="#4a3c24" />
            <stop offset="1" stop-color="#1b222a" />
          </linearGradient>

          <radialGradient id="${id}-noyau" cx="50%" cy="45%" r="55%">
            <stop offset="0" stop-color="white" stop-opacity="0.92" />
            <stop offset="0.18" stop-color="var(--jus-clair)" stop-opacity="0.95" />
            <stop offset="1" stop-color="var(--jus-sombre)" stop-opacity="0" />
          </radialGradient>

          <filter id="${id}-grain" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" seed="${niveau * 13}" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 var(--grain) 0" />
          </filter>
        </defs>

        ${r.orn.includes('bb__halo') ? r.orn.match(/<circle[^>]*bb__halo[^>]*\/>/)?.[0] || '' : ''}

        <!-- Cristal fumé et épaisseur de verre -->
        <path d="${r.d}" class="bombonne__verre" style="fill:url(#${id}-verre-grad)" />

        <g clip-path="url(#${id}-verre)">
          ${taux > 0 ? `<path class="bombonne__jus" d="${vague}" fill="url(#${id}-jus)" />` : ''}

          <!-- Sédiment lumineux : donne une matière au fond au lieu d'un aplat. -->
          ${taux > 0.03 ? `<ellipse cx="${nx}" cy="${ny}" rx="${nr * 1.55}" ry="${nr * 0.58}" class="bb__sediment" />` : ''}
          ${taux > 0.06 ? `<circle cx="${nx}" cy="${ny - nr * 0.3}" r="${nr}" fill="url(#${id}-noyau)" class="bb__noyau" />` : ''}

          ${bulles && taux > 0.08 ? `
            <g class="bombonne__bulles" style="--plancher:${Math.max(0, r.fond - y).toFixed(0)}px">
              ${r.bulles.map(([bx, by, br]) => `<circle cx="${bx}" cy="${by}" r="${br}" />`).join('')}
            </g>` : ''}

          <!-- Grain minéral / imperfections du cristal. -->
          <rect x="0" y="0" width="120" height="190" class="bb__texture" filter="url(#${id}-grain)" />

          <!-- Reflet épais, volontairement irrégulier. -->
          <path d="M 53 35 C 48 58 47 93 50 128 C 51 140 49 150 47 158" class="bb__speculaire" />
          ${taux > 0.08 ? eclat(81, 76, 5.2) + eclat(39, 126, 3.5) : ''}
        </g>

        ${avecId(r.orn.replace(/<circle[^>]*bb__halo[^>]*\/>/, ''), id)}
        <path d="${r.d}" class="bombonne__contour" fill="none" />
        <path d="${r.d}" class="bb__bord-interne" fill="none" />

        ${avecId(r.bouchon, id)}
      </svg>
    </div>`;
}
