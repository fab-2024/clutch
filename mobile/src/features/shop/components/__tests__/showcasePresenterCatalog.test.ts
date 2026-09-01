/// <reference types="jest" />

import {
  DEFAULT_SHOWCASE_PRESENTER_ID,
  SHOWCASE_PRESENTER_CATALOG,
  showcasePresenterById,
} from '../../showcasePresenterCatalog';
import { createPresenterRoomAssignments } from '../../showcasePresenterAssignments';
import {
  LEAGUE_OF_LEGENDS_COLLECTION_PACK,
  NEON_PROTOCOL_PACK,
  ROCKET_LEAGUE_COLLECTION_PACK,
  VALORANT_COLLECTION_PACK,
} from '../../teamPackCatalog';

describe('showcase presenter catalog', () => {
  it('keeps the approved presenters and team-pack scenes in visual order', () => {
    expect(SHOWCASE_PRESENTER_CATALOG.map((presenter) => presenter.id)).toEqual([
      'supports_gallery',
      'supports_forge',
      'supports_halo',
      'supports_crystal',
      'supports_vault',
      'supports_champagne',
      'neon-protocol-vector-pedestals',
      'fnatic-pedestals',
      'kc-pedestals',
      'm8-pedestals',
      'lol-jinx-fishbones-gallery',
      'valorant-jett-gallery',
      'rocket-league-octane-gallery',
    ]);
    expect(SHOWCASE_PRESENTER_CATALOG.map((presenter) => presenter.slots.length)).toEqual([
      8,
      8,
      10,
      8,
      10,
      6,
      9,
      10,
      10,
      10,
      5,
      5,
      5,
    ]);
  });

  it('places the nine Protocole Néon objects on the Synapse stations', () => {
    expect(showcasePresenterById('neon-protocol-vector-pedestals')).toMatchObject({
      accent: '#58DFFF',
      name: 'Socle Vectoriel',
      packId: 'neon-protocol',
      showRankDisplay: false,
    });

    const items = NEON_PROTOCOL_PACK.items
      .filter((item) => item.roomKind)
      .map((item) => ({
        accent: item.accent,
        id: `cosmetic:${item.id}`,
        image: item.image,
        kind: item.roomKind!,
        name: item.name,
      }));
    const assignments = createPresenterRoomAssignments(items, 'neon-protocol-vector-pedestals');

    expect(assignments.jersey?.name).toBe('Armure Vega');
    expect(assignments.trophy?.name).toBe('Totem Null');
    expect(assignments['left-extra']?.name).toBe('Bannière Phase');
    expect(assignments['right-extra']?.name).toBe('Glyphe Nœud');
    expect(assignments.badge?.name).toBe('Badge Pionnier');
    expect(assignments.ring?.name).toBe('Jeton Syn');
    expect(assignments.title?.name).toBe('Titre Architecte');
    expect(assignments['left-free']?.name).toBe('Cadre Phase');
    expect(assignments['right-free']?.name).toBe('Carte de partage');
  });

  it('exposes and fills the five fixed Valorant collection slots', () => {
    expect(showcasePresenterById('valorant-jett-gallery')).toMatchObject({
      accent: '#FF4655',
      name: 'Collection Valorant',
      packId: 'valorant-collection',
      showRankDisplay: false,
    });
    expect(showcasePresenterById('valorant-jett-gallery')?.slots).toHaveLength(5);

    const items = VALORANT_COLLECTION_PACK.items.map((item) => ({
      accent: item.accent,
      id: `cosmetic:${item.id}`,
      image: item.image,
      kind: item.roomKind!,
      name: item.name,
    }));
    const assignments = createPresenterRoomAssignments(items, 'valorant-jett-gallery');

    expect(assignments['left-free']?.name).toBe('Vandal');
    expect(assignments['left-extra']?.name).toBe('Spike');
    expect(assignments.trophy?.name).toBe('Jett');
    expect(assignments['right-extra']?.name).toBe('Omen');
    expect(assignments['right-free']?.name).toBe('Wingman');
  });

  it('exposes and fills the five fixed Rocket League collection slots', () => {
    expect(showcasePresenterById('rocket-league-octane-gallery')).toMatchObject({
      accent: '#FF8A24',
      name: 'Collection Rocket League',
      packId: 'rocket-league-collection',
      showRankDisplay: false,
    });
    expect(showcasePresenterById('rocket-league-octane-gallery')?.slots).toHaveLength(5);

    const items = ROCKET_LEAGUE_COLLECTION_PACK.items.map((item) => ({
      accent: item.accent,
      id: `cosmetic:${item.id}`,
      image: item.image,
      kind: item.roomKind!,
      name: item.name,
    }));
    const assignments = createPresenterRoomAssignments(items, 'rocket-league-octane-gallery');

    expect(assignments['left-free']?.name).toBe('Roue Zomba');
    expect(assignments['left-extra']?.name).toBe('Boost 100');
    expect(assignments.trophy?.name).toBe('Octane');
    expect(assignments['right-extra']?.name).toBe('Ballon d’arène');
    expect(assignments['right-free']?.name).toBe('Explosion de but');
  });

  it('exposes ten clickable slots linked to the KC Blue Wall pack', () => {
    expect(showcasePresenterById('kc-pedestals')).toMatchObject({
      accent: '#168DFF',
      name: 'Karmine Corp Blue Wall',
      packId: 'kc-blue-wall',
      rarity: 'legendaire',
    });
    expect(showcasePresenterById('kc-pedestals')?.slots).toHaveLength(10);
  });

  it('exposes ten clickable slots for the Fnatic Black & Orange room', () => {
    expect(showcasePresenterById('fnatic-pedestals')).toMatchObject({
      accent: '#FF5900',
      name: 'Fnatic Black & Orange',
      rarity: 'legendaire',
    });
    expect(showcasePresenterById('fnatic-pedestals')?.slots).toHaveLength(10);
  });

  it('exposes ten clickable slots linked to the M8 Gentle Mates Paris pack', () => {
    expect(showcasePresenterById('m8-pedestals')).toMatchObject({
      accent: '#B9DCFF',
      name: 'M8 Gentle Mates Paris',
      packId: 'm8-gentle-mates',
      rarity: 'legendaire',
    });
    expect(showcasePresenterById('m8-pedestals')?.slots).toHaveLength(10);
  });

  it('exposes five fixed collection slots without a rank display for League of Legends', () => {
    expect(showcasePresenterById('lol-jinx-fishbones-gallery')).toMatchObject({
      accent: '#D6B56A',
      name: 'Collection League of Legends',
      packId: 'league-of-legends-collection',
      showRankDisplay: false,
    });
    expect(showcasePresenterById('lol-jinx-fishbones-gallery')?.slots).toHaveLength(5);
  });

  it('places the five League of Legends objects on their dedicated pedestals', () => {
    const items = LEAGUE_OF_LEGENDS_COLLECTION_PACK.items.map((item) => ({
      accent: item.accent,
      id: `cosmetic:${item.id}`,
      image: item.image,
      kind: item.roomKind!,
      name: item.name,
    }));
    const assignments = createPresenterRoomAssignments(items, 'lol-jinx-fishbones-gallery');

    expect(assignments['left-free']?.name).toBe('Lame d’Infini');
    expect(assignments['left-extra']?.name).toBe('Fragment du Nexus');
    expect(assignments.trophy?.name).toBe('Jinx & Fishbones');
    expect(assignments['right-extra']?.name).toBe('Baron Nashor');
    expect(assignments['right-free']?.name).toBe('Balise de vision');
  });

  it('keeps every placement independently clickable inside each presenter', () => {
    SHOWCASE_PRESENTER_CATALOG.forEach((presenter) => {
      expect(presenter.image).toBeTruthy();
      expect(new Set(presenter.slots.map((slot) => slot.id)).size).toBe(presenter.slots.length);
      expect(presenter.slots.every((slot) => Number.parseFloat(slot.width) > 0)).toBe(true);
      expect(presenter.slots.every((slot) => Number.parseFloat(slot.height) > 0)).toBe(true);
    });
  });

  it('keeps Cercle Obsidienne as the included compatibility default', () => {
    expect(DEFAULT_SHOWCASE_PRESENTER_ID).toBe('supports_gallery');
    expect(showcasePresenterById(DEFAULT_SHOWCASE_PRESENTER_ID)).toMatchObject({
      name: 'Cercle Obsidienne',
      price: 0,
      rarity: 'commun',
    });
  });
});
