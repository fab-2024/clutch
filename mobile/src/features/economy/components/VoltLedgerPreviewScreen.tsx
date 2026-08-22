import type { VoltLedger } from '../types';
import VoltLedgerScreen from './VoltLedgerScreen';

const PREVIEW_LEDGER: VoltLedger = {
  balance: 870,
  hasMore: false,
  integrity: {
    convertsToFrags: false,
    affectsRanking: false,
  },
  movements: [
    {
      id: 'preview-purchase',
      amount: -350,
      source: 'achat_cosmetique',
      origin: 'achat',
      reference: 'cadre-profil-2',
      object: { id: 'cadre-profil-2', name: 'Cadre Volt', slot: 'cadre_profil' },
      campaignKey: null,
      createdAt: '2026-08-22T09:42:00+02:00',
      idempotencyKey: 'achat:cadre-profil-2',
      balanceAfter: 870,
    },
    {
      id: 'preview-activation',
      amount: 160,
      source: 'activation',
      origin: 'activation',
      reference: 'masters-paris-2026',
      object: null,
      campaignKey: 'masters-paris-2026',
      createdAt: '2026-08-21T20:15:00+02:00',
      idempotencyKey: 'activation:masters-paris-2026',
      balanceAfter: 1220,
    },
    {
      id: 'preview-exceptional',
      amount: 500,
      source: 'exceptionnelle',
      origin: 'exceptionnelle',
      reference: 'founder-thanks-v1',
      object: null,
      campaignKey: null,
      createdAt: '2026-08-19T18:30:00+02:00',
      idempotencyKey: 'exceptionnelle:founder-thanks-v1',
      balanceAfter: 1060,
    },
    {
      id: 'preview-progression',
      amount: 120,
      source: 'progression',
      origin: 'badge',
      reference: 'serie-5',
      object: null,
      campaignKey: null,
      createdAt: '2026-08-17T22:08:00+02:00',
      idempotencyKey: 'badge:serie-5',
      balanceAfter: 560,
    },
    {
      id: 'preview-mission',
      amount: 140,
      source: 'mission',
      origin: 'mission',
      reference: 'duo-week-34',
      object: null,
      campaignKey: null,
      createdAt: '2026-08-16T16:24:00+02:00',
      idempotencyKey: 'mission:duo-week-34',
      balanceAfter: 440,
    },
    {
      id: 'preview-onboarding',
      amount: 300,
      source: 'onboarding',
      origin: 'onboarding',
      reference: 'completion-v1',
      object: null,
      campaignKey: null,
      createdAt: '2026-08-15T11:10:00+02:00',
      idempotencyKey: 'onboarding:completion-v1',
      balanceAfter: 300,
    },
  ],
};

export default function VoltLedgerPreviewScreen() {
  return <VoltLedgerScreen previewData={PREVIEW_LEDGER} />;
}
