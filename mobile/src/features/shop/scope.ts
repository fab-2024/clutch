export type CollectionScope = 'owned' | 'catalog';

export function collectionScopeFromParam(value?: string | string[]): CollectionScope {
  return (Array.isArray(value) ? value[0] : value) === 'catalog' ? 'catalog' : 'owned';
}
