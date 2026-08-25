/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { EMPTY_EQUIPPED_COSMETICS, type EquippedCosmetics } from '@/src/features/shop/types';

import type { ProfileData } from '../../types';
import OwnProfileOverview from '../OwnProfileOverview';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

const PROFILE: ProfileData = {
  pseudo: 'TesteurGRIFF',
  createdAt: '2026-08-24T12:00:00.000Z',
  profileTitle: 'Stratège du virage',
  founder: false,
  publicProfile: true,
  ranking: {
    saison_id: 'season-test',
    saison_nom: 'Saison Test',
    frags: 1510,
    rang: 42,
    pronostics_regles: 12,
    pronostics_gagnes: 8,
    pic_frags: 1530,
    placements_restants: 0,
    provisoire: false,
    grade: {
      classe: true,
      objectif_placements: 5,
      placements_restants: 0,
      progression: 0.55,
      cle: 'platine',
      libelle: 'Platine',
      ordre: 3,
      minimum: 1250,
      plafond: 1450,
      prochaine_cle: 'diamant',
      prochain_libelle: 'Diamant',
      prochain_minimum: 1450,
      prochain_objectif_pronostics: 20,
      prochains_pronostics_restants: 8,
    },
    percentile: 72,
    joueurs_classes: 900,
    meilleur_grade: null,
    meilleur_rang: 42,
  },
  recap: {},
  currentStreak: 2,
  favoriteTeam: null,
  bestGame: null,
  recent: [],
  badges: [],
  pinnedBadges: [],
  arsenalBadges: [],
  level: {
    xp: 432,
    level: 7,
    title: 'Progression Test',
    prestige: 'explorateur',
    prestigeLabel: 'Explorateur',
    progress: 0.43,
    remaining: 568,
  },
  cosmetics: EMPTY_EQUIPPED_COSMETICS,
};

async function renderHub({
  cosmetics = EMPTY_EQUIPPED_COSMETICS,
  data = PROFILE,
  loading = false,
  onOpenShowcase = jest.fn(),
  onOpenVisitor = jest.fn(),
}: {
  cosmetics?: EquippedCosmetics;
  data?: ProfileData | null;
  loading?: boolean;
  onOpenShowcase?: jest.Mock;
  onOpenVisitor?: jest.Mock;
} = {}) {
  return await render(
    <OwnProfileOverview
      cosmetics={cosmetics}
      data={data}
      loading={loading}
      onModify={jest.fn()}
      onOpenActivations={jest.fn()}
      onOpenLocker={jest.fn()}
      onOpenShop={jest.fn()}
      onOpenShowcase={onOpenShowcase}
      onOpenVisitor={onOpenVisitor}
      pseudo={data?.pseudo ?? 'TesteurGRIFF'}
      rankAccent="#31D7E2"
      rankLabel={loading ? '—' : 'PLATINE'}
    />,
  );
}

describe('OwnProfileOverview', () => {
  it('does not expose an email address in Moi', async () => {
    const screen = await renderHub();

    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.getByText('TesteurGRIFF')).toBeTruthy();
  });

  it('renders level and rank from profile data', async () => {
    const screen = await renderHub();

    expect(screen.getByText('NIVEAU 7 · 432 XP')).toBeTruthy();
    expect(screen.getAllByText('PLATINE').length).toBeGreaterThan(0);
  });

  it('uses the Vitrine callback for the landscape CTA', async () => {
    const onOpenShowcase = jest.fn();
    const screen = await renderHub({ onOpenShowcase });

    fireEvent.press(screen.getByLabelText('Ouvrir ma Vitrine en paysage'));

    expect(onOpenShowcase).toHaveBeenCalledTimes(1);
  });

  it('disables the visitor CTA for a private profile', async () => {
    const onOpenVisitor = jest.fn();
    const screen = await renderHub({
      data: { ...PROFILE, publicProfile: false },
      onOpenVisitor,
    });
    const button = screen.getByLabelText('Voir comme visiteur, indisponible pour un profil privé');

    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(button);
    expect(onOpenVisitor).not.toHaveBeenCalled();
  });

  it('renders four neutral Origine slots when no signature item is equipped', async () => {
    const screen = await renderHub();

    expect(screen.getByLabelText('Cadre d’avatar, Origine')).toBeTruthy();
    expect(screen.getByLabelText('Titre, Origine')).toBeTruthy();
    expect(screen.getByLabelText('Bannière de profil, Origine')).toBeTruthy();
    expect(screen.getByLabelText('Relique, Origine')).toBeTruthy();
    expect(screen.queryByText('CADRE')).toBeNull();
    expect(screen.queryByText('TITRE')).toBeNull();
    expect(screen.queryByText('BANNIÈRE')).toBeNull();
    expect(screen.queryByText('RELIQUE')).toBeNull();
  });

  it('does not display demonstration values while loading', async () => {
    const screen = await renderHub({ data: null, loading: true });

    expect(screen.queryByText(/NIVEAU 42/)).toBeNull();
    expect(screen.queryByText('DIAMANT')).toBeNull();
    expect(screen.queryByText('5 BADGES')).toBeNull();
    expect(screen.queryByText('4 TROPHÉES')).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
