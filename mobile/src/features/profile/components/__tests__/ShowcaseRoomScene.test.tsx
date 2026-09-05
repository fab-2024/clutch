/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';

import { SHOWCASE_ROOM_CATALOG } from '@/src/features/shop/showcaseRoomCatalog';
import { createPresenterRoomAssignments } from '@/src/features/shop/showcasePresenterAssignments';
import { SHOWCASE_PRESENTER_CATALOG } from '@/src/features/shop/showcasePresenterCatalog';
import { SHOWCASE_RANK_DISPLAY_CATALOG } from '@/src/features/shop/showcaseRankDisplayCatalog';
import {
  applyPreviewTeamPackAction,
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
  KC_TEAM_PACK,
  M8_TEAM_PACK,
} from '@/src/features/shop/teamPackCatalog';
import {
  DEFAULT_MONETIZATION_CONTRACT,
  EMPTY_EQUIPPED_COSMETICS,
  type EquippedCosmetic,
} from '@/src/features/shop/types';
import {
  adaptShowcaseRingStats,
  resolveEquippedShowcaseRing,
} from '../../showcaseRings/progression';
import { PREVIEW_PROFILE } from '../ProfilePreviewScreen';
import ShowcaseCustomizationBar, {
  showcasePresenterOptions,
  ShowcaseControlGroup,
} from '../showcase/ShowcaseCustomizationBar';
import ShowcaseRoomEditorScene from '../showcase/ShowcaseRoomEditorScene';
import ShowcaseRoomScene from '../showcase/ShowcaseRoomScene';
import ShowcaseTopNavigation from '../showcase/ShowcaseTopNavigation';
import {
  createDefaultShowcaseRoomAssignments,
  type ShowcasePlaceableItem,
} from '../showcase/roomEditor';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => 'TeamLogo');
jest.mock('../ProfileScreen', () => 'ProfileScreen');
jest.mock('../showcase/ShowcaseAtmosphereLayer', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return function ShowcaseAtmosphereMock({
    active,
    cosmetics,
    reduceMotion,
  }: {
    active: boolean;
    cosmetics?: { factionEffect?: { id?: string } | null } | null;
    reduceMotion: boolean;
  }) {
    const effectId = cosmetics?.factionEffect?.id ?? 'ambient';
    return React.createElement(ReactNative.View, {
      accessibilityLabel: `Atmosphère ${effectId}, ${reduceMotion ? 'mouvements réduits' : 'animée'}`,
      pointerEvents: 'none',
      testID: `showcase-atmosphere-${active ? 'active' : 'paused'}`,
    });
  };
});

const ROOM_PROPS = {
  cosmetics: PREVIEW_PROFILE.cosmetics,
  data: PREVIEW_PROFILE,
  loading: false,
  rankAccent: '#E8FF3D',
  rankLabel: 'BRONZE',
} as const;

