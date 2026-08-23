export const BRAND_NAME = 'GRIFF';
export const BRAND_TAGLINE = 'LAISSE TA MARQUE.';

/**
 * Keeps server-owned, historical labels compatible while the database
 * migration reaches every environment. Technical identifiers are never
 * passed through this presentation-only helper.
 */
export function visibleBrandLabel(value: string) {
  return value.replace(/\bclutch\b/gi, BRAND_NAME);
}
