/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';

import {
  adaptShowcaseRingStats,
  resolveEquippedShowcaseRing,
} from '../../showcaseRings/progression';
import { PREVIEW_PROFILE } from '../ProfilePreviewScreen';
import { ShowcaseControlGroup } from '../showcase/ShowcaseCustomizationBar';
import ShowcaseRoomScene from '../showcase/ShowcaseRoomScene';
import ShowcaseTopNavigation from '../showcase/ShowcaseTopNavigation';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => 'TeamLogo');
jest.mock('../ProfileScreen', () => 'ProfileScreen');

const ROOM_PROPS = {
  cosmetics: PREVIEW_PROFILE.cosmetics,
  data: PREVIEW_PROFILE,
  loading: false,
  rankAccent: '#E8FF3D',
  rankLabel: 'BRONZE',
} as const;

describe('Showcase room composition', () => {
  it('shares real collection data between both modes and wires its controls', async () => {
    const onSelect = jest.fn();
    const onLightingChange = jest.fn();
    const onPedestalChange = jest.fn();
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
          label="SKIN DU SOCLE"
          onChange={onPedestalChange}
          options={[{ color: '#A76B42', label: 'BRONZE', value: 'bronze' }]}
          selected="bronze"
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
    expect(screen.getAllByLabelText('Emblème de départ, zéro Frag')).toHaveLength(2);
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

    await fireEvent.press(screen.getByTestId('showcase-control-bronze'));
    await fireEvent.press(screen.getByTestId('showcase-control-azure'));
    await fireEvent.press(screen.getByTestId('showcase-control-amber'));

    expect(onPedestalChange).toHaveBeenCalledWith('bronze');
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
        cosmetics={{ frame: null, title: null, core: null, factionEffect: null, profileCard: null, showcase: { material: null, lighting: null, supports: null, jersey: null } }}
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

  it('uses the zero badge at season start and the grade emblem after progression', async () => {
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
    expect(screen.getByLabelText('Emblème de départ, zéro Frag')).toBeTruthy();
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
    expect(screen.getAllByLabelText(/Anneau Faction, Recrue, palier 1/)).toHaveLength(2);
    await fireEvent.press(screen.getAllByTestId('showcase-ring-artifact-faction')[1]);
    expect(onRingPress).toHaveBeenCalledTimes(1);
  });
});
