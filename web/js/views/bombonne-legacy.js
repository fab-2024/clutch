/**
 * Legacy community vessel renderer kept for one-line rollback.
 */
const RECIPIENTS = [
  {
    d: 'M 55 88 L 55 100 C 55 107 50 111 50 125 L 50 158 C 50 168 54 174 60 174 C 66 174 70 168 70 158 L 70 125 C 70 111 65 107 65 100 L 65 88 Z',
    fond: 172, plein: 104,
    bouchon: '<rect x="52" y="76" width="16" height="13" rx="4" class="bb__bouchon" />',
    orn: '<path d="M 55 88 h 10" class="bb__trait" />',
    bulles: [[57,166,1.9],[63,166,1.4]],
  },
  {
    d: 'M 53 66 L 53 90 C 53 99 37 106 37 132 C 37 158 47 175 60 175 C 73 175 83 158 83 132 C 83 106 67 99 67 90 L 67 66 Z',
    fond: 173, plein: 96,
    bouchon: '<rect x="49" y="53" width="22" height="14" rx="5" class="bb__bouchon" />',
    orn: '<path d="M 53 66 h 14" class="bb__trait" />',
    bulles: [[51,168,2.4],[68,168,1.8],[59,168,3]],
  },
  {
    d: 'M 49 42 L 49 68 C 49 81 21 94 21 132 C 21 160 38 177 60 177 C 82 177 99 160 99 132 C 99 94 71 81 71 68 L 71 42 Z',
    fond: 175, plein: 74,
    bouchon: '<rect x="44" y="28" width="32" height="15" rx="5" class="bb__bouchon" />',
    orn: '<path d="M 49 42 h 22" class="bb__trait" /><path d="M 25 146 q 35 13 70 0" class="bb__cerclage" />',
    bulles: [[44,170,2.9],[76,170,2.2],[60,170,3.7]],
  },
  {
    d: 'M 46 34 L 46 56 L 17 88 L 12 130 L 33 176 L 87 176 L 108 130 L 103 88 L 74 56 L 74 34 Z',
    fond: 174, plein: 62,
    bouchon: '<rect x="41" y="20" width="38" height="15" rx="4" class="bb__bouchon" />',
    orn: '<path d="M 17 88 L 60 106 L 103 88 M 60 106 L 60 176" class="bb__facette" /><path d="M 12 130 L 60 148 L 108 130" class="bb__facette" />',
    bulles: [[36,170,3],[84,170,2.4],[60,170,4]],
  },
  {
    d: 'M 60 20 C 74 20 85 30 85 45 C 85 56 79 64 71 69 C 67 71 67 76 71 78 C 94 87 112 111 112 140 C 112 165 89 180 60 180 C 31 180 8 165 8 140 C 8 111 26 87 49 78 C 53 76 53 71 49 69 C 41 64 35 56 35 45 C 35 30 46 20 60 20 Z',
    fond: 178, plein: 34,
    bouchon: '<circle cx="60" cy="16" r="9" class="bb__bouchon" />',
    orn: '<path d="M 44 74 q 16 8 32 0" class="bb__cerclage" />',
    bulles: [[34,173,3.2],[86,173,2.6],[60,173,4.3]],
  },
  {
    d: 'M 8 128 C 8 88 31 58 60 58 C 89 58 112 88 112 128 C 112 160 89 181 60 181 C 31 181 8 160 8 128 Z',
    fond: 179, plein: 74,
    bouchon: '<circle cx="103" cy="26" r="8" class="bb__bouchon" />',
    orn: '<path d="M 74 62 C 82 44 92 34 100 30" class="bb__col" /><path d="M 20 118 q 40 16 80 0" class="bb__cerclage" />',
    bulles: [[30,174,3.4],[90,174,2.8],[60,174,4.6]],
  },
  {
    d: 'M 60 16 C 93 16 119 55 119 100 C 119 145 93 182 60 182 C 27 182 1 145 1 100 C 1 55 27 16 60 16 Z',
    fond: 180, plein: 26,
    bouchon: '',
    orn: '<ellipse cx="60" cy="100" rx="58" ry="17" class="bb__anneau" transform="rotate(-18 60 100)" /><circle cx="60" cy="100" r="57" class="bb__halo" />',
    bulles: [[28,176,3.6],[92,176,3],[60,176,5]],
  },
];

const eclat = (x,y,r) => `<path d="M ${x} ${y-r} Q ${x+r*.22} ${y-r*.22} ${x+r} ${y} Q ${x+r*.22} ${y+r*.22} ${x} ${y+r} Q ${x-r*.22} ${y+r*.22} ${x-r} ${y} Q ${x-r*.22} ${y-r*.22} ${x} ${y-r} Z" class="bb__eclat" />`;
let compteur = 0;

export function bombonneLegacy(p,{teinte=null,bulles=true}={}){
  const id=`bbl${++compteur}`;
  const r=RECIPIENTS[Math.min(RECIPIENTS.length,Math.max(1,p.niveau??1))-1];
  const taux=Math.min(1,Math.max(0,p.progression));
  const y=r.fond-taux*(r.fond-r.plein);
  const clair=teinte==null?'var(--accent)':`oklch(0.72 0.17 ${teinte})`;
  const sombre=teinte==null?'var(--accent-sombre)':`oklch(0.5 0.15 ${teinte})`;
  const amplitude=(7*(1-.75*taux)).toFixed(2);
  const vague=`M 0 ${y.toFixed(1)} q 15 -${amplitude} 30 0 t 30 0 t 30 0 t 30 0 t 30 0 L 150 195 L 0 195 Z`;
  return `<div class="bombonne${taux===0?' bombonne--vide':''}" role="img" style="--jus-clair:${clair};--jus-sombre:${sombre}" aria-label="${p.membres} membre${p.membres>1?'s':''}, palier ${p.nom}${p.max?', au maximum':` sur ${p.objectif}`}"><svg viewBox="0 0 120 190"><defs><clipPath id="${id}-verre"><path d="${r.d}" /></clipPath><linearGradient id="${id}-jus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--jus-clair)"/><stop offset="1" stop-color="var(--jus-sombre)"/></linearGradient></defs>${r.orn.includes('bb__halo')?r.orn.match(/<circle[^>]*bb__halo[^>]*\/>/)[0]:''}<path d="${r.d}" class="bombonne__verre"/><g clip-path="url(#${id}-verre)">${taux>0?`<path class="bombonne__jus" d="${vague}" fill="url(#${id}-jus)"/>`:''}${bulles&&taux>.08?`<g class="bombonne__bulles" style="--plancher:${(r.fond-y).toFixed(0)}px">${r.bulles.map(([bx,by,br])=>`<circle cx="${bx}" cy="${by}" r="${br}"/>`).join('')}</g>`:''}</g><g clip-path="url(#${id}-verre)"><path d="M 34 74 C 26 88 24 104 24 118" class="bombonne__eclat"/>${taux>.05?eclat(84,66,6)+eclat(38,128,4):''}</g>${r.orn.replace(/<circle[^>]*bb__halo[^>]*\/>/,'')}<path d="${r.d}" class="bombonne__contour" fill="none"/>${r.bouchon}</svg></div>`;
}
