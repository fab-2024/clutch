let serial = 0;

const VESSELS = [
  {
    name: 'Fiole',
    body: 'M105 58 L105 82 C105 96 99 103 99 119 L99 250 C99 271 106 282 120 284 C134 282 141 271 141 250 L141 119 C141 103 135 96 135 82 L135 58 Z',
    top: 92,
    bottom: 278,
    metal: `
      <g class="rv__metal">
        <rect x="101" y="43" width="38" height="19" rx="6" class="rv__metal-fill"/>
        <rect x="104" y="48" width="32" height="5" rx="2.5" class="rv__metal-wear"/>
        <rect x="101" y="79" width="38" height="8" rx="3" class="rv__metal-fill"/>
        <ellipse cx="120" cy="278" rx="25" ry="6" class="rv__metal-line"/>
      </g>`,
    ornament: `
      <g class="rv__runes">
        <path d="M109 154 H131 M112 148 V160 M120 146 V162 M128 148 V160"/>
        <circle cx="120" cy="111" r="5"/>
      </g>`,
    emblem: false,
    swirls: ['M111 242 C113 225 132 223 130 207 C128 195 112 194 113 181'],
  },
  {
    name: 'Flacon',
    body: 'M104 55 L104 88 C104 103 76 116 65 149 C51 192 61 244 91 266 C106 277 134 277 149 266 C179 244 189 192 175 149 C164 116 136 103 136 88 L136 55 Z',
    top: 95,
    bottom: 271,
    metal: `
      <g class="rv__metal">
        <rect x="99" y="39" width="42" height="19" rx="7" class="rv__metal-fill"/>
        <rect x="102" y="45" width="36" height="5" rx="2" class="rv__metal-wear"/>
        <rect x="99" y="84" width="42" height="9" rx="3" class="rv__metal-fill"/>
        <path d="M76 150 C88 136 101 129 120 129 C139 129 152 136 164 150" class="rv__metal-line rv__metal-line--thick"/>
        <ellipse cx="120" cy="269" rx="55" ry="7" class="rv__metal-line"/>
      </g>`,
    ornament: `
      <g class="rv__runes">
        <path d="M80 168 C101 152 139 152 160 168"/>
        <path d="M86 145 L102 170 M154 145 L138 170"/>
      </g>`,
    emblem: true,
    swirls: ['M83 226 C103 211 139 224 150 201 C158 185 143 175 127 181 C109 188 100 208 84 200'],
  },
  {
    name: 'Bombonne',
    body: 'M98 49 L98 87 C98 104 61 116 50 158 C35 215 59 263 93 278 C109 285 131 285 147 278 C181 263 205 215 190 158 C179 116 142 104 142 87 L142 49 Z',
    top: 92,
    bottom: 282,
    metal: `
      <g class="rv__metal">
        <rect x="92" y="31" width="56" height="21" rx="6" class="rv__metal-fill"/>
        <rect x="96" y="38" width="48" height="5" rx="2" class="rv__metal-wear"/>
        <rect x="92" y="83" width="56" height="10" rx="3" class="rv__metal-fill"/>
        <path d="M54 180 Q120 151 186 180" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M58 240 Q120 262 182 240" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M76 124 L63 242 M164 124 L177 242" class="rv__metal-line"/>
        <ellipse cx="120" cy="280" rx="68" ry="8" class="rv__metal-line rv__metal-line--thick"/>
      </g>`,
    ornament: `
      <g class="rv__runes">
        <path d="M69 203 Q120 184 171 203"/>
        <circle cx="81" cy="226" r="4"/><circle cx="159" cy="226" r="4"/>
      </g>`,
    emblem: true,
    swirls: ['M69 226 C90 189 121 224 145 198 C160 181 152 160 133 161 C107 162 107 197 84 191'],
  },
  {
    name: 'Calice',
    body: 'M94 52 L94 90 L61 120 L49 192 L71 270 L120 287 L169 270 L191 192 L179 120 L146 90 L146 52 Z',
    top: 97,
    bottom: 283,
    metal: `
      <g class="rv__metal">
        <rect x="87" y="33" width="66" height="22" rx="7" class="rv__metal-fill"/>
        <path d="M62 119 L120 145 L178 119 M50 191 L120 218 L190 191 M72 269 L120 245 L168 269" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M62 120 L72 269 M178 120 L168 269 M120 145 V286" class="rv__metal-line"/>
        <ellipse cx="120" cy="284" rx="59" ry="7" class="rv__metal-line rv__metal-line--thick"/>
      </g>`,
    ornament: `
      <g class="rv__runes"><path d="M83 164 L120 181 L157 164 M91 233 L120 220 L149 233"/></g>`,
    emblem: true,
    swirls: ['M80 238 C100 216 112 244 137 224 C155 210 157 180 138 172 C113 161 103 193 83 187'],
  },
  {
    name: 'Alambic',
    body: 'M91 132 C61 151 48 190 52 226 C56 265 83 286 120 286 C157 286 184 265 188 226 C192 190 179 151 149 132 C137 124 134 111 134 98 L106 98 C106 111 103 124 91 132 Z',
    top: 105,
    bottom: 282,
    metal: `
      <g class="rv__metal">
        <rect x="99" y="91" width="42" height="12" rx="4" class="rv__metal-fill"/>
        <rect x="78" y="48" width="84" height="11" rx="5" class="rv__metal-fill"/>
        <circle cx="120" cy="70" r="39" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M159 70 C204 69 205 92 205 118 L205 205" class="rv__metal-line rv__metal-line--thick"/>
        <rect x="198" y="112" width="14" height="27" rx="4" class="rv__metal-fill"/>
        <path d="M58 231 Q120 253 182 231" class="rv__metal-line rv__metal-line--thick"/>
        <ellipse cx="120" cy="284" rx="67" ry="8" class="rv__metal-line rv__metal-line--thick"/>
      </g>`,
    extras: `
      <circle cx="120" cy="70" r="34" class="rv__glass rv__glass--orb"/>
      <path d="M159 69 C189 69 196 80 196 111 V198" class="rv__glass-pipe"/>
      <circle cx="120" cy="70" r="22" class="rv__energy-orb"/>
      <path d="M100 75 C112 49 140 50 141 72 C142 91 118 95 105 83" class="rv__energy-stroke"/>
    `,
    ornament: `
      <g class="rv__runes"><path d="M78 191 Q120 169 162 191"/><circle cx="120" cy="156" r="6"/></g>`,
    emblem: true,
    swirls: ['M74 236 C91 209 115 229 137 206 C155 187 146 165 126 166 C105 168 102 194 82 191'],
  },
  {
    name: 'Cornue',
    body: 'M153 63 L176 76 L153 119 C147 130 150 138 161 145 C188 163 199 197 190 232 C180 271 149 288 111 282 C74 276 50 251 48 213 C46 176 67 145 98 133 C111 128 120 117 126 105 L146 68 Z',
    top: 92,
    bottom: 281,
    metal: `
      <g class="rv__metal">
        <g transform="rotate(28 163 71)"><rect x="142" y="53" width="43" height="17" rx="5" class="rv__metal-fill"/><rect x="146" y="58" width="35" height="4" rx="2" class="rv__metal-wear"/></g>
        <path d="M132 111 L164 129" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M58 223 Q119 246 181 219" class="rv__metal-line rv__metal-line--thick"/>
        <ellipse cx="119" cy="280" rx="65" ry="8" class="rv__metal-line rv__metal-line--thick"/>
      </g>`,
    ornament: `
      <g class="rv__runes"><path d="M73 185 Q115 164 161 182"/><path d="M135 93 L155 105"/></g>`,
    emblem: false,
    swirls: ['M71 232 C87 197 120 231 151 197 C165 182 154 158 135 160 C113 162 106 195 83 190'],
  },
  {
    name: 'Océan',
    body: 'M120 46 C181 46 213 92 216 165 C219 238 181 289 120 294 C59 289 21 238 24 165 C27 92 59 46 120 46 Z',
    top: 61,
    bottom: 290,
    metal: `
      <g class="rv__metal">
        <path d="M98 47 Q120 25 142 47" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M120 46 V293 M34 170 H206" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M51 96 Q120 66 189 96 M50 239 Q120 264 190 239" class="rv__metal-line"/>
        <path d="M48 78 C36 115 29 151 34 190 M192 78 C204 115 211 151 206 190" class="rv__metal-line"/>
        <ellipse cx="120" cy="292" rx="93" ry="10" class="rv__metal-line rv__metal-line--thick"/>
        <rect x="38" y="276" width="18" height="30" rx="4" class="rv__metal-fill"/><rect x="184" y="276" width="18" height="30" rx="4" class="rv__metal-fill"/>
      </g>`,
    ornament: `
      <g class="rv__runes"><circle cx="120" cy="118" r="12"/><path d="M57 200 Q120 174 183 200"/></g>`,
    emblem: true,
    swirls: ['M51 238 C78 183 109 239 153 196 C183 167 162 115 128 126 C93 138 96 179 62 173', 'M71 249 C99 221 136 248 177 214'],
  },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bubbles = [
  [88, 249, 4], [104, 224, 2.7], [131, 252, 3.4], [148, 214, 2.2],
  [113, 199, 2.1], [155, 241, 2.8], [74, 215, 2.2], [138, 183, 1.9],
];

function emblem(cx = 120, cy = 190) {
  return `
    <g class="rv__emblem" transform="translate(${cx} ${cy})">
      <circle r="22" class="rv__emblem-ring"/>
      <circle r="16" class="rv__emblem-core"/>
      <path d="M0 -10 L4 -3 L11 0 L4 3 L0 11 L-4 3 L-11 0 L-4 -3 Z" class="rv__emblem-mark"/>
    </g>`;
}

export function relicVessel(p, { teinte = null, bulles = true } = {}) {
  const id = `rv${++serial}`;
  const level = clamp(Number(p?.niveau || 1), 1, 7);
  const v = VESSELS[level - 1];
  const fill = clamp(Number(p?.progression ?? 0), 0, 1);
  const y = v.bottom - fill * (v.bottom - v.top);
  const amp = 7 - fill * 4.5;
  const hue = teinte == null ? 96 : Number(teinte);
  const light = `oklch(0.82 0.19 ${hue})`;
  const mid = `oklch(0.68 0.20 ${hue})`;
  const dark = `oklch(0.47 0.15 ${hue})`;
  const wave = `M-10 ${y.toFixed(1)} Q30 ${(y - amp).toFixed(1)} 60 ${y.toFixed(1)} T120 ${y.toFixed(1)} T180 ${y.toFixed(1)} T250 ${y.toFixed(1)} L250 330 L-10 330 Z`;
  const aria = `${p?.membres ?? 0} membre${Number(p?.membres ?? 0) > 1 ? 's' : ''}, ${v.name}`;

  return `
    <div class="relic-vessel relic-vessel--n${level}" role="img" aria-label="${aria}" style="--rv-hue:${hue};--rv-light:${light};--rv-mid:${mid};--rv-dark:${dark};--rv-fill:${fill}">
      <svg viewBox="0 0 240 320" aria-hidden="true">
        <defs>
          <clipPath id="${id}-clip"><path d="${v.body}"/></clipPath>
          <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#edf5f3" stop-opacity=".25"/>
            <stop offset=".18" stop-color="#9da7a2" stop-opacity=".08"/>
            <stop offset=".5" stop-color="#11161b" stop-opacity=".58"/>
            <stop offset=".78" stop-color="#78827c" stop-opacity=".12"/>
            <stop offset="1" stop-color="#e5e9dc" stop-opacity=".2"/>
          </linearGradient>
          <linearGradient id="${id}-liquid" x1="0" y1="0" x2=".7" y2="1">
            <stop offset="0" stop-color="var(--rv-light)"/>
            <stop offset=".45" stop-color="var(--rv-mid)"/>
            <stop offset="1" stop-color="var(--rv-dark)"/>
          </linearGradient>
          <linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#17191c"/>
            <stop offset=".18" stop-color="#4b3b1f"/>
            <stop offset=".34" stop-color="#c39b3b"/>
            <stop offset=".49" stop-color="#3a2b16"/>
            <stop offset=".72" stop-color="#92742f"/>
            <stop offset="1" stop-color="#101318"/>
          </linearGradient>
          <radialGradient id="${id}-core">
            <stop offset="0" stop-color="#fffbd7" stop-opacity="1"/>
            <stop offset=".2" stop-color="var(--rv-light)" stop-opacity=".95"/>
            <stop offset="1" stop-color="var(--rv-mid)" stop-opacity="0"/>
          </radialGradient>
          <pattern id="${id}-age" width="19" height="17" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="4" r=".8" fill="#d6b85b" opacity=".24"/>
            <circle cx="13" cy="11" r=".55" fill="#f7e7a0" opacity=".14"/>
            <path d="M1 15 L7 13" stroke="#c49b42" stroke-width=".45" opacity=".15"/>
          </pattern>
          <filter id="${id}-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="${id}-metal-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#000" flood-opacity=".75"/>
          </filter>
        </defs>

        <ellipse cx="120" cy="294" rx="86" ry="13" class="rv__ground"/>
        <ellipse cx="120" cy="287" rx="64" ry="8" class="rv__ground-core"/>

        <path d="${v.body}" class="rv__glass" style="fill:url(#${id}-glass)"/>
        <g clip-path="url(#${id}-clip)">
          ${fill > 0 ? `<path d="${wave}" class="rv__liquid" style="fill:url(#${id}-liquid)"/>` : ''}
          <rect x="0" y="0" width="240" height="320" fill="url(#${id}-age)" class="rv__age"/>
          ${fill > .03 ? `<ellipse cx="120" cy="${Math.min(v.bottom - 13, y + 68)}" rx="42" ry="14" fill="url(#${id}-core)" class="rv__core" filter="url(#${id}-glow)"/>` : ''}
          ${fill > .06 ? v.swirls.map((d) => `<path d="${d}" class="rv__energy-stroke" filter="url(#${id}-glow)"/>`).join('') : ''}
          ${bulles && fill > .08 ? bubbles.slice(0, 3 + level).map(([cx, cy, r], i) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="rv__bubble" style="--delay:${-i * .53}s"/>`).join('') : ''}
          <path d="M76 78 C63 124 67 209 84 250" class="rv__spec rv__spec--wide"/>
          <path d="M91 69 C82 110 86 146 91 171" class="rv__spec"/>
        </g>

        <path d="${v.body}" class="rv__glass-edge"/>
        <path d="${v.body}" class="rv__glass-inner"/>
        ${v.extras || ''}
        <g style="--metal:url(#${id}-metal)" filter="url(#${id}-metal-shadow)">${v.metal}</g>
        ${v.ornament}
        ${v.emblem ? emblem(120, level === 7 ? 172 : level === 4 ? 177 : 190) : ''}
      </svg>
    </div>`;
}
