import { Redirect } from 'expo-router';

import { previewRoutesEnabled } from '@/src/components/dev/PreviewRoute';

import ProfileSettingsScreen, { type ProfileSettingsPreviewState } from './ProfileSettingsScreen';

const PREVIEW_SETTINGS: ProfileSettingsPreviewState = {
  profile: {
    id: 'preview-settings-user',
    avatar_id: 'chaos-smile',
    pseudo: 'FabTheTap',
    email: 'preview@clutch.gg',
    est_admin: false,
    equipe_favorite_id: 'fnc-lol',
    jeux_suivis: ['lol', 'valorant'],
    profil_public: true,
  },
  organizations: [
    {
      key: 'fnatic',
      name: 'Fnatic',
      tag: 'FNC',
      games: ['lol', 'valorant'],
      teams: [
        { id: 'fnc-lol', jeu: 'lol', nom: 'Fnatic', tag: 'FNC' },
        { id: 'fnc-val', jeu: 'valorant', nom: 'Fnatic', tag: 'FNC' },
      ],
    },
    {
      key: 'g2',
      name: 'G2 Esports',
      tag: 'G2',
      games: ['lol', 'valorant'],
      teams: [
        { id: 'g2-lol', jeu: 'lol', nom: 'G2 Esports', tag: 'G2' },
        { id: 'g2-val', jeu: 'valorant', nom: 'G2 Esports', tag: 'G2' },
      ],
    },
    {
      key: 'karmine-corp',
      name: 'Karmine Corp',
      tag: 'KC',
      games: ['lol', 'valorant'],
      teams: [
        { id: 'kc-lol', jeu: 'lol', nom: 'Karmine Corp', tag: 'KC' },
        { id: 'kc-val', jeu: 'valorant', nom: 'Karmine Corp', tag: 'KC' },
      ],
    },
  ],
  notifications: {
    timezone: 'Europe/Paris',
    lockImminent: true,
    matchStart: true,
    verdict: true,
    promotion: true,
    mutation: false,
    duelReceived: true,
    streakRisk: true,
    streakProtected: true,
    quietHoursEnabled: false,
    quietHoursStart: 1320,
    quietHoursEnd: 480,
    retentionAvailable: true,
    activeDevices: 2,
  },
  saveDelayMs: 700,
};

export default function ProfileSettingsPreviewScreen() {
  if (!previewRoutesEnabled) return <Redirect href="/" />;
  return <ProfileSettingsScreen previewState={PREVIEW_SETTINGS} />;
}