describe('Showcase room composition', () => {
  it('keeps a pack presenter available after its owner previews another presenter', async () => {
    const onPresenterChange = jest.fn();
    const props = {
      lighting: 'cyan' as const,
      onLightingChange: jest.fn(),
      onPresenterChange,
      onRankDisplayChange: jest.fn(),
      onThemeChange: jest.fn(),
      presenterId: 'supports_gallery',
      rankDisplayId: SHOWCASE_RANK_DISPLAY_CATALOG[0].id,
      rankDisplays: SHOWCASE_RANK_DISPLAY_CATALOG,
      theme: 'graphite' as const,
    };
    expect(showcasePresenterOptions('supports_gallery')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'fnatic-pedestals' })]),
    );
    expect(showcasePresenterOptions('supports_gallery')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'kc-pedestals' })]),
    );
    const unlockedScreen = await render(
      <ShowcaseCustomizationBar {...props} unlockedPresenterIds={['fnatic-pedestals']} />,
    );
    await fireEvent.press(unlockedScreen.getByTestId('showcase-control-fnatic-pedestals'));

    expect(onPresenterChange).toHaveBeenCalledWith('fnatic-pedestals');
  });

  it('unlocks the KC presenter with ten independent Blue Wall slots', async () => {
    const onPresenterChange = jest.fn();
    const screen = await render(
      <ShowcaseCustomizationBar
        lighting="blue"
        onLightingChange={jest.fn()}
        onPresenterChange={onPresenterChange}
        onRankDisplayChange={jest.fn()}
        onThemeChange={jest.fn()}
        presenterId="supports_gallery"
        rankDisplayId={SHOWCASE_RANK_DISPLAY_CATALOG[0].id}
        rankDisplays={SHOWCASE_RANK_DISPLAY_CATALOG}
        theme="graphite"
        unlockedPresenterIds={['kc-pedestals']}
      />,
    );

    await fireEvent.press(screen.getByTestId('showcase-control-kc-pedestals'));
    expect(onPresenterChange).toHaveBeenCalledWith('kc-pedestals');
    expect(SHOWCASE_PRESENTER_CATALOG.find((presenter) => presenter.id === 'kc-pedestals')?.slots).toHaveLength(10);
  });

  it('auto-assigns the equipped KC pack across ten clickable Blue Wall slots', async () => {
    const presenter = SHOWCASE_PRESENTER_CATALOG.find((candidate) => candidate.id === 'kc-pedestals');
    if (!presenter) throw new Error('Missing KC presenter');
    const equippedShop = applyPreviewTeamPackAction({
      balance: KC_TEAM_PACK.price,
      contract: DEFAULT_MONETIZATION_CONTRACT,
      equipped: EMPTY_EQUIPPED_COSMETICS,
      items: createTeamPackPreviewItems(KC_TEAM_PACK),
    }, KC_TEAM_PACK);
    expect(equippedShop.equipped.showcase.supports?.id).toBe(presenter.id);
    expect(equippedShop.equipped.showcase.jersey?.id).toBe('kc-jersey');
    expect(equippedShop.equipped.factionEffect?.id).toBe('kc-blue-wall-effect');

    const ownedIds = new Set(equippedShop.items.filter((item) => item.owned).map((item) => item.id));
    const items: ShowcasePlaceableItem[] = KC_TEAM_PACK.items.flatMap((item) => (
      ownedIds.has(item.id) && item.roomKind
        ? [{
          accent: item.accent,
          id: `cosmetic:${item.id}`,
          image: item.image,
          kind: item.roomKind,
          name: item.name,
        }]
        : []
    ));
    items.push({ accent: '#B87845', id: 'rank:bronze', kind: 'rank', name: 'Bronze' });
    const assignments = createPresenterRoomAssignments(items, presenter.id);

    expect(Object.values(assignments).filter(Boolean)).toHaveLength(10);
    expect(assignments['left-free']?.id).toBe('cosmetic:kc-profile-frame');
    expect(assignments.jersey?.id).toBe('cosmetic:kc-jersey');
    expect(assignments['right-free']?.id).toBe('cosmetic:kc-share-card');

    const onSlotPress = jest.fn();
    const screen = await render(
      <ShowcaseRoomEditorScene
        assignments={assignments}
        atmosphereActive
        cosmetics={equippedShop.equipped}
        favoriteTeam={{
          ...PREVIEW_PROFILE.favoriteTeam!,
          id: 'kc',
          nom: 'Karmine Corp',
          tag: 'KC',
        }}
        lighting="blue"
        onSlotPress={onSlotPress}
        rankAccent="#B87845"
        rankOrder={0}
        reduceMotion
        room={presenter}
        slots={presenter.slots}
      />,
    );

    expect(screen.getByTestId('showcase-atmosphere-active')).toBeTruthy();
    expect(screen.getByLabelText('Atmosphère kc-blue-wall-effect, mouvements réduits')).toBeTruthy();
    expect(screen.getAllByTestId(/^showcase-room-slot-/)).toHaveLength(10);
    await fireEvent.press(screen.getByTestId('showcase-room-slot-left-free'));
    await fireEvent.press(screen.getByTestId('showcase-room-slot-right-free'));
    expect(onSlotPress.mock.calls).toEqual([['left-free'], ['right-free']]);
  });

  it('auto-assigns nine M8 collectibles plus the rank across ten clickable slots', async () => {
    const presenter = SHOWCASE_PRESENTER_CATALOG.find((candidate) => candidate.id === 'm8-pedestals');
    if (!presenter) throw new Error('Missing M8 presenter');
    const equippedShop = applyPreviewTeamPackAction({
      balance: M8_TEAM_PACK.price,
      contract: DEFAULT_MONETIZATION_CONTRACT,
      equipped: EMPTY_EQUIPPED_COSMETICS,
      items: createTeamPackPreviewItems(M8_TEAM_PACK),
    }, M8_TEAM_PACK);
    const items: ShowcasePlaceableItem[] = M8_TEAM_PACK.items.flatMap((item) => (
      item.roomKind
        ? [{
          accent: item.accent,
          id: `cosmetic:${item.id}`,
          image: item.image,
          kind: item.roomKind,
          name: item.name,
        }]
        : []
    ));
    items.push({ accent: '#B87845', id: 'rank:bronze', kind: 'rank', name: 'Bronze' });
    const assignments = createPresenterRoomAssignments(items, presenter.id);

    expect(Object.values(assignments).filter(Boolean)).toHaveLength(10);
    expect(assignments['left-free']?.id).toBe('cosmetic:m8-profile-frame');
    expect(assignments.jersey?.id).toBe('cosmetic:m8-jersey');
    expect(assignments['right-extra']?.id).toBe('cosmetic:m8-crest-3d');
    expect(assignments.rank?.id).toBe('rank:bronze');

    const onSlotPress = jest.fn();
    const screen = await render(
      <ShowcaseRoomEditorScene
        assignments={assignments}
        atmosphereActive
        cosmetics={equippedShop.equipped}
        favoriteTeam={{
          ...PREVIEW_PROFILE.favoriteTeam!,
          id: 'm8',
          nom: 'Gentle Mates',
          tag: 'M8',
        }}
        lighting="silver"
        onSlotPress={onSlotPress}
        rankAccent="#B87845"
        rankOrder={0}
        reduceMotion
        room={presenter}
        slots={presenter.slots}
      />,
    );

    expect(screen.getByLabelText('Atmosphère m8-sparkle-effect, mouvements réduits')).toBeTruthy();
    expect(screen.getAllByTestId(/^showcase-room-slot-/)).toHaveLength(10);
    await fireEvent.press(screen.getByTestId('showcase-room-slot-left-free'));
    await fireEvent.press(screen.getByTestId('showcase-room-slot-right-free'));
    expect(onSlotPress.mock.calls).toEqual([['left-free'], ['right-free']]);
  });

  it('shares real collection data between both modes and wires its controls', async () => {
    const onSelect = jest.fn();
    const onLightingChange = jest.fn();
    const onPresenterChange = jest.fn();
    const onRankDisplayChange = jest.fn();
    const onThemeChange = jest.fn();
    const data = PREVIEW_PROFILE;
    const screen = await render(
      <View>
        <ShowcaseRoomScene {...ROOM_PROPS} mode="preview" />
        <ShowcaseRoomScene {...ROOM_PROPS} data={data} mode="full" />
        <ShowcaseTopNavigation
          active="showcase"
          loading={false}
          objectCount={4}
          onBack={jest.fn()}
          onRefresh={jest.fn()}
          onSelect={onSelect}
          refreshing={false}
        />
        <ShowcaseControlGroup
          label="ÉCRIN DU RANG"
          onChange={onRankDisplayChange}
          options={[{ color: '#7ED9F4', label: 'NOYAU ORBITAL', value: 'rank_orbital_core' }]}
          selected="rank_orbital_core"
          variant="rank"
        />
        <ShowcaseControlGroup
          label="PRÉSENTOIR"
          onChange={onPresenterChange}
          options={[{ color: '#A76B42', label: 'GALERIE BRONZE', value: 'supports_forge' }]}
          selected="supports_forge"
          variant="presenter"
        />
        <ShowcaseControlGroup
          label="THÈME DE VITRINE"
          onChange={onThemeChange}
          options={[{ color: '#173A55', label: 'AZUR', value: 'azure' }]}
          selected="azure"
        />
        <ShowcaseControlGroup
          label="COULEUR D’ÉCLAIRAGE"
          onChange={onLightingChange}
          options={[{ color: '#E2B25D', label: 'AMBRE', value: 'amber' }]}
          selected="amber"
        />
      </View>,
    );

    expect(screen.getByTestId('showcase-room-preview')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-full')).toBeTruthy();
    expect(screen.getByTestId('showcase-atmosphere-active')).toBeTruthy();
    expect(screen.getAllByLabelText('Maillot de Fnatic')).toHaveLength(2);
    expect(screen.getAllByLabelText('Trophée Premier Signal')).toHaveLength(2);
    expect(screen.getAllByLabelText('Emblème Bronze')).toHaveLength(2);
    expect(screen.getAllByTestId('showcase-rank-display-rank_carbon_cradle')).toHaveLength(2);
    expect(screen.getAllByTestId('showcase-object-frame-cadre-profil-1')).toHaveLength(2);
    expect(screen.getAllByTestId('showcase-object-title-titre-profil-1')).toHaveLength(2);
    expect(screen.getAllByTestId('showcase-object-core-apparence-core-1')).toHaveLength(2);
    expect(screen.getAllByTestId('showcase-object-banner-carte-profil-1')).toHaveLength(2);
    expect(screen.getAllByLabelText(/3 badges visibles/)).toHaveLength(2);
    expect(screen.getAllByTestId('locked-display-top-0', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByTestId('locked-display-middle-3', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByTestId('locked-display-bottom-0', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.queryByTestId('locked-trophy-0', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByText('▣')).toBeNull();
    expect(screen.queryByLabelText('Trophée Badge mystère')).toBeNull();
    expect(screen.queryByLabelText(/emplacement verrouillé/i)).toBeNull();

    await fireEvent.press(screen.getByLabelText('Afficher collection'));
    await fireEvent.press(screen.getByLabelText('Afficher saison'));
    await fireEvent.press(screen.getByLabelText('Afficher rang'));
    await fireEvent.press(screen.getByLabelText('Afficher trophées'));

    await fireEvent.press(screen.getByTestId('showcase-control-supports_forge'));
    await fireEvent.press(screen.getByTestId('showcase-control-rank_orbital_core'));
    await fireEvent.press(screen.getByTestId('showcase-control-azure'));
    await fireEvent.press(screen.getByTestId('showcase-control-amber'));

    expect(onPresenterChange).toHaveBeenCalledWith('supports_forge');
    expect(onRankDisplayChange).toHaveBeenCalledWith('rank_orbital_core');
    expect(onThemeChange).toHaveBeenCalledWith('azure');
    expect(onLightingChange).toHaveBeenCalledWith('amber');
    expect(onSelect.mock.calls.map(([section]) => section)).toEqual([
      'collection',
      'season',
      'rank',
      'trophies',
    ]);
  });

  it('keeps sparse collections physical with or without a favorite team', async () => {
    const sparseData = {
      ...PREVIEW_PROFILE,
      badges: [],
      favoriteTeam: null,
      pinnedBadges: [],
    };
    const screen = await render(
      <ShowcaseRoomScene
        {...ROOM_PROPS}
        cosmetics={{ frame: null, title: null, core: null, factionEffect: null, profileCard: null, showcase: { material: null, lighting: null, supports: null, rankDisplay: null, jersey: null } }}
        data={sparseData}
        mode="full"
      />,
    );

    expect(screen.getByLabelText('Emplacement de maillot vide')).toBeTruthy();
    expect(screen.queryByLabelText('Maillot de Fnatic')).toBeNull();
    expect(screen.queryByLabelText('Trophée Premier Signal')).toBeNull();
    expect(screen.queryByTestId(/showcase-object-/)).toBeNull();
    expect(screen.getByTestId('rank-emblem-artifact')).toBeTruthy();
  });

  it('uses a pack-specific room background when one is equipped', async () => {
    const roomImage = { uri: 'fnatic-room' };
    const screen = await render(
      <ShowcaseRoomScene {...ROOM_PROPS} mode="full" roomImage={roomImage} />,
    );

    expect(screen.getByTestId('showcase-room-custom-background').props.source).toBe(roomImage);
  });

  it('renders equipped Fnatic collectibles with their dedicated pack art', async () => {
    const items = createTeamPackPreviewItems();
    const find = (id: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) throw new Error(`Missing Fnatic fixture ${id}`);
      const { accent, description, level, name, rarity, slot, styleKey } = item;
      return { accent, description, id, level, name, rarity, slot, styleKey } satisfies EquippedCosmetic;
    };
    const cosmetics = {
      ...PREVIEW_PROFILE.cosmetics,
      frame: find('fnatic-profile-frame'),
      title: find('fnatic-title'),
      core: find('fnatic-logo-3d'),
      factionEffect: find('fnatic-embers'),
      profileCard: find('fnatic-share-card'),
      showcase: {
        ...PREVIEW_PROFILE.cosmetics.showcase,
        jersey: find('fnatic-jersey'),
      },
    };
    const screen = await render(
      <ShowcaseRoomScene {...ROOM_PROPS} cosmetics={cosmetics} mode="full" />,
    );

    expect(screen.getByTestId('showcase-jersey-fnatic-jersey').props.source).toBe(
      FNATIC_TEAM_PACK.items.find((item) => item.id === 'fnatic-jersey')?.image,
    );
    expect(screen.getByTestId('showcase-object-image-frame').props.source).toBe(
      FNATIC_TEAM_PACK.items.find((item) => item.id === 'fnatic-profile-frame')?.image,
    );
  });

  it('renders equipped KC collectibles with their dedicated Blue Wall art', async () => {
    const items = createTeamPackPreviewItems(KC_TEAM_PACK);
    const find = (id: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) throw new Error(`Missing KC fixture ${id}`);
      const { accent, description, level, name, rarity, slot, styleKey } = item;
      return { accent, description, id, level, name, rarity, slot, styleKey } satisfies EquippedCosmetic;
    };
    const cosmetics = {
      ...PREVIEW_PROFILE.cosmetics,
      frame: find('kc-profile-frame'),
      title: find('kc-title'),
      core: find('kc-logo-3d'),
      factionEffect: find('kc-blue-wall-effect'),
      profileCard: find('kc-share-card'),
      showcase: {
        ...PREVIEW_PROFILE.cosmetics.showcase,
        jersey: find('kc-jersey'),
      },
    };
    const screen = await render(
      <ShowcaseRoomScene {...ROOM_PROPS} cosmetics={cosmetics} lighting="blue" mode="full" />,
    );

    expect(screen.getByTestId('showcase-jersey-kc-jersey').props.source).toBe(
      KC_TEAM_PACK.items.find((item) => item.id === 'kc-jersey')?.image,
    );
    expect(screen.getByTestId('showcase-object-image-frame').props.source).toBe(
      KC_TEAM_PACK.items.find((item) => item.id === 'kc-profile-frame')?.image,
    );
  });

  it('uses Bronze at season start and the earned grade after progression', async () => {
    const rankedData = {
      ...PREVIEW_PROFILE,
      ranking: {
        ...PREVIEW_PROFILE.ranking,
        frags: 850,
        pic_frags: 850,
        pronostics_regles: 5,
        grade: {
          ...PREVIEW_PROFILE.ranking.grade,
          classe: true,
          progression: 0,
          cle: 'argent' as const,
          libelle: 'Argent',
          ordre: 1,
          minimum: 850,
          plafond: 1050,
        },
      },
    };
    const screen = await render(
      <View>
        <ShowcaseRoomScene {...ROOM_PROPS} mode="preview" />
        <ShowcaseRoomScene {...ROOM_PROPS} data={rankedData} mode="full" />
      </View>,
    );

    expect(screen.getAllByTestId('rank-emblem-artifact')).toHaveLength(2);
    expect(screen.getByLabelText('Emblème Bronze')).toBeTruthy();
    expect(screen.getByLabelText('Emblème Argent')).toBeTruthy();
    expect(screen.queryByTestId('placement-artifact')).toBeNull();
  });

  it('renders the same equipped ring in preview and full modes and opens its detail', async () => {
    const onRingPress = jest.fn();
    const ring = resolveEquippedShowcaseRing(
      adaptShowcaseRingStats(PREVIEW_PROFILE),
      'faction',
    );
    expect(ring).not.toBeNull();

    const screen = await render(
      <View>
        <ShowcaseRoomScene {...ROOM_PROPS} equippedRing={ring} mode="preview" />
        <ShowcaseRoomScene {...ROOM_PROPS} equippedRing={ring} mode="full" onRingPress={onRingPress} />
      </View>,
    );

    expect(screen.getAllByTestId('showcase-ring-artifact-faction')).toHaveLength(2);
    expect(screen.getAllByLabelText(/Anneau Cercle, Éveil, palier 2/)).toHaveLength(2);
    await fireEvent.press(screen.getAllByTestId('showcase-ring-artifact-faction')[1]);
    expect(onRingPress).toHaveBeenCalledTimes(1);
  });

  it('makes every room placement actionable', async () => {
    const onSlotPress = jest.fn();
    const assignments = createDefaultShowcaseRoomAssignments([
      { accent: '#F5792A', id: 'jersey:fnc', kind: 'jersey', name: 'Fnatic' },
      { accent: '#FFB84D', id: 'trophy:first', kind: 'trophy', name: 'Premier Signal' },
    ] satisfies ShowcasePlaceableItem[]);
    const screen = await render(
      <ShowcaseRoomEditorScene
        assignments={assignments}
        lighting="competition"
        onSlotPress={onSlotPress}
        room={SHOWCASE_ROOM_CATALOG[0]}
      />,
    );

    expect(screen.getByTestId('showcase-room-editor')).toBeTruthy();
    expect(screen.getByTestId('showcase-room-background-obsidian-gallery')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(8);
    expect(screen.getByLabelText('Emplacement maillot, Maillot Fnatic')).toBeTruthy();
    expect(screen.getByLabelText('Emplacement droit, vide')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('showcase-room-slot-jersey'));
    await fireEvent.press(screen.getByTestId('showcase-room-slot-right-free'));

    expect(onSlotPress.mock.calls.map(([slot]) => slot)).toEqual(['jersey', 'right-free']);
  });

  it('makes all ten mechanical presenter placements actionable', async () => {
    const presenter = SHOWCASE_PRESENTER_CATALOG[2];
    const onSlotPress = jest.fn();
    const assignments = createDefaultShowcaseRoomAssignments([], presenter.slots);
    const screen = await render(
      <ShowcaseRoomEditorScene
        assignments={assignments}
        lighting="cyan"
        onSlotPress={onSlotPress}
        rankDisplay={SHOWCASE_RANK_DISPLAY_CATALOG[3]}
        room={presenter}
        slots={presenter.slots}
      />,
    );

    expect(screen.getByLabelText('Carbone Mécanique, 10 emplacements personnalisables')).toBeTruthy();
    expect(screen.queryByTestId('showcase-rank-display-rank_orbital_core')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(10);

    await fireEvent.press(screen.getByTestId('showcase-room-slot-left-extra'));
    await fireEvent.press(screen.getByTestId('showcase-room-slot-right-extra'));

    expect(onSlotPress.mock.calls.map(([slot]) => slot)).toEqual(['left-extra', 'right-extra']);
  });
});
