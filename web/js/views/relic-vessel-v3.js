let serial = 0;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const BUBBLES = [
  [88, 249, 4], [104, 224, 2.7], [131, 252, 3.4], [148, 214, 2.2],
  [113, 199, 2.1], [155, 241, 2.8], [74, 215, 2.2], [138, 183, 1.9],
];

const VESSELS = [
  {
    name: 'Fiole',
    body: 'M103 64 L103 84 C103 98 97 106 97 122 L97 248 C97 272 105 286 120 288 C135 286 143 272 143 248 L143 122 C143 106 137 98 137 84 L137 64 Z',
    top: 94, bottom: 282,
    metal: `
      <g class="rv__metal rv__metal--heavy">
        <rect x="96" y="30" width="48" height="31" rx="7" class="rv__metal-plate"/>
        <rect x="100" y="35" width="40" height="7" rx="3" class="rv__metal-wear"/>
        <rect x="99" y="58" width="42" height="10" rx="3" class="rv__metal-plate"/>
        <path d="M101 83 V245 M139 83 V245" class="rv__strap"/>
        <rect x="94" y="238" width="52" height="12" rx="4" class="rv__metal-plate"/>
        <path d="M102 245 L120 264 L138 245" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M120 253 L126 263 L120 272 L114 263 Z" class="rv__metal-plate rv__metal-gem"/>
        <ellipse cx="120" cy="282" rx="31" ry="8" class="rv__metal-line rv__metal-line--thick"/>
        <circle cx="101" cy="88" r="2.3" class="rv__rivet"/><circle cx="139" cy="88" r="2.3" class="rv__rivet"/>
      </g>`,
    extras: `<g class="rv__sigil" transform="translate(120 47)"><circle r="12" class="rv__sigil-plate"/><path d="M0 -7 L3 -2 L8 0 L3 2 L0 8 L-3 2 L-8 0 L-3 -2 Z" class="rv__sigil-mark"/></g>`,
    ornament: `<g class="rv__runes rv__runes--subtle"><path d="M109 157 H131 M112 151 V163 M120 149 V165 M128 151 V163"/></g>`,
    inner: `<path d="M113 229 C116 217 127 214 129 204 C131 194 124 187 116 186" class="rv__crack"/>`,
    emblem: false,
    swirls: ['M111 244 C113 226 132 224 130 207 C128 195 112 194 113 181'],
  },
  {
    name: 'Flacon',
    body: 'M102 61 L102 88 C102 103 75 114 61 146 C43 188 53 239 84 266 C94 275 106 281 120 282 C134 281 146 275 156 266 C187 239 197 188 179 146 C165 114 138 103 138 88 L138 61 Z',
    top: 96, bottom: 278,
    metal: `
      <g class="rv__metal rv__metal--heavy">
        <rect x="92" y="31" width="56" height="27" rx="8" class="rv__metal-plate"/>
        <rect x="97" y="37" width="46" height="7" rx="3" class="rv__metal-wear"/>
        <path d="M99 54 L94 67 H146 L141 54" class="rv__metal-plate rv__crown-collar"/>
        <rect x="96" y="84" width="48" height="12" rx="4" class="rv__metal-plate"/>
        <path d="M71 137 L91 153 M169 137 L149 153" class="rv__strap rv__strap--shoulder"/>
        <path d="M78 145 C91 132 103 127 120 127 C137 127 149 132 162 145" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M64 225 Q120 248 176 225" class="rv__strap"/>
        <rect x="66" y="252" width="108" height="14" rx="5" class="rv__metal-plate"/>
        <rect x="75" y="266" width="90" height="12" rx="5" class="rv__metal-plate rv__metal-plate--dark"/>
        <ellipse cx="120" cy="281" rx="62" ry="9" class="rv__metal-line rv__metal-line--thick"/>
        <circle cx="76" cy="143" r="2.5" class="rv__rivet"/><circle cx="164" cy="143" r="2.5" class="rv__rivet"/>
      </g>`,
    extras: `<g class="rv__sigil" transform="translate(120 49)"><circle r="11" class="rv__sigil-plate"/><path d="M-7 0 L0 -8 L7 0 L0 8 Z" class="rv__sigil-mark"/></g>`,
    ornament: `<g class="rv__runes rv__runes--subtle"><path d="M80 169 Q120 148 160 169"/><path d="M93 154 L107 176 M147 154 L133 176"/></g>`,
    inner: `<path d="M84 232 C102 211 119 226 139 207 C149 198 151 184 143 175" class="rv__crack rv__crack--soft"/>`,
    emblem: true,
    emblemAt: [120, 184],
    swirls: ['M82 231 C102 213 136 224 151 201 C161 185 145 173 128 180 C109 188 101 211 84 202'],
  },
  {
    name: 'Bombonne',
    body: 'M99 54 L99 87 C99 103 69 114 56 145 C37 190 45 242 75 269 C87 280 103 286 120 286 C137 286 153 280 165 269 C195 242 203 190 184 145 C171 114 141 103 141 87 L141 54 Z',
    top: 94, bottom: 282,
    metal: `
      <g class="rv__metal rv__metal--heavy">
        <rect x="90" y="29" width="60" height="24" rx="7" class="rv__metal-plate"/>
        <rect x="95" y="35" width="50" height="7" rx="3" class="rv__metal-wear"/>
        <rect x="91" y="80" width="58" height="13" rx="4" class="rv__metal-plate"/>
        <path d="M67 130 L97 149 M173 130 L143 149" class="rv__strap rv__strap--broad"/>
        <path d="M64 142 L48 221 M176 142 L192 221" class="rv__strap rv__strap--broad"/>
        <path d="M49 218 Q120 248 191 218" class="rv__strap rv__strap--broad"/>
        <rect x="53" y="250" width="134" height="16" rx="6" class="rv__metal-plate"/>
        <rect x="61" y="266" width="118" height="13" rx="5" class="rv__metal-plate rv__metal-plate--dark"/>
        <ellipse cx="120" cy="282" rx="76" ry="10" class="rv__metal-line rv__metal-line--thick"/>
      </g>`,
    ornament: `<g class="rv__runes rv__runes--subtle"><path d="M78 201 Q120 187 162 201"/></g>`,
    inner: `<path d="M76 226 C94 211 105 221 118 211 C131 201 138 181 151 173" class="rv__crack"/>`,
    emblem: true,
    emblemAt: [120, 183],
    swirls: ['M69 231 C90 194 121 227 145 201 C160 184 152 162 133 163 C107 164 107 199 84 193'],
  },
  {
    name: 'Calice',
    body: 'M91 57 L91 88 L57 119 L45 188 L61 245 L82 276 L120 291 L158 276 L179 245 L195 188 L183 119 L149 88 L149 57 Z',
    top: 99, bottom: 287,
    metal: `
      <g class="rv__metal rv__metal--heavy">
        <path d="M84 31 H156 L149 59 H91 Z" class="rv__metal-plate rv__crown-collar"/>
        <rect x="92" y="39" width="56" height="8" rx="3" class="rv__metal-wear"/>
        <path d="M58 119 L120 149 L182 119" class="rv__strap rv__strap--faceted"/>
        <path d="M46 188 L120 221 L194 188" class="rv__strap rv__strap--faceted"/>
        <path d="M64 244 L120 268 L176 244" class="rv__strap rv__strap--faceted"/>
        <path d="M58 119 L65 244 M182 119 L175 244 M120 149 V288" class="rv__metal-line rv__metal-line--thick"/>
        <path d="M84 137 L120 119 L156 137 L120 158 Z" class="rv__metal-plate rv__ritual-diamond"/>
        <rect x="68" y="262" width="104" height="14" rx="4" class="rv__metal-plate"/>
        <rect x="77" y="276" width="86" height="11" rx="4" class="rv__metal-plate rv__metal-plate--dark"/>
        <ellipse cx="120" cy="290" rx="68" ry="9" class="rv__metal-line rv__metal-line--thick"/>
        <circle cx="58" cy="119" r="2.6" class="rv__rivet"/><circle cx="182" cy="119" r="2.6" class="rv__rivet"/>
      </g>`,
    extras: `<g class="rv__sigil" transform="translate(120 48)"><circle r="13" class="rv__sigil-plate"/><path d="M0 -9 L8 0 L0 9 L-8 0 Z" class="rv__sigil-mark"/></g>`,
    ornament: `<g class="rv__runes rv__runes--subtle"><path d="M83 172 L120 188 L157 172 M91 234 L120 221 L149 234"/></g>`,
    inner: `<path d="M74 238 C91 216 111 238 132 219 C149 204 152 185 140 174" class="rv__crack"/><path d="M95 256 C111 245 130 249 145 237" class="rv__crack rv__crack--soft"/>`,
    emblem: true,
    emblemAt: [120, 191],
    swirls: ['M77 242 C99 217 113 246 139 224 C157 209 158 179 138 171 C113 161 103 196 81 189'],
  },
  {
    name: 'Alambic',
    body: 'M92 137 C63 153 49 188 52 224 C55 263 82 286 120 286 C158 286 185 263 188 224 C191 188 177 153 148 137 C137 131 133 118 133 105 L107 105 C107 118 103 131 92 137 Z',
    top: 110, bottom: 282,
    metal: `
      <g class="rv__metal rv__metal--heavy">
        <rect x="98" y="96" width="44" height="14" rx="4" class="rv__metal-plate"/>
        <rect x="75" y="39" width="90" height="14" rx="5" class="rv__metal-plate"/>
        <circle cx="120" cy="72" r="42" class="rv__metal-line rv__metal-line--thick"/>
        <circle cx="120" cy="72" r="37" class="rv__metal-line"/>
        <path d="M161 69 C201 67 207 86 207 114 V206" class="rv__pipe-metal"/>
        <path d="M166 71 C191 72 196 84 196 110 V197" class="rv__pipe-highlight"/>
        <rect x="198" y="111" width="18" height="30" rx="4" class="rv__metal-plate"/>
        <rect x="50" y="245" width="140" height="18" rx="6" class="rv__metal-plate"/>
        <rect x="58" y="263" width="124" height="14" rx="5" class="rv__metal-plate rv__metal-plate--dark"/>
        <ellipse cx="120" cy="284" rx="74" ry="9" class="rv__metal-line rv__metal-line--thick"/>
      </g>`,
    extras: `<circle cx="120" cy="72" r="34" class="rv__glass rv__glass--orb"/><circle cx="120" cy="72" r="27" class="rv__orb-shadow"/><circle cx="120" cy="72" r="23" class="rv__energy-orb"/><path d="M99 77 C109 52 138 51 143 70 C148 90 123 99 105 85" class="rv__energy-stroke rv__energy-stroke--strong"/>`,
    ornament: `<g class="rv__runes rv__runes--subtle"><path d="M78 193 Q120 174 162 193"/></g>`,
    inner: `<path d="M73 228 C94 214 113 228 137 205 C150 192 149 175 137 168" class="rv__crack"/>`,
    emblem: true,
    emblemAt: [120, 198],
    swirls: ['M74 238 C91 211 115 231 137 208 C155 189 146 167 126 168 C105 170 102 196 82 193'],
  },
  {
    name: 'Cornue',
    body: 'M147 74 L175 88 L151 125 C145 135 147 143 160 151 C188 169 201 205 191 239 C180 276 151 292 112 287 C75 282 49 256 46 218 C43 179 65 147 98 135 C111 130 119 120 126 107 L140 80 Z',
    top: 105, bottom: 286,
    metal: `
      <g class="rv__metal rv__metal--heavy">
        <g transform="rotate(28 159 76)">
          <rect x="135" y="54" width="50" height="22" rx="6" class="rv__metal-plate"/>
          <rect x="140" y="60" width="40" height="6" rx="2.5" class="rv__metal-wear"/>
          <path d="M141 74 V91 M179 74 V91" class="rv__strap"/>
        </g>
        <path d="M129 111 L160 130" class="rv__strap rv__strap--shoulder"/>
        <path d="M54 185 C82 170 108 166 133 171 C157 176 176 189 190 205" class="rv__brace"/>
        <path d="M54 226 Q117 251 181 225" class="rv__strap rv__strap--broad"/>
        <rect x="57" y="253" width="124" height="16" rx="6" class="rv__metal-plate"/>
        <rect x="66" y="269" width="106" height="13" rx="5" class="rv__metal-plate rv__metal-plate--dark"/>
        <ellipse cx="119" cy="287" rx="72" ry="10" class="rv__metal-line rv__metal-line--thick"/>
        <circle cx="58" cy="185" r="2.8" class="rv__rivet"/><circle cx="185" cy="205" r="2.8" class="rv__rivet"/>
      </g>`,
    extras: `<g class="rv__sigil rv__sigil--side" transform="translate(158 145)"><circle r="12" class="rv__sigil-plate"/><path d="M-6 -5 L7 0 L-6 5 L-2 0 Z" class="rv__sigil-mark"/></g>`,
    ornament: `<g class="rv__runes rv__runes--subtle"><path d="M74 189 Q113 169 158 184"/><path d="M136 104 L155 115"/></g>`,
    inner: `<path d="M69 232 C84 198 119 231 151 198 C166 183 157 157 137 161 C114 165 107 198 84 192" class="rv__crack rv__crack--unstable"/><path d="M93 249 C115 227 143 244 164 221" class="rv__crack rv__crack--soft"/>`,
    emblem: false,
    swirls: ['M68 236 C84 199 120 235 152 199 C167 182 156 157 136 160 C112 164 105 198 82 191', 'M86 251 C112 220 143 247 168 217'],
  },
  {
    name: 'Océan',
    body: 'M120 57 C176 57 209 99 212 166 C215 232 181 281 120 289 C59 281 25 232 28 166 C31 99 64 57 120 57 Z',
    top: 70, bottom: 286,
    metal: `
      <g class="rv__metal rv__metal--heavy">
        <path d="M105 58 L105 40 H135 V58" class="rv__metal-line rv__metal-line--thick"/>
        <rect x="96" y="34" width="48" height="15" rx="4" class="rv__metal-plate"/>
        <path d="M120 9 L132 29 L120 39 L108 29 Z" class="rv__spire"/>
        <path d="M120 57 V288 M32 171 H208" class="rv__strap rv__strap--broad"/>
        <path d="M51 98 Q120 71 189 98 M49 238 Q120 262 191 238" class="rv__metal-line rv__metal-line--thick"/>
        <rect x="27" y="257" width="18" height="35" rx="5" class="rv__metal-plate"/>
        <rect x="195" y="257" width="18" height="35" rx="5" class="rv__metal-plate"/>
        <rect x="41" y="260" width="158" height="17" rx="6" class="rv__metal-plate"/>
        <rect x="49" y="277" width="142" height="13" rx="5" class="rv__metal-plate rv__metal-plate--dark"/>
        <ellipse cx="120" cy="291" rx="100" ry="11" class="rv__metal-line rv__metal-line--thick"/>
      </g>`,
    ornament: `<g class="rv__runes rv__runes--subtle"><circle cx="120" cy="119" r="12"/><path d="M57 204 Q120 179 183 204"/></g>`,
    inner: `<path d="M62 228 C87 193 105 221 132 197 C154 177 151 142 129 135" class="rv__crack"/>`,
    emblem: true,
    emblemAt: [120, 174],
    swirls: ['M51 241 C78 186 109 242 153 199 C183 170 162 118 128 129 C93 141 96 182 62 176', 'M71 252 C99 224 136 251 177 217'],
  },
];

