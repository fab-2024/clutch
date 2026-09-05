import type { ImageSourcePropType } from 'react-native';

import type { TeamPackDefinition, TeamPackItemDefinition } from './teamPackCatalog';

type OriginalPackItemSeed = {
  accent?: string;
  description: string;
  image: ImageSourcePropType;
  name: string;
  slug: string;
};

type OriginalPackSeed = Omit<
  TeamPackDefinition,
  'brandKey' | 'items' | 'kind' | 'licenseHolder'
> & {
  items: readonly OriginalPackItemSeed[];
};

type OriginalPackItemBlueprint = Pick<
  TeamPackItemDefinition,
  'equipByDefault' | 'rarity' | 'roomKind' | 'roomSlot' | 'slot'
>;

const ORIGINAL_PACK_ITEM_BLUEPRINTS = [
  { slot: 'vitrine_eclairage', rarity: 'legendaire', equipByDefault: true },
  { slot: 'vitrine_maillot', rarity: 'epique', equipByDefault: true, roomKind: 'jersey', roomSlot: 'jersey' },
  { slot: 'apparence_core', rarity: 'epique', equipByDefault: true, roomKind: 'core', roomSlot: 'right-extra' },
  { slot: 'carte_profil', rarity: 'rare', equipByDefault: false, roomKind: 'banner', roomSlot: 'left-extra' },
  { slot: 'vitrine_supports', rarity: 'legendaire', equipByDefault: true },
  { slot: 'apparence_core', rarity: 'rare', equipByDefault: false, roomKind: 'ring', roomSlot: 'ring' },
  { slot: 'apparence_core', rarity: 'epique', equipByDefault: false, roomKind: 'trophy', roomSlot: 'trophy' },
  { slot: 'apparence_core', rarity: 'epique', equipByDefault: false, roomKind: 'badge', roomSlot: 'badge' },
  { slot: 'cadre_profil', rarity: 'epique', equipByDefault: true, roomKind: 'frame', roomSlot: 'left-free' },
  { slot: 'effet_faction', rarity: 'legendaire', equipByDefault: true },
  { slot: 'carte_profil', rarity: 'epique', equipByDefault: true, roomKind: 'banner', roomSlot: 'right-free' },
  { slot: 'titre_profil', rarity: 'epique', equipByDefault: true, roomKind: 'title', roomSlot: 'title' },
] as const satisfies readonly OriginalPackItemBlueprint[];

function defineOriginalPack(seed: OriginalPackSeed): TeamPackDefinition {
  const { items, ...pack } = seed;
  if (items.length !== ORIGINAL_PACK_ITEM_BLUEPRINTS.length) {
    throw new Error(`${seed.id} doit contenir ${ORIGINAL_PACK_ITEM_BLUEPRINTS.length} objets.`);
  }

  return {
    ...pack,
    brandKey: 'clutch-originals',
    kind: 'original',
    licenseHolder: 'Clutch',
    items: items.map((item, index): TeamPackItemDefinition => ({
      ...ORIGINAL_PACK_ITEM_BLUEPRINTS[index],
      accent: item.accent ?? seed.accent,
      description: item.description,
      id: `${seed.id}-${item.slug}`,
      image: item.image,
      name: item.name,
      number: index + 1,
    })),
  };
}

const TITAN_BRONZE = '#B98957';
const FREEFALL_CORAL = '#FF6A55';
const FROST_BLUE = '#9BCFFF';
const ARCANE_VIOLET = '#BE8BE8';
const TURBO_ORANGE = '#FF8A24';
const LAST_ROUND_RED = '#FF5D4D';

