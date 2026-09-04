type TeamBrand = { accent: string; aliases: string[] };
type TeamAccentInput = {
  name?: string;
  provided?: string | null;
  tag?: string;
};

// Team identities are shared by the Hub, schedule, calls and Match Center.
// Light neutrals represent black/white logos on the application's dark surfaces.
const TEAM_BRANDS: TeamBrand[] = [
  { accent: '#E5333A', aliases: ['AST', 'Astralis'] },
  { accent: '#E84A9B', aliases: ['BDS', 'Team BDS'] },
  { accent: '#2FC0D7', aliases: ['BLG', 'Bilibili Gaming'] },
  { accent: '#FFD600', aliases: ['BFX', 'FOX', 'BNK FEARX', 'FEARX', 'Liiv SANDBOX', 'LSB'] },
  { accent: '#E5E7EB', aliases: ['DK', 'Dplus', 'Dplus KIA', 'DWG', 'DWG KIA', 'DAMWON Gaming'] },
  { accent: '#4D71FF', aliases: ['DRX'] },
  { accent: '#D62E38', aliases: ['EDG', 'EDward Gaming'] },
  { accent: '#E43B32', aliases: ['FAZE', 'FaZe Clan'] },
  { accent: '#FF5900', aliases: ['FNC', 'Fnatic'] },
  { accent: '#E5E7EB', aliases: ['G2', 'G2 Esports', 'G2 Stride'] },
  { accent: '#C8A45D', aliases: ['GEN', 'GEN.G', 'Gen.G Esports', 'Gen.G Mobil1 Racing'] },
  { accent: '#168DFF', aliases: ['GX', 'GIANTX', 'GiantX', 'Giants Gaming'] },
  { accent: '#FF6B00', aliases: ['HLE', 'Hanwha Life', 'Hanwha Life Esports'] },
  { accent: '#E5333A', aliases: ['KT', 'KT Rolster'] },
  { accent: '#30A9FF', aliases: ['KC', 'KCB', 'Karmine Corp', 'Karmine Corp Blue'] },
  { accent: '#1AC8FF', aliases: ['MKOI', 'KOI', 'Movistar KOI', 'MAD Lions KOI'] },
  { accent: '#B9DCFF', aliases: ['M8', 'Gentle Mates', 'Gentle Mates Alpine'] },
  { accent: '#C91235', aliases: ['MU', 'MVU', 'Maryville', 'Maryville University', 'Maryville University Esports', 'Maryville Esports'] },
  { accent: '#E53742', aliases: ['MOUZ', 'Mousesports'] },
  { accent: '#FFE000', aliases: ['NAVI', 'Natus Vincere'] },
  { accent: '#E5E7EB', aliases: ['NRG', 'NRG Esports'] },
  { accent: '#E32B36', aliases: ['NS', 'Nongshim', 'Nongshim RedForce'] },
  { accent: '#E44755', aliases: ['PRX', 'Paper Rex'] },
  { accent: '#2878C8', aliases: ['RGE', 'Rogue'] },
  { accent: '#E64B50', aliases: ['SEN', 'Sentinels'] },
  { accent: '#E5E7EB', aliases: ['SK', 'SK Gaming'] },
  { accent: '#E22D38', aliases: ['T1', 'SK Telecom T1', 'SKT'] },
  { accent: '#F0C14B', aliases: ['TH', 'HRTS', 'Heretics', 'Team Heretics'] },
  { accent: '#597BB2', aliases: ['TL', 'Team Liquid', 'Team Liquid Honda'] },
  { accent: '#F3D933', aliases: ['VIT', 'Vitality', 'Team Vitality'] },
  { accent: '#D92329', aliases: ['WE', 'Team WE'] },
  { accent: '#2DBB7F', aliases: ['FLC', 'FAL', 'FALCONS', 'Team Falcons'] },
  { accent: '#E5E7EB', aliases: ['FUR', 'FURIA', 'FURIA Esports'] },
  { accent: '#F9BD2D', aliases: ['SSG', 'Spacestation Gaming'] },
  { accent: '#0FAC66', aliases: ['BRO', 'OK BRION', 'OKSavingsBank BRION', 'BRION'] },
  { accent: '#EB3845', aliases: ['KDF', 'DNF', 'DN SOOPers', 'DN Freecs', 'Kwangdong Freecs'] },
  { accent: '#1D80DE', aliases: ['DR', 'Duro', 'Duro Esports'] },
  { accent: '#238BCB', aliases: ['CE', 'CON', 'CONT', 'Contingent', 'Contingent Esports'] },
];

export const UNKNOWN_TEAM_ACCENT = '#A7ADB5';
export const MATCH_TEAM_FALLBACK_ACCENTS = {
  a: '#247DFF',
  b: '#E53245',
} as const;

const ACCENT_BY_ALIAS = new Map(TEAM_BRANDS.flatMap(({ accent, aliases }) => (
  aliases.map((alias) => [normalizeTeamIdentity(alias), accent] as const)
)));

export function resolveTeamAccent({
  name = '',
  provided,
  tag = '',
}: TeamAccentInput) {
  const explicit = normalizeHexColor(provided);
  if (explicit) return explicit;
  return ACCENT_BY_ALIAS.get(normalizeTeamIdentity(name))
    ?? ACCENT_BY_ALIAS.get(normalizeTeamIdentity(tag))
    ?? UNKNOWN_TEAM_ACCENT;
}

export function resolveMatchTeamAccents(
  teamA: TeamAccentInput,
  teamB: TeamAccentInput,
) {
  const accentA = resolveTeamAccent(teamA);
  const accentB = resolveTeamAccent(teamB);
  const neutralA = isNeutralMatchAccent(accentA);
  const neutralB = isNeutralMatchAccent(accentB);

  if (!neutralA && !neutralB) return { a: accentA, b: accentB };
  if (neutralA && neutralB) return { ...MATCH_TEAM_FALLBACK_ACCENTS };
  if (neutralA) return { a: contrastingMatchFallback(accentB), b: accentB };
  return { a: accentA, b: contrastingMatchFallback(accentA) };
}

function normalizeTeamIdentity(value: string) {
  return value.normalize('NFKD').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeHexColor(value?: string | null) {
  const color = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color.slice(1).split('').map((channel) => channel.repeat(2)).join('')}`.toUpperCase();
  }
  return null;
}

function isNeutralMatchAccent(value: string) {
  const channels = hexChannels(value);
  if (!channels) return true;
  return Math.max(...channels) - Math.min(...channels) < 24;
}

function contrastingMatchFallback(opponentAccent: string) {
  const blue = MATCH_TEAM_FALLBACK_ACCENTS.a;
  const red = MATCH_TEAM_FALLBACK_ACCENTS.b;
  return colorDistanceSquared(blue, opponentAccent) >= colorDistanceSquared(red, opponentAccent)
    ? blue
    : red;
}

function colorDistanceSquared(first: string, second: string) {
  const a = hexChannels(first) ?? [0, 0, 0];
  const b = hexChannels(second) ?? [0, 0, 0];
  return a.reduce((total, channel, index) => total + (channel - b[index]) ** 2, 0);
}

function hexChannels(value: string): [number, number, number] | null {
  const color = normalizeHexColor(value);
  if (!color) return null;
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}