function emblem(cx = 120, cy = 190) {
  return `<g class="rv__emblem" transform="translate(${cx} ${cy})"><circle r="22" class="rv__emblem-ring"/><circle r="16" class="rv__emblem-core"/><path d="M0 -10 L4 -3 L11 0 L4 3 L0 11 L-4 3 L-11 0 L-4 -3 Z" class="rv__emblem-mark"/></g>`;
}

export function relicVessel(p, { teinte = null, bulles = true } = {}) {
  const id = `rv3-${++serial}`;
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
  const [emblemX, emblemY] = v.emblemAt || [120, 190];

  return `
    <div class="relic-vessel relic-vessel--v3 relic-vessel--n${level}" role="img" aria-label="${aria}" style="--rv-hue:${hue};--rv-light:${light};--rv-mid:${mid};--rv-dark:${dark};--rv-fill:${fill}">
      <svg viewBox="0 0 240 320" aria-hidden="true">
        <defs>
          <clipPath id="${id}-clip"><path d="${v.body}"/></clipPath>
          <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f8f2" stop-opacity=".31"/><stop offset=".14" stop-color="#b8c1bc" stop-opacity=".13"/><stop offset=".42" stop-color="#12171c" stop-opacity=".63"/><stop offset=".72" stop-color="#626b68" stop-opacity=".14"/><stop offset="1" stop-color="#eef2df" stop-opacity=".23"/></linearGradient>
          <linearGradient id="${id}-liquid" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="var(--rv-light)"/><stop offset=".45" stop-color="var(--rv-mid)"/><stop offset="1" stop-color="var(--rv-dark)"/></linearGradient>
          <linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f1216"/><stop offset=".13" stop-color="#3a301f"/><stop offset=".29" stop-color="#c5a14a"/><stop offset=".42" stop-color="#5e4922"/><stop offset=".61" stop-color="#1b1d20"/><stop offset=".79" stop-color="#8e7131"/><stop offset="1" stop-color="#090b0e"/></linearGradient>
          <radialGradient id="${id}-core"><stop offset="0" stop-color="#fffbd7" stop-opacity="1"/><stop offset=".2" stop-color="var(--rv-light)" stop-opacity=".98"/><stop offset="1" stop-color="var(--rv-mid)" stop-opacity="0"/></radialGradient>
          <pattern id="${id}-age" width="19" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".8" fill="#d6b85b" opacity=".24"/><circle cx="13" cy="11" r=".55" fill="#f7e7a0" opacity=".14"/><path d="M1 15 L7 13" stroke="#c49b42" stroke-width=".45" opacity=".15"/></pattern>
          <filter id="${id}-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="${id}-metal-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".82"/></filter>
        </defs>

        <ellipse cx="120" cy="295" rx="91" ry="14" class="rv__ground"/>
        <ellipse cx="120" cy="288" rx="68" ry="9" class="rv__ground-core"/>
        <path d="${v.body}" class="rv__glass" style="fill:url(#${id}-glass)"/>
        <g clip-path="url(#${id}-clip)">
          ${fill > 0 ? `<path d="${wave}" class="rv__liquid" style="fill:url(#${id}-liquid)"/>` : ''}
          <rect x="0" y="0" width="240" height="320" fill="url(#${id}-age)" class="rv__age"/>
          ${fill > .03 ? `<ellipse cx="120" cy="${Math.min(v.bottom - 14, y + 70)}" rx="49" ry="18" fill="url(#${id}-core)" class="rv__core rv__core--deep" filter="url(#${id}-glow)"/>` : ''}
          ${fill > .06 ? v.swirls.map((d) => `<path d="${d}" class="rv__energy-stroke" filter="url(#${id}-glow)"/>`).join('') : ''}
          ${v.inner || ''}
          ${bulles && fill > .08 ? BUBBLES.slice(0, 3 + level).map(([cx, cy, r], i) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="rv__bubble" style="--delay:${-i * .53}s"/>`).join('') : ''}
          <path d="M76 78 C63 124 67 209 84 250" class="rv__spec rv__spec--wide"/>
          <path d="M91 69 C82 110 86 146 91 171" class="rv__spec"/>
        </g>
        <path d="${v.body}" class="rv__glass-edge"/>
        <path d="${v.body}" class="rv__glass-inner"/>
        ${v.extras || ''}
        <g style="--metal:url(#${id}-metal)" filter="url(#${id}-metal-shadow)">${v.metal}</g>
        ${v.ornament || ''}
        ${v.emblem ? emblem(emblemX, emblemY) : ''}
      </svg>
    </div>`;
}
