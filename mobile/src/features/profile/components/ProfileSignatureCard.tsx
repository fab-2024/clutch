import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, typography } from '@/src/theme';

import { ProfileRelicThumbnail } from './ProfileShowcaseCard';
import ShowcasePhysicalObject from './showcase/ShowcasePhysicalObject';
import { SHOWCASE_PALETTE } from './showcase/showcasePalette';

type ProfileSignatureCardProps = {
  cosmetics?: EquippedCosmetics | null;
  loading: boolean;
  onOpenLocker: () => void;
  pseudo: string;
  relicLevel: number;
};

export default function ProfileSignatureCard({
  cosmetics,
  loading,
  onOpenLocker,
  pseudo,
  relicLevel,
}: ProfileSignatureCardProps) {
  const equippedCount = signatureEquippedCount(cosmetics);
  const frameName = cosmetics?.frame?.name ?? 'Origine';
  const titleName = cosmetics?.title?.name ?? 'Origine';
  const bannerName = cosmetics?.profileCard?.name ?? 'Origine';
  const relicName = cosmetics?.factionEffect?.name ?? 'Origine';

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>MA SIGNATURE</Text>
      </View>

      <View style={styles.slots}>
        <SignatureSlot accessibilityLabel={`Cadre d’avatar, ${loading ? 'chargement' : frameName}`}>
          <ShowcasePhysicalObject
            compact
            model={{ accent: cosmetics?.frame?.accent ?? '#66737E', id: cosmetics?.frame?.id ?? 'frame-loading', kind: 'frame', name: loading ? 'Chargement' : frameName || pseudo }}
            size={34}
          />
        </SignatureSlot>
        <SignatureSlot accessibilityLabel={`Titre, ${loading ? 'chargement' : titleName}`}>
          <ShowcasePhysicalObject
            compact
            model={{ accent: cosmetics?.title?.accent ?? '#66737E', id: cosmetics?.title?.id ?? 'title-loading', kind: 'title', name: loading ? 'Chargement' : titleName }}
            showName
            size={38}
          />
        </SignatureSlot>
        <SignatureSlot accessibilityLabel={`Bannière de profil, ${loading ? 'chargement' : bannerName}`}>
          <ShowcasePhysicalObject
            compact
            model={{ accent: cosmetics?.profileCard?.accent ?? '#66737E', id: cosmetics?.profileCard?.id ?? 'banner-loading', kind: 'banner', name: loading ? 'Chargement' : bannerName }}
            size={34}
          />
        </SignatureSlot>
        <SignatureSlot accessibilityLabel={`Relique, ${loading ? 'chargement' : relicName}`}>
          <ProfileRelicThumbnail
            accent={cosmetics?.factionEffect?.accent ?? '#C6A34A'}
            compact
            level={relicLevel}
            name={relicName}
            size={40}
          />
        </SignatureSlot>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerCopy}>
          <Text style={styles.meta}>{loading ? '—' : equippedCount} ÉLÉMENT{!loading && equippedCount === 1 ? '' : 'S'} ÉQUIPÉ{!loading && equippedCount === 1 ? '' : 'S'}</Text>
          <Text style={styles.promise}>Visible dans tout GRIFF</Text>
        </View>
        <Pressable
          accessibilityLabel="Modifier ma signature dans le Locker"
          accessibilityRole="button"
          onPress={onOpenLocker}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>MODIFIER DANS LE LOCKER</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function signatureEquippedCount(cosmetics?: EquippedCosmetics | null) {
  if (!cosmetics) return 0;
  return [cosmetics.frame, cosmetics.title, cosmetics.profileCard, cosmetics.factionEffect].filter(Boolean).length;
}

function SignatureSlot({
  accessibilityLabel,
  children,
}: {
  accessibilityLabel: string;
  children: ReactNode;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.slot}>
      <View style={styles.slotVisual}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, padding: 8, borderRadius: 17, backgroundColor: SHOWCASE_PALETTE.graphite, borderWidth: 1, borderColor: '#27323B' },
  heading: { minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.sectionTitle, color: colors.text, fontSize: 16, lineHeight: 18 },
  meta: { ...typography.eyebrow, color: colors.volt, fontSize: 8, letterSpacing: 0.55 },
  promise: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  slots: { marginTop: 5, flexDirection: 'row', gap: 5 },
  slot: { flex: 1, minWidth: 0, height: 54, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#080D11', borderWidth: 1, borderColor: '#1F2931' },
  slotVisual: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  footer: { minHeight: 29, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerCopy: { flex: 1, minWidth: 0 },
  action: { minHeight: 28, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#10160D', borderWidth: 1, borderColor: '#48551E' },
  actionText: { ...typography.action, color: colors.volt, fontSize: 8, letterSpacing: 0.3 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.995 }] },
});
