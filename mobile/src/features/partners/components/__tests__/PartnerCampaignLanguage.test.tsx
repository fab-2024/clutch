/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import {
  PREVIEW_CAMPAIGN,
  PREVIEW_REPORT,
} from '../PartnerCampaignPreviewScreen';
import PartnerCampaignReportScreen from '../PartnerCampaignReportScreen';
import PartnerCampaignScreen from '../PartnerCampaignScreen';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return { SafeAreaView: ReactNative.View };
});
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: { est_admin: true }, status: 'ready' }),
}));
jest.mock('@/src/providers/CosmeticsProvider', () => ({
  useCosmetics: () => ({ refresh: jest.fn(async () => undefined) }),
}));
jest.mock('../../api', () => ({
  claimPartnerCampaignRewards: jest.fn(),
  followPartnerCampaignMatch: jest.fn(),
  joinPartnerCampaign: jest.fn(),
  loadPartnerCampaign: jest.fn(),
  loadPartnerCampaignReport: jest.fn(),
  participateInPartnerFactionMission: jest.fn(),
}));

describe('Partner campaign editorial language', () => {
  it('keeps the consumer activation in French while preserving product terms', async () => {
    const screen = await render(<PartnerCampaignScreen previewData={PREVIEW_CAMPAIGN} />);

    expect(screen.getByText('SYNCHRO')).toBeTruthy();
    expect(screen.getByText('PARTENAIRE // INTERNE')).toBeTruthy();
    expect(screen.getByText('JOUEUR_01')).toBeTruthy();
    expect(screen.getByText('← LOCKER')).toBeTruthy();
    expect(screen.getByText('Faire 3 Calls'.toUpperCase())).toBeTruthy();

    expect(screen.queryByText('SYNC')).toBeNull();
    expect(screen.queryByText('PARTNER LAB // INTERNE')).toBeNull();
    expect(screen.queryByText('PLAYER_01')).toBeNull();
  });

  it('uses consistent French labels throughout the internal report', async () => {
    const screen = await render(
      <PartnerCampaignReportScreen
        previewReport={{
          ...PREVIEW_REPORT,
          partnerExport: { ...PREVIEW_REPORT.partnerExport, publishable: false },
        }}
      />,
    );

    expect(screen.getByText('BILAN CAMPAGNE')).toBeTruthy();
    expect(screen.getByText('DÉMO FICTIVE')).toBeTruthy();
    expect(screen.getByText('5 JOUEURS')).toBeTruthy();
    expect(screen.getByText('PILOTE RÉEL')).toBeTruthy();
    expect(screen.getByText('PARCOURS // ACTIVATION')).toBeTruthy();
    expect(screen.getByText('Cohorte pilote masquée.')).toBeTruthy();
    expect(screen.getByText('CONFIDENTIALITÉ // V1')).toBeTruthy();

    expect(screen.queryByText('CAMPAIGN REPORT')).toBeNull();
    expect(screen.queryByText('FICTIONAL DEMO')).toBeNull();
    expect(screen.queryByText('PILOTE LIVE')).toBeNull();
    expect(screen.queryByText('PRIVACY CONTRACT // V1')).toBeNull();
  });
});