export const SANG_DES_TITANS_PACK = defineOriginalPack({
  id: 'sang-des-titans',
  name: 'Pack Sang des Titans',
  title: 'SANG DES TITANS',
  subtitle: 'DERNIER PACTE // PORTE-SERMENT',
  description: 'Douze cosmétiques originaux forgés pour les gardiens d’un pacte titanesque.',
  accent: TITAN_BRONZE,
  price: 1200,
  hero: require('../../../assets/shop/packs/sang-des-titans/sang-des-titans-hero.png'),
  items: [
    {
      slug: 'room',
      name: 'Salle du Dernier Pacte',
      description: 'Un sanctuaire monumental suspendu entre chaînes, pierre claire et métal patiné.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/last-pact-room.png'),
    },
    {
      slug: 'oath-armor',
      name: 'Cuirasse des Serments',
      description: 'Une armure cérémonielle d’ivoire et de bronze destinée aux porteurs du pacte.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/oath-armor.png'),
    },
    {
      slug: 'eclipse-axe',
      name: 'Hache de l’Éclipse',
      description: 'Une hache double dont le fil sombre encadre un éclat d’énergie cyan.',
      accent: '#55D7DF',
      image: require('../../../assets/shop/packs/sang-des-titans/items/eclipse-axe.png'),
    },
    {
      slug: 'pact-banner',
      name: 'Bannière du Pacte',
      description: 'Une bannière grenat marquée du sceau fendu des Titans.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/pact-banner.png'),
    },
    {
      slug: 'monolith-pedestal',
      name: 'Socle Monolithe',
      description: 'Un ensemble de socles massifs taillés pour supporter les reliques les plus lourdes.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/monolith-pedestal.png'),
    },
    {
      slug: 'tribute-token',
      name: 'Jeton du Tribut',
      description: 'Un disque antique serti de trois pierres grenat, témoin du tribut rendu.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/tribute-token.png'),
    },
    {
      slug: 'three-voices-totem',
      name: 'Totem des Trois Voix',
      description: 'Trois anneaux minéraux gravitent autour d’un axe rituel de bronze.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/three-voices-totem.png'),
    },
    {
      slug: 'rift-bearer-badge',
      name: 'Badge Porte-Faille',
      description: 'Un insigne hexagonal traversé par la lame azur du pacte.',
      accent: '#55D7DF',
      image: require('../../../assets/shop/packs/sang-des-titans/items/rift-bearer-badge.png'),
    },
    {
      slug: 'colossi-frame',
      name: 'Cadre des Colosses',
      description: 'Un cadre de bronze renforcé par quatre angles de pierre et de cuir grenat.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/colossi-frame.png'),
    },
    {
      slug: 'titan-wave-effect',
      name: 'Effet Onde Titanide',
      description: 'Une onde tellurique soulève des éclats de roche dans un cercle cyan.',
      accent: '#55D7DF',
      image: require('../../../assets/shop/packs/sang-des-titans/items/titan-wave-effect.png'),
    },
    {
      slug: 'last-pact-card',
      name: 'Carte Dernier Pacte',
      description: 'Une carte de partage qui révèle le sanctuaire et ses reliques titanesques.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/last-pact-card.png'),
    },
    {
      slug: 'oath-bearer-title',
      name: 'Titre Porte-Serment',
      description: 'Le titre « Porte-Serment » pour celles et ceux qui n’abandonnent jamais le pacte.',
      image: require('../../../assets/shop/packs/sang-des-titans/items/oath-bearer-title.png'),
    },
  ],
});

