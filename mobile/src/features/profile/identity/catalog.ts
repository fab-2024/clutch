/** Profile identity contract. Prices are proposals until the server publishes them. */
export type IdentityPackId = 'clutch-original' | 'graphite' | 'tactique' | 'racing' | 'tribune' | 'underground' | 'neon-nocturne' | 'ivoire' | 'maillot' | 'editorial' | 'holographique' | 'memoire-saison';
export type IdentityComponent = 'frame' | 'background' | 'signature';
export type IdentityAccess = { kind: 'included' } | { kind: 'volts'; tier: 'quick' | 'medium' | 'long' } | { kind: 'store'; proposedCents: number } | { kind: 'season' };
export type IdentityPack = {
  id: IdentityPackId; name: string; material: string; description: string;
  accent: string; access: IdentityAccess; teamAdaptive: boolean;
  components: readonly IdentityComponent[]; customNumber?: boolean; openingReflection?: boolean;
  reference: string;
};
const components = ['frame', 'background', 'signature'] as const;
export const IDENTITY_PACKS: readonly IdentityPack[] = [
  { id: 'clutch-original', name: 'Clutch Original', material: 'Noir texturé · Jaune acide', description: 'Ton identité complète dès le premier jour.', accent: '#E5F627', access: { kind: 'included' }, teamAdaptive: false, components, reference: '18_32_11' },
  { id: 'graphite', name: 'Graphite', material: 'Carbone mat · Champagne', description: 'Des lignes sobres et des finitions champagne.', accent: '#D4B995', access: { kind: 'volts', tier: 'quick' }, teamAdaptive: true, components, reference: '18_31_56' },
  { id: 'tactique', name: 'Tactique', material: 'Ardoise · Vert signal', description: 'Un tableau de jeu dessiné pour les stratèges.', accent: '#74D76C', access: { kind: 'volts', tier: 'quick' }, teamAdaptive: false, components, reference: '18_32_35' },
  { id: 'racing', name: 'Racing', material: 'Laque rouge · Carbone', description: 'Des courbes rapides, du carbone et une signature affirmée.', accent: '#ED363D', access: { kind: 'volts', tier: 'medium' }, teamAdaptive: false, components, reference: '18_32_19' },
  { id: 'tribune', name: 'Tribune', material: 'Écharpes · Ferveur', description: 'L’écharpe et la tribune aux couleurs de ton équipe.', accent: '#F89539', access: { kind: 'volts', tier: 'medium' }, teamAdaptive: true, components, reference: '18_32_27' },
  { id: 'underground', name: 'Underground', material: 'Collage · Papier déchiré', description: 'Une identité expressive, entre affiches et tribunes.', accent: '#F0DE35', access: { kind: 'volts', tier: 'long' }, teamAdaptive: true, components, reference: '18_32_31' },
  { id: 'neon-nocturne', name: 'Néon nocturne', material: 'Cyan · Violet électrique', description: 'Ta communauté illuminée dans la nuit.', accent: '#68DFF7', access: { kind: 'volts', tier: 'long' }, teamAdaptive: true, components, reference: '18_32_44' },
  { id: 'ivoire', name: 'Ivoire', material: 'Céramique · Ivoire satiné', description: 'Un cadre céramique, un fond architectural et une signature satinée.', accent: '#EFDFC4', access: { kind: 'store', proposedCents: 399 }, teamAdaptive: false, components, reference: '18_32_16' },
  { id: 'maillot', name: 'Maillot', material: 'Textile · Couleurs d’équipe', description: 'Un cadre brodé, une signature floquée et ton numéro.', accent: '#EA8432', access: { kind: 'store', proposedCents: 499 }, teamAdaptive: true, components, customNumber: true, reference: '18_32_23' },
  { id: 'editorial', name: 'Éditorial', material: 'Portrait XXL · Composition graphique', description: 'Ton avatar prend toute sa place dans une composition de magazine.', accent: '#E9D9BD', access: { kind: 'store', proposedCents: 499 }, teamAdaptive: true, components, reference: '18_32_40' },
  { id: 'holographique', name: 'Holographique', material: 'Obsidienne · Reflets irisés', description: 'Des facettes irisées et un reflet bref à l’ouverture.', accent: '#BFA6F5', access: { kind: 'store', proposedCents: 699 }, teamAdaptive: true, components, openingReflection: true, reference: '18_32_54' },
  { id: 'memoire-saison', name: 'Mémoire de saison', material: 'Millésime · Souvenirs de jeu', description: 'Un souvenir de ta saison, à débloquer progressivement en participant.', accent: '#E8C478', access: { kind: 'season' }, teamAdaptive: true, components, reference: '18_32_49' },
];
export const STARTER_IDENTITY_AVATARS = ['Spectre', 'Nova', 'Vector', 'Glitch', 'Bulwark', 'Ember', 'Ronin', 'Nyx', 'Orion', 'Sylva', 'K.O.', 'Boost', 'Byte', 'Fang', 'Ace'] as const;
export const IDENTITY_COMPONENT_LABELS: Record<IdentityComponent, string> = { frame: 'Cadre', background: 'Fond', signature: 'Signature' };
export function identityPack(id: string) { return IDENTITY_PACKS.find(pack => pack.id === id); }
export function identityAccessLabel(access: IdentityAccess) {
  switch (access.kind) {
    case 'included': return 'Inclus à l’inscription';
    case 'volts': return access.tier === 'quick' ? 'Volts · Accessible rapidement' : access.tier === 'medium' ? 'Volts · Objectif intermédiaire' : 'Volts · Collection au long cours';
    case 'store': return `${(access.proposedCents / 100).toFixed(2).replace('.', ',')} € · Prix envisagé`;
    case 'season': return 'À gagner pendant la saison';
  }
}
/** A cosmetic never grants a performance title, grade, badge, avatar or team membership. */
export function applyIdentityPack<T extends { frame: IdentityPackId; background: IdentityPackId; signature: IdentityPackId }>(current: T, pack: IdentityPackId): T {
  return { ...current, frame: pack, background: pack, signature: pack };
}
export function validJerseyNumber(value: string) { return /^\d{1,2}$/.test(value); }
