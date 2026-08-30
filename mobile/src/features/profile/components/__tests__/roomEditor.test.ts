/// <reference types="jest" />

import {
  SHOWCASE_ROOM_SLOTS,
  createDefaultShowcaseRoomAssignments,
  createEmptyShowcaseRoomAssignments,
  type ShowcasePlaceableItem,
} from '../showcase/roomEditor';

const ITEMS: ShowcasePlaceableItem[] = [
  { accent: '#31D7E2', id: 'frame:one', kind: 'frame', name: 'Cadre Brut' },
  { accent: '#F5792A', id: 'jersey:fnc', kind: 'jersey', name: 'Fnatic' },
  { accent: '#FFB84D', id: 'trophy:first', kind: 'trophy', name: 'Premier Signal' },
  { accent: '#E8FF3D', id: 'rank:bronze', kind: 'rank', name: 'Bronze' },
  { accent: '#63B8FF', id: 'badge:first', kind: 'badge', name: 'Premier Signal' },
  { accent: '#AAB4BE', id: 'title:rookie', kind: 'title', name: 'Rookie du Call' },
  { accent: '#B4774E', id: 'ring:rank', kind: 'ring', name: 'Couronne de Rang' },
  { accent: '#E8FF3D', id: 'core:origin', kind: 'core', name: 'Core Origine' },
];

describe('showcase room editor assignments', () => {
  it('defines eight default placements and reserves ten assignment slots', () => {
    expect(SHOWCASE_ROOM_SLOTS).toHaveLength(8);
    expect(new Set(SHOWCASE_ROOM_SLOTS.map((slot) => slot.id)).size).toBe(8);
    expect(Object.keys(createEmptyShowcaseRoomAssignments())).toHaveLength(10);
  });

  it('fills each placement from the matching real collection family', () => {
    const assignments = createDefaultShowcaseRoomAssignments(ITEMS);

    expect(assignments['left-free']?.kind).toBe('frame');
    expect(assignments.jersey?.kind).toBe('jersey');
    expect(assignments.trophy?.kind).toBe('trophy');
    expect(assignments.rank?.kind).toBe('rank');
    expect(assignments.badge?.kind).toBe('badge');
    expect(assignments.title?.kind).toBe('title');
    expect(assignments.ring?.kind).toBe('ring');
    expect(assignments['right-free']?.kind).toBe('core');
  });
});