export const CHUTE_LIBRE_PACK = defineOriginalPack({
  id: 'chute-libre',
  name: 'Pack Chute Libre',
  title: 'CHUTE LIBRE',
  subtitle: 'BELVÉDÈRE NOMADE // INSAISISSABLE',
  description: 'Douze cosmétiques originaux pour les éclaireurs qui vivent au bord du vide.',
  accent: FREEFALL_CORAL,
  price: 1200,
  hero: require('../../../assets/shop/packs/chute-libre/chute-libre-hero.png'),
  items: [
    {
      slug: 'room',
      name: 'Belvédère Nomade',
      description: 'Une plateforme mobile ouverte sur les canyons et les routes aériennes.',
      image: require('../../../assets/shop/packs/chute-libre/items/nomad-overlook.png'),
    },
    {
      slug: 'falcon-jetpack',
      name: 'Aéropack Falcon',
      description: 'Un double propulseur d’exploration conçu pour les descentes les plus verticales.',
      image: require('../../../assets/shop/packs/chute-libre/items/falcon-jetpack.png'),
    },
    {
      slug: 'loot-capsule',
      name: 'Capsule de Butin',
      description: 'Une capsule blindée qui protège les trouvailles ramenées des sommets.',
      image: require('../../../assets/shop/packs/chute-libre/items/loot-capsule.png'),
    },
    {
      slug: 'ascent-banner',
      name: 'Bannière Escalade',
      description: 'Une bannière corail frappée du symbole des voyageurs de haute altitude.',
      image: require('../../../assets/shop/packs/chute-libre/items/ascent-banner.png'),
    },
    {
      slug: 'drop-pedestal',
      name: 'Socle de Largage',
      description: 'Des plateformes techniques inspirées des zones de largage nomades.',
      image: require('../../../assets/shop/packs/chute-libre/items/drop-pedestal.png'),
    },
    {
      slug: 'survivor-token',
      name: 'Jeton Survivant',
      description: 'Une médaille d’acier gravée pour celles et ceux qui reviennent du dernier cercle.',
      image: require('../../../assets/shop/packs/chute-libre/items/survivor-token.png'),
    },
    {
      slug: 'summit-beacon',
      name: 'Balise Sommet',
      description: 'Une balise de navigation qui marque le point le plus haut de l’expédition.',
      image: require('../../../assets/shop/packs/chute-libre/items/summit-beacon.png'),
    },
    {
      slug: 'scout-badge',
      name: 'Badge Éclaireur',
      description: 'L’insigne ailé des premiers arrivés sur la zone de largage.',
      image: require('../../../assets/shop/packs/chute-libre/items/scout-badge.png'),
    },
    {
      slug: 'altitude-frame',
      name: 'Cadre Altitude',
      description: 'Un cadre technique ivoire et corail renforcé pour les environnements extrêmes.',
      image: require('../../../assets/shop/packs/chute-libre/items/altitude-frame.png'),
    },
    {
      slug: 'last-circle-effect',
      name: 'Effet Dernier Cercle',
      description: 'Deux trajectoires lumineuses se resserrent autour d’une ultime zone sûre.',
      accent: '#FFB34D',
      image: require('../../../assets/shop/packs/chute-libre/items/last-circle-effect.png'),
    },
    {
      slug: 'share-card',
      name: 'Carte de Partage',
      description: 'Une carte paysage qui capture le Belvédère Nomade au-dessus des canyons.',
      image: require('../../../assets/shop/packs/chute-libre/items/share-card.png'),
    },
    {
      slug: 'untouchable-title',
      name: 'Titre Insaisissable',
      description: 'Le titre « Insaisissable » pour les explorateurs toujours hors de portée.',
      image: require('../../../assets/shop/packs/chute-libre/items/untouchable-title.png'),
    },
  ],
});

