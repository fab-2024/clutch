export type CollectionScope = 'owned' | 'catalog';
export type ShopSurface = 'atelier' | 'locker';

export function collectionScopeFromParam(value?: string | string[]): CollectionScope {
  return (Array.isArray(value) ? value[0] : value) === 'catalog' ? 'catalog' : 'owned';
}

export function shopSurfaceFromParam(value?: string | string[]): ShopSurface {
  return (Array.isArray(value) ? value[0] : value) === 'owned' ? 'locker' : 'atelier';
}
