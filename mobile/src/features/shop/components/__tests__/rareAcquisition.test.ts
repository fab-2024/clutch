/// <reference types="jest" />

import { atelierProductById, createAtelierPreviewItems } from '../../atelierCatalog';
import {
  claimRareAcquisitionPresentation,
  createRareAcquisitionEvent,
  isRevealRarity,
  rareAcquisitionDuration,
  rareAcquisitionLabel,
} from '../../rareAcquisition';

describe('rare acquisition presentation contract', () => {
  const items = createAtelierPreviewItems();

  it('keeps common acquisitions on the existing lightweight feedback path', () => {
    const product = atelierProductById('material_graphite');
    const item = items.find((candidate) => candidate.id === product?.id);

    expect(product).toBeTruthy();
    expect(item).toBeTruthy();
    expect(createRareAcquisitionEvent({
      eventKey: 'purchase:material_graphite',
      item: item!,
      origin: 'atelier',
      product,
    })).toBeNull();
    expect(isRevealRarity('commun')).toBe(false);
  });

  it.each([
    ['rare', 900, 'SIGNAL RARE'],
    ['epique', 1_150, 'PIÈCE ÉPIQUE'],
    ['legendaire', 1_400, 'PIÈCE LÉGENDAIRE'],
  ] as const)('maps %s to its controlled intensity', (rarity, duration, label) => {
    expect(isRevealRarity(rarity)).toBe(true);
    expect(rareAcquisitionDuration(rarity, false)).toBe(duration);
    expect(rareAcquisitionDuration(rarity, true)).toBe(180);
    expect(rareAcquisitionLabel(rarity)).toBe(label);
  });

  it('carries the Atelier material and provenance into the reveal', () => {
    const product = atelierProductById('material_carbon');
    const item = items.find((candidate) => candidate.id === product?.id);
    const event = createRareAcquisitionEvent({
      eventKey: 'purchase:material_carbon:1',
      item: item!,
      origin: 'atelier',
      product,
    });

    expect(event).toMatchObject({
      category: 'MATÉRIAUX',
      eventKey: 'purchase:material_carbon:1',
      origin: 'atelier',
      provenance: 'ATELIER GRIFF · ACQUISITION VOLTS',
    });
    expect(event?.image).toBe(product?.image);
  });

  it('claims a routed acquisition event only once per app session', () => {
    const eventKey = 'hub:reward-session-test:2026-08-29T10:00:00.000Z';

    expect(claimRareAcquisitionPresentation(eventKey)).toBe(true);
    expect(claimRareAcquisitionPresentation(eventKey)).toBe(false);
  });
});
