import type { ImageSourcePropType } from 'react-native';

export type FigurineAccess = { kind: 'volts'; price: 100 | 200 | 300 } | { kind: 'store'; priceCents: 399 | 599 };
export type Figurine = { id: string; name: string; access: FigurineAccess; starter: boolean; image: ImageSourcePropType };
const volts = (id: string, name: string, price: 100 | 200 | 300, image: ImageSourcePropType, starter = false): Figurine => ({ id, name, starter, image, access: { kind: 'volts', price } });
const store = (id: string, name: string, priceCents: 399 | 599, image: ImageSourcePropType): Figurine => ({ id, name, starter: false, image, access: { kind: 'store', priceCents } });

// New identifiers never replace legacy owned-item identifiers. Pricing and
// evolution thresholds must be backed by the server before acquisition goes live.
export const FIGURINE_UNIVERSES = [
  { id: 'conclave', name: 'Conclave Arcanique', accent: '#C9A878', items: [
    volts('brumousse', 'Brumousse', 200, require('../../../../assets/shop/figurines/items/brumousse.png'), true),
    store('lumiflor', 'Lumiflor', 399, require('../../../../assets/shop/figurines/items/lumiflor.png')),
    volts('rocorne', 'Rocorne', 300, require('../../../../assets/shop/figurines/items/rocorne.png')),
    volts('mycelune', 'Mycélune', 300, require('../../../../assets/shop/figurines/items/mycelune.png')),
  ] },
  { id: 'givre', name: 'Serment du Givre', accent: '#8ED8FF', items: [
    store('veyr', 'Veyr', 599, require('../../../../assets/shop/figurines/items/veyr.png')),
    volts('nivea', 'Nivéa', 200, require('../../../../assets/shop/figurines/items/nivea.png')),
    store('boreal', 'Boréal', 399, require('../../../../assets/shop/figurines/items/boreal.png')),
    volts('grelot', 'Grelot', 100, require('../../../../assets/shop/figurines/items/grelot.png'), true),
  ] },
  { id: 'protocole', name: 'Protocole Zéro', accent: '#D9B38C', items: [
    volts('sentinelle', 'Sentinelle', 200, require('../../../../assets/shop/figurines/items/sentinelle.png')),
    store('vega', 'Vega', 399, require('../../../../assets/shop/figurines/items/vega.png')),
    volts('echo', 'Écho', 100, require('../../../../assets/shop/figurines/items/echo.png'), true),
    volts('spectre', 'Spectre', 300, require('../../../../assets/shop/figurines/items/spectre.png')),
    store('bastion', 'Bastion', 599, require('../../../../assets/shop/figurines/items/bastion.png')),
  ] },
  { id: 'forges', name: 'Les Forges du Pacte', accent: '#E09A50', items: [
    volts('orea', 'Oréa', 300, require('../../../../assets/shop/figurines/items/orea.png')),
    store('porte-serment', 'Porte-Serment', 399, require('../../../../assets/shop/figurines/items/porte-serment.png')),
    volts('cendre', 'Cendre', 200, require('../../../../assets/shop/figurines/items/cendre.png')),
    volts('obsidien', 'Obsidien', 300, require('../../../../assets/shop/figurines/items/obsidien.png')),
    store('aureon', 'Auréon', 399, require('../../../../assets/shop/figurines/items/aureon.png')),
  ] },
  { id: 'circuit', name: 'Circuit Nomade', accent: '#FF8A42', items: [
    volts('comete', 'Comète', 200, require('../../../../assets/shop/figurines/items/comete.png')),
    store('falcon', 'Falcon', 599, require('../../../../assets/shop/figurines/items/falcon.png')),
    store('kairos-6', 'Kairos-6', 599, require('../../../../assets/shop/figurines/items/kairos-6.png')),
    volts('dash', 'Dash', 100, require('../../../../assets/shop/figurines/items/dash.png')),
    volts('voltige', 'Voltige', 200, require('../../../../assets/shop/figurines/items/voltige.png')),
    volts('piston', 'Piston', 100, require('../../../../assets/shop/figurines/items/piston.png')),
  ] },
] as const;
export const FIGURINES = FIGURINE_UNIVERSES.flatMap(universe => universe.items);
export const STARTER_FIGURINES = FIGURINES.filter(item => item.starter);
export function figurineAccessLabel(item: Figurine) {
  return item.access.kind === 'volts' ? `${item.access.price} Volts` : `${(item.access.priceCents / 100).toFixed(2).replace('.', ',')} €`;
}