export const SERMENT_DU_GIVRE_PACK = defineOriginalPack({
  id: 'serment-du-givre',
  name: 'Pack Serment du Givre',
  title: 'SERMENT DU GIVRE',
  subtitle: 'DRAGON VEYR // GARDE-GIVRE',
  description: 'Douze cosmétiques originaux gardés par le dragon des cimes éternelles.',
  accent: FROST_BLUE,
  price: 1200,
  hero: require('../../../assets/shop/packs/serment-du-givre/serment-du-givre-hero.png'),
  items: [
    {
      slug: 'room',
      name: 'Bastion des Cimes',
      description: 'Une forteresse de pierre bleue ouverte sur les glaciers et les sommets.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/summit-bastion.png'),
    },
    {
      slug: 'veyr-dragon',
      name: 'Dragon Veyr',
      description: 'Le gardien ailé des cimes, façonné dans l’acier sombre et la glace azur.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/veyr-dragon.png'),
    },
    {
      slug: 'snow-compass',
      name: 'Boussole des Neiges',
      description: 'Une boussole d’expédition dont l’aiguille pointe vers le cristal du Givre.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/snow-compass.png'),
    },
    {
      slug: 'oath-banner',
      name: 'Bannière du Serment',
      description: 'Une bannière bleu nuit portant le cristal ailé des veilleurs.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/oath-banner.png'),
    },
    {
      slug: 'ice-sheet-pedestal',
      name: 'Socle Banquise',
      description: 'Des plateformes minérales recouvertes d’une pellicule de glace vive.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/ice-sheet-pedestal.png'),
    },
    {
      slug: 'cold-breath-token',
      name: 'Jeton Souffle-Froid',
      description: 'Un jeton d’argent gravé du profil de Veyr et serti d’un éclat azur.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/cold-breath-token.png'),
    },
    {
      slug: 'summit-egg',
      name: 'Œuf des Cimes',
      description: 'Un cristal ancestral protégé par un berceau de roche gelée.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/summit-egg.png'),
    },
    {
      slug: 'watcher-badge',
      name: 'Badge Veilleur',
      description: 'L’insigne d’acier et de glace des gardiens du Bastion.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/watcher-badge.png'),
    },
    {
      slug: 'rampart-frame',
      name: 'Cadre Rempart',
      description: 'Un cadre de pierre sombre renforcé de métal givré.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/rampart-frame.png'),
    },
    {
      slug: 'first-frost-effect',
      name: 'Effet Premier Givre',
      description: 'Une fracture glacée se propage sous une pluie d’éclats de neige.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/first-frost-effect.png'),
    },
    {
      slug: 'summit-card',
      name: 'Carte des Cimes',
      description: 'Une carte de partage qui révèle Veyr au cœur du Bastion gelé.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/summit-card.png'),
    },
    {
      slug: 'frost-guard-title',
      name: 'Titre Garde-Givre',
      description: 'Le titre « Garde-Givre » pour les protecteurs du Serment.',
      image: require('../../../assets/shop/packs/serment-du-givre/items/frost-guard-title.png'),
    },
  ],
});

export const CONCLAVE_ARCANIQUE_PACK = defineOriginalPack({
  id: 'conclave-arcanique',
  name: 'Pack Conclave Arcanique',
  title: 'CONCLAVE ARCANIQUE',
  subtitle: 'BRUMOUSSE // TISSE-SORTS',
  description: 'Douze cosmétiques originaux où la pierre claire rencontre la magie florale.',
  accent: ARCANE_VIOLET,
  price: 1200,
  hero: require('../../../assets/shop/packs/conclave-arcanique/conclave-arcanique-hero.png'),
  items: [
    {
      slug: 'room',
      name: 'Clairière du Conclave',
      description: 'Une clairière suspendue bordée d’arches, de fleurs et de cascades lointaines.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/conclave-clearing.png'),
    },
    {
      slug: 'brumousse',
      name: 'Brumousse',
      description: 'Un familier végétal au regard curieux, couronné de feuilles et de cristaux violets.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/brumousse.png'),
    },
    {
      slug: 'conclave-seal',
      name: 'Sceau du Conclave',
      description: 'Un cristal violet protégé par deux rameaux d’or arcanique.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/conclave-seal.png'),
    },
    {
      slug: 'bloom-banner',
      name: 'Bannière Floraison',
      description: 'Une bannière vert sauge brodée du sceau floral du Conclave.',
      accent: '#98AA72',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/bloom-banner.png'),
    },
    {
      slug: 'rosette-pedestal',
      name: 'Socle Rosace',
      description: 'Des socles de pierre claire gravés d’une rosace et sertis de gemmes violettes.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/rosette-pedestal.png'),
    },
    {
      slug: 'omen-token',
      name: 'Jeton Présage',
      description: 'Un médaillon vert minéral parcouru de rameaux dorés.',
      accent: '#98AA72',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/omen-token.png'),
    },
    {
      slug: 'bud-totem',
      name: 'Totem Bourgeon',
      description: 'Une pousse torsadée protège un cristal prêt à éclore.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/bud-totem.png'),
    },
    {
      slug: 'guardian-badge',
      name: 'Badge Gardien',
      description: 'Un écu végétal serti du cristal du Conclave.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/guardian-badge.png'),
    },
    {
      slug: 'trellis-frame',
      name: 'Cadre Treille',
      description: 'Un cadre de pierre claire envahi par une treille dorée et vivante.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/trellis-frame.png'),
    },
    {
      slug: 'hatching-effect',
      name: 'Effet Éclosion',
      description: 'Des pétales violets et des filaments d’or dessinent une floraison lumineuse.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/hatching-effect.png'),
    },
    {
      slug: 'conclave-card',
      name: 'Carte du Conclave',
      description: 'Une carte de partage où Brumousse veille sur la clairière équipée.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/conclave-card.png'),
    },
    {
      slug: 'spell-weaver-title',
      name: 'Titre Tisse-Sorts',
      description: 'Le titre « Tisse-Sorts » pour les architectes de la magie vivante.',
      image: require('../../../assets/shop/packs/conclave-arcanique/items/spell-weaver-title.png'),
    },
  ],
});

