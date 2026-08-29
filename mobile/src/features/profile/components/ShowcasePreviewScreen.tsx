import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { PREVIEW_SHOP } from '@/src/features/shop/components/ShopPreviewScreen';
import { EMPTY_EQUIPPED_COSMETICS, type CosmeticShopData } from '@/src/features/shop/types';
import { colors, typography } from '@/src/theme';

import { PREVIEW_PROFILE } from './ProfilePreviewScreen';
import ShowcaseScreen from './ShowcaseScreen';
import type {
  ShowcaseAtmospherePerformanceReport,
  ShowcaseAtmosphereQuality,
} from './showcase/showcaseAtmosphere';

const SHOWCASE_OWNED_STYLE_KEYS = new Set([
  'frame-raw',
  'title-rookie',
  'core-origin',
  'faction-aura',
  'card-black',
]);

const SHOWCASE_SHOP: CosmeticShopData = {
  ...PREVIEW_SHOP,
  items: PREVIEW_SHOP.items.map((item) => {
    if (item.styleKey === 'frame-volt') {
      return {
        ...item,
        owned: SHOWCASE_OWNED_STYLE_KEYS.has(item.styleKey),
        team: { id: 'kc', name: 'Karmine Corp', tag: 'KC', logo: null },
      };
    }
    if (item.styleKey === 'title-reader') {
      return { ...item, owned: SHOWCASE_OWNED_STYLE_KEYS.has(item.styleKey), seasonId: 'saison_zero' };
    }
    if (item.styleKey === 'card-signal') {
      return {
        ...item,
        acquirable: false,
        brandKey: 'nova_gaming',
        campaignKey: 'nova_week',
        owned: SHOWCASE_OWNED_STYLE_KEYS.has(item.styleKey),
        source: 'partenaire' as const,
      };
    }
    return { ...item, owned: SHOWCASE_OWNED_STYLE_KEYS.has(item.styleKey) };
  }),
};

export default function ShowcasePreviewScreen() {
  const params = useLocalSearchParams<{
    diagnostics?: string | string[];
    mood?: string | string[];
    quality?: string | string[];
    reduced?: string | string[];
  }>();
  const [performanceReport, setPerformanceReport] = useState<ShowcaseAtmospherePerformanceReport | null>(null);
  if (!__DEV__) return <Redirect href="/" />;
  const mood = previewMood(readParam(params.mood));
  const quality = previewQuality(readParam(params.quality));
  const reduceMotion = readParam(params.reduced) === '1';
  const diagnostics = readParam(params.diagnostics) === '1';
  const preview = showcasePreviewForMood(mood);

  return (
    <View style={styles.root}>
      <ShowcaseScreen
        atmosphereQualityOverride={quality}
        onAtmospherePerformanceReport={setPerformanceReport}
        previewProfile={preview.profile}
        previewShop={preview.shop}
        reduceMotionOverride={reduceMotion}
      />
      {diagnostics ? (
        <View accessibilityRole="summary" style={styles.diagnostics}>
          <View style={[
            styles.diagnosticsDot,
            { backgroundColor: performanceReport?.passed === false ? colors.live : colors.volt },
          ]} />
          <Text style={styles.diagnosticsText}>
            {performanceLabel({ performanceReport, quality, reduceMotion })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type ShowcasePreviewMood = 'minimal' | 'mythic' | 'standard';

function showcasePreviewForMood(mood: ShowcasePreviewMood) {
  if (mood === 'mythic') {
    const core = {
      accent: '#E8FF3D',
      description: 'Le cœur terminal de la Saison Zéro.',
      id: 'preview-core-mythic',
      level: 6,
      name: 'Cœur Mythique',
      rarity: 'legendaire' as const,
      slot: 'apparence_core' as const,
      styleKey: 'core-mythic',
    };
    const factionEffect = {
      accent: '#8AA8FF',
      description: 'Une trace de faction classée.',
      id: 'preview-faction-mythic',
      level: 5,
      name: 'Signal de Guerre',
      rarity: 'epique' as const,
      slot: 'effet_faction' as const,
      styleKey: 'faction-mythic',
    };
    const lighting = {
      accent: '#E8FF3D',
      description: 'Un éclairage acide terminal.',
      id: 'lighting_acid',
      level: 5,
      name: 'Acide Mythique',
      rarity: 'legendaire' as const,
      slot: 'vitrine_eclairage' as const,
      styleKey: 'lighting-acid',
    };
    return {
      profile: {
        ...PREVIEW_PROFILE,
        favoriteTeam: {
          ...PREVIEW_PROFILE.favoriteTeam!,
          id: 'kc',
          nom: 'Karmine Corp',
          tag: 'KC',
        },
        ranking: {
          ...PREVIEW_PROFILE.ranking,
          frags: 1_760,
          grade: {
            ...PREVIEW_PROFILE.ranking.grade,
            cle: 'mythique' as const,
            libelle: 'Mythique',
            minimum: 1_650,
            ordre: 5,
            plafond: undefined,
            progression: 1,
          },
        },
      },
      shop: {
        ...SHOWCASE_SHOP,
        equipped: {
          ...SHOWCASE_SHOP.equipped,
          core,
          factionEffect,
          showcase: {
            ...SHOWCASE_SHOP.equipped.showcase,
            lighting,
          },
        },
      },
    };
  }

  if (mood === 'minimal') {
    return {
      profile: {
        ...PREVIEW_PROFILE,
        badges: [],
        cosmetics: EMPTY_EQUIPPED_COSMETICS,
        favoriteTeam: null,
        pinnedBadges: [],
      },
      shop: {
        ...SHOWCASE_SHOP,
        equipped: EMPTY_EQUIPPED_COSMETICS,
        items: SHOWCASE_SHOP.items.map((item) => ({ ...item, equipped: false, owned: false })),
      },
    };
  }

  return { profile: PREVIEW_PROFILE, shop: SHOWCASE_SHOP };
}

function previewMood(value?: string): ShowcasePreviewMood {
  if (value === 'minimal' || value === 'mythic') return value;
  return 'standard';
}

function previewQuality(value?: string): ShowcaseAtmosphereQuality {
  if (value === 'animated' || value === 'static') return value;
  return 'auto';
}

function performanceLabel({
  performanceReport,
  quality,
  reduceMotion,
}: {
  performanceReport: ShowcaseAtmospherePerformanceReport | null;
  quality: ShowcaseAtmosphereQuality;
  reduceMotion: boolean;
}) {
  if (reduceMotion) return 'MOUVEMENTS RÉDUITS · STATIQUE';
  if (quality === 'static') return 'FALLBACK FORCÉ · STATIQUE';
  if (Platform.OS === 'web') return 'FALLBACK WEB · STATIQUE';
  if (!performanceReport) return 'MESURE GPU · 2,2 S';
  return performanceReport.passed
    ? `${performanceReport.fps} FPS · SCÈNE NATIVE`
    : `${performanceReport.fps} FPS · FALLBACK AUTOMATIQUE`;
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  diagnostics: {
    position: 'absolute',
    right: 10,
    bottom: 68,
    minHeight: 28,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(3,6,8,.9)',
    borderWidth: 1,
    borderColor: '#344049',
  },
  diagnosticsDot: { width: 6, height: 6, borderRadius: 3 },
  diagnosticsText: { ...typography.metadata, color: colors.textSecondary, letterSpacing: 0.3 },
});