export const TURBO_ARENA_PACK = defineOriginalPack({
  id: 'turbo-arena',
  name: 'Pack Turbo Arena',
  title: 'TURBO ARENA',
  subtitle: 'BOLIDE COMÈTE // DERNIÈRE SECONDE',
  description: 'Douze cosmétiques originaux pour transformer la Vitrine en arène suralimentée.',
  accent: TURBO_ORANGE,
  price: 1200,
  hero: require('../../../assets/shop/packs/turbo-arena/turbo-arena-hero.png'),
  items: [
    {
      slug: 'room',
      name: 'Dôme Turbo',
      description: 'Un garage panoramique ouvert sur une arène éclairée pour les prolongations.',
      accent: '#4DA8FF',
      image: require('../../../assets/shop/packs/turbo-arena/items/turbo-dome.png'),
    },
    {
      slug: 'comet-car',
      name: 'Bolide Comète',
      description: 'Un bolide bleu et orange préparé pour les accélérations de dernière seconde.',
      image: require('../../../assets/shop/packs/turbo-arena/items/comet-car.png'),
    },
    {
      slug: 'orbital-ball',
      name: 'Ballon Orbital',
      description: 'Un ballon d’arène métallique maintenu en suspension sur son socle.',
      accent: '#4DA8FF',
      image: require('../../../assets/shop/packs/turbo-arena/items/orbital-ball.png'),
    },
    {
      slug: 'overtime-banner',
      name: 'Bannière Overtime',
      description: 'Une bannière bleu profond marquée par la trajectoire d’une comète.',
      accent: '#4DA8FF',
      image: require('../../../assets/shop/packs/turbo-arena/items/overtime-banner.png'),
    },
    {
      slug: 'kickoff-pedestal',
      name: 'Socle Kickoff',
      description: 'Des plateformes gazonnées tracées comme le rond central d’une arène.',
      image: require('../../../assets/shop/packs/turbo-arena/items/kickoff-pedestal.png'),
    },
    {
      slug: 'vortex-wheel',
      name: 'Roue Vortex',
      description: 'Une roue de compétition au moyeu bleu et aux flancs graphite.',
      accent: '#4DA8FF',
      image: require('../../../assets/shop/packs/turbo-arena/items/vortex-wheel.png'),
    },
    {
      slug: 'aerial-trophy',
      name: 'Trophée Aérien',
      description: 'Un trophée orbital qui célèbre les actions conclues dans les airs.',
      image: require('../../../assets/shop/packs/turbo-arena/items/aerial-trophy.png'),
    },
    {
      slug: 'striker-badge',
      name: 'Badge Striker',
      description: 'L’insigne hexagonal des attaquants qui frappent avant le buzzer.',
      accent: '#4DA8FF',
      image: require('../../../assets/shop/packs/turbo-arena/items/striker-badge.png'),
    },
    {
      slug: 'boost-frame',
      name: 'Cadre Boost',
      description: 'Un cadre bleu renforcé par une capsule de propulsion orange.',
      accent: '#4DA8FF',
      image: require('../../../assets/shop/packs/turbo-arena/items/boost-frame.png'),
    },
    {
      slug: 'surtempo-effect',
      name: 'Effet Surtempo',
      description: 'Deux ballons d’énergie tracent une orbite de feu et de plasma bleu.',
      image: require('../../../assets/shop/packs/turbo-arena/items/surtempo-effect.png'),
    },
    {
      slug: 'share-card',
      name: 'Carte de Partage',
      description: 'Une carte paysage qui met le Bolide Comète en scène dans le Dôme Turbo.',
      image: require('../../../assets/shop/packs/turbo-arena/items/share-card.png'),
    },
    {
      slug: 'last-second-title',
      name: 'Titre Dernière Seconde',
      description: 'Le titre « Dernière Seconde » pour les spécialistes des retournements tardifs.',
      image: require('../../../assets/shop/packs/turbo-arena/items/last-second-title.png'),
    },
  ],
});

export const DERNIER_ROUND_PACK = defineOriginalPack({
  id: 'dernier-round',
  name: 'Pack Dernier Round',
  title: 'DERNIER ROUND',
  subtitle: 'CASQUE SENTINELLE // SANG-FROID',
  description: 'Douze cosmétiques originaux pour une escouade qui joue chaque round jusqu’au bout.',
  accent: LAST_ROUND_RED,
  price: 1200,
  hero: require('../../../assets/shop/packs/dernier-round/dernier-round-hero.png'),
  items: [
    {
      slug: 'room',
      name: 'Base Avancée',
      description: 'Une armurerie tactique installée au cœur d’un quartier d’entraînement.',
      image: require('../../../assets/shop/packs/dernier-round/items/forward-base.png'),
    },
    {
      slug: 'sentinel-helmet',
      name: 'Casque Sentinelle',
      description: 'Un casque balistique noir et ivoire traversé par une visière rouge.',
      image: require('../../../assets/shop/packs/dernier-round/items/sentinel-helmet.png'),
    },
    {
      slug: 'vector-carbine',
      name: 'Carabine Vector',
      description: 'Une carabine compacte rouge et graphite montée sur son présentoir blindé.',
      image: require('../../../assets/shop/packs/dernier-round/items/vector-carbine.png'),
    },
    {
      slug: 'squad-banner',
      name: 'Bannière Escouade',
      description: 'Une bannière tactique marquée du monogramme du Dernier Round.',
      image: require('../../../assets/shop/packs/dernier-round/items/squad-banner.png'),
    },
    {
      slug: 'extraction-pedestal',
      name: 'Socle Extraction',
      description: 'Des plateformes blindées guidées par un signal rouge de sécurisation.',
      image: require('../../../assets/shop/packs/dernier-round/items/extraction-pedestal.png'),
    },
    {
      slug: 'match-point-token',
      name: 'Jeton Match Point',
      description: 'Un jeton d’acier marqué du point décisif et de sa ligne rouge.',
      image: require('../../../assets/shop/packs/dernier-round/items/match-point-token.png'),
    },
    {
      slug: 'scout-drone',
      name: 'Drone Éclaireur',
      description: 'Un drone quadrupède chargé de lire les angles avant l’escouade.',
      accent: '#7FE8DB',
      image: require('../../../assets/shop/packs/dernier-round/items/scout-drone.png'),
    },
    {
      slug: 'operator-badge',
      name: 'Badge Opérateur',
      description: 'L’insigne géométrique des opérateurs qui gardent leur sang-froid.',
      image: require('../../../assets/shop/packs/dernier-round/items/operator-badge.png'),
    },
    {
      slug: 'ballistic-frame',
      name: 'Cadre Balistique',
      description: 'Un cadre renforcé noir et ivoire verrouillé par une attache rouge.',
      image: require('../../../assets/shop/packs/dernier-round/items/ballistic-frame.png'),
    },
    {
      slug: 'scan-effect',
      name: 'Effet Balayage',
      description: 'Une grille tactique tridimensionnelle révèle un signal triangulaire hostile.',
      accent: '#7FE8DB',
      image: require('../../../assets/shop/packs/dernier-round/items/scan-effect.png'),
    },
    {
      slug: 'share-card',
      name: 'Carte de Partage',
      description: 'Une carte paysage qui présente l’escouade et son équipement dans la Base Avancée.',
      image: require('../../../assets/shop/packs/dernier-round/items/share-card.png'),
    },
    {
      slug: 'cold-blood-title',
      name: 'Titre Sang-Froid',
      description: 'Le titre « Sang-Froid » pour les joueurs qui restent lucides au dernier round.',
      image: require('../../../assets/shop/packs/dernier-round/items/cold-blood-title.png'),
    },
  ],
});
