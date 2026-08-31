import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { colors, fonts, spacing, typography } from '@/src/theme';

import type { LevelFrameCollectionEntry, LevelFrameVariant } from '../types';
import LevelFrame from './LevelFrame';

type LevelFrameGalleryProps = {
  entries: readonly LevelFrameCollectionEntry[];
  level: number;
  mode: 'locker' | 'shop';
  onEquip?: (variant: LevelFrameVariant) => Promise<void>;
};

const SIGNAL_LEVELS = [2, 10, 25, 50, 75, 100] as const;

export default function LevelFrameGallery({
  entries,
  level,
  mode,
  onEquip,
}: LevelFrameGalleryProps) {
  const [pending, setPending] = useState<LevelFrameVariant | null>(null);
  const equipped = entries.find((entry) => entry.equipped) ?? entries[0];
  const paid = entries.filter((entry) => entry.variant !== 'signalAscendant');

  async function equip(variant: LevelFrameVariant) {
    if (!onEquip || pending) return;
    setPending(variant);
    try {
      await onEquip(variant);
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={styles.root}>
      {mode === 'locker' ? (
        <View style={styles.equippedHero}>
          <View style={styles.heroGlow} />
          <LevelFrame level={level} selected size={118} variant={equipped.variant} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>ACTUELLEMENT ÉQUIPÉ</Text>
            <Text style={styles.heroTitle}>{equipped.name.toUpperCase()}</Text>
            <Text style={styles.heroText}>Ton niveau réel reste {level}. Seule la matière du cadre change.</Text>
          </View>
        </View>
      ) : (
        <SignalEvolutionBoard />
      )}

      <View style={styles.heading}>
        <View>
          <Text style={styles.headingEyebrow}>{`${mode === 'shop' ? 'BOUTIQUE' : 'LOCKER'} // CADRES DE NIVEAU`}</Text>
          <Text style={styles.headingTitle}>{mode === 'shop' ? 'UNE AUTRE MATIÈRE.' : 'CHOISIS TON SIGNAL.'}</Text>
        </View>
        <Text style={styles.count}>{String(entries.length).padStart(2, '0')}</Text>
      </View>

      <View style={styles.grid}>
        {(mode === 'shop' ? paid : entries).map((entry) => (
          <LevelFrameCard
            entry={entry}
            key={entry.variant}
            level={mode === 'shop' ? 42 : level}
            mode={mode}
            onEquip={() => void equip(entry.variant)}
            pending={pending === entry.variant}
          />
        ))}
      </View>
    </View>
  );
}

function SignalEvolutionBoard() {
  return (
    <View style={styles.signalBoard}>
      <View style={styles.signalTopline}>
        <View style={styles.signalHeading}>
          <Text style={styles.signalEyebrow}>INCLUS // ÉVOLUTIF</Text>
          <Text style={styles.signalTitle}>SIGNAL ASCENDANT</Text>
        </View>
        <View style={styles.includedPill}><Text style={styles.includedPillText}>TOUJOURS POSSÉDÉ</Text></View>
      </View>
      <Text style={styles.signalText}>Un seul cadre gratuit. Six états visuels débloqués automatiquement par le niveau, sans achat ni équipement supplémentaire.</Text>
      <View style={styles.evolutionTrack}>
        {SIGNAL_LEVELS.map((signalLevel, index) => (
          <View key={signalLevel} style={styles.evolutionStep}>
            <LevelFrame level={signalLevel} size={72} variant="signalAscendant" />
            <Text style={styles.evolutionLevel}>NIV. {signalLevel}{signalLevel === 100 ? '+' : ''}</Text>
            <Text style={styles.evolutionStage}>ÉTAT {index + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LevelFrameCard({
  entry,
  level,
  mode,
  onEquip,
  pending,
}: {
  entry: LevelFrameCollectionEntry;
  level: number;
  mode: 'locker' | 'shop';
  onEquip: () => void;
  pending: boolean;
}) {
  const disabled = mode === 'locker' && !entry.owned;
  const action = entry.equipped ? 'ÉQUIPÉ' : entry.owned ? 'ÉQUIPER' : 'VERROUILLÉ';
  return (
    <View
      style={[styles.card, entry.equipped && { borderColor: `${entry.accent}88` }]}
      testID={`level-frame-card-${entry.variant}`}
    >
      <View style={styles.artwork}>
        <View style={[styles.cardGlow, { backgroundColor: entry.accent }]} />
        <LevelFrame disabled={disabled} level={level} selected={entry.equipped} size={110} variant={entry.variant} />
        {entry.equipped ? <View style={styles.equippedPill}><Text style={styles.equippedPillText}>ÉQUIPÉ</Text></View> : null}
      </View>
      <View style={styles.cardTopline}>
        <Text style={[styles.rarity, { color: rarityColor(entry) }]}>{rarityLabel(entry)}</Text>
        <Text style={styles.state}>{entry.owned ? 'POSSÉDÉ' : sourceLabel(entry)}</Text>
      </View>
      <Text numberOfLines={2} style={styles.name}>{entry.name}</Text>
      <Text numberOfLines={3} style={styles.description}>{entry.description}</Text>
      <View style={styles.priceRow}>
        {entry.source === 'volts' && entry.price ? <CurrencyIcon kind="volts" size={14} /> : <Text style={[styles.sourceDot, { color: entry.accent }]}>●</Text>}
        <Text style={styles.price}>{priceLabel(entry)}</Text>
      </View>
      {mode === 'locker' ? (
        <Pressable
          accessibilityLabel={`${action}, ${entry.name}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || pending || entry.equipped, selected: entry.equipped }}
          disabled={disabled || pending || entry.equipped}
          onPress={onEquip}
          style={({ pressed }) => [styles.action, entry.equipped && styles.actionEquipped, disabled && styles.actionDisabled, pressed && styles.pressed]}
        >
          <Text style={[styles.actionText, (disabled || entry.equipped) && styles.actionTextMuted]}>{pending ? 'ENREGISTREMENT…' : action}</Text>
        </Pressable>
      ) : (
        <View style={[styles.shopState, entry.owned && styles.shopStateOwned]}>
          <Text style={[styles.shopStateText, entry.owned && styles.shopStateTextOwned]}>{entry.owned ? 'DÉJÀ DANS TON LOCKER' : sourceLabel(entry)}</Text>
        </View>
      )}
    </View>
  );
}

function rarityLabel(entry: LevelFrameCollectionEntry) {
  if (entry.rarity === 'legendary') return 'LÉGENDAIRE';
  if (entry.rarity === 'epic') return 'ÉPIQUE';
  if (entry.rarity === 'rare') return 'RARE';
  return 'INCLUS · ÉVOLUTIF';
}

function rarityColor(entry: LevelFrameCollectionEntry) {
  return entry.rarity === 'included' ? colors.volt : entry.accent;
}

function sourceLabel(entry: LevelFrameCollectionEntry) {
  if (entry.source === 'founder_pack') return 'FOUNDER PACK';
  if (entry.source === 'included') return 'INCLUS';
  return 'VOLTS';
}

function priceLabel(entry: LevelFrameCollectionEntry) {
  if (entry.source === 'included') return 'INCLUS · ÉVOLUTIF';
  if (entry.source === 'founder_pack') return 'FOUNDER PACK';
  return entry.price ? `${formatNumber(entry.price)} VOLTS` : 'INDISPONIBLE';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

const styles = StyleSheet.create({
  root: { gap: 15 },
  equippedHero: { position: 'relative', overflow: 'hidden', minHeight: 154, marginHorizontal: spacing.md, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 24, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  heroGlow: { position: 'absolute', left: -42, top: -58, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(49,215,226,.08)', boxShadow: '0 0 42px rgba(49,215,226,.10)' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .65 },
  heroTitle: { marginTop: 4, color: colors.text, fontFamily: fonts.display, fontSize: 25, lineHeight: 26 },
  heroText: { ...typography.caption, marginTop: 6, color: colors.textMuted },
  signalBoard: { marginHorizontal: spacing.md, padding: 15, gap: 11, overflow: 'hidden', borderRadius: 24, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#2B4650' },
  signalTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  signalHeading: { flex: 1, minWidth: 0 },
  signalEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  signalTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 23, lineHeight: 24 },
  includedPill: { flexShrink: 0, minHeight: 32, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#18200E', borderWidth: 1, borderColor: '#566424' },
  includedPillText: { ...typography.label, color: colors.volt, letterSpacing: .15 },
  signalText: { ...typography.caption, maxWidth: 430, color: '#919DA6' },
  evolutionTrack: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  evolutionStep: { flexBasis: '30%', flexGrow: 1, minHeight: 124, paddingVertical: 7, alignItems: 'center', borderRadius: 15, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  evolutionLevel: { ...typography.label, marginTop: 1, color: '#E4E9EB' },
  evolutionStage: { ...typography.eyebrow, marginTop: 2, color: colors.textMuted },
  heading: { minHeight: 56, marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  headingEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  headingTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 23, lineHeight: 24 },
  count: { color: '#3E4A52', fontFamily: fonts.display, fontSize: 28, lineHeight: 29 },
  grid: { marginHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { position: 'relative', width: '48%', minHeight: 378, padding: 10, borderRadius: 21, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  artwork: { position: 'relative', height: 137, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 16, backgroundColor: '#0B1218' },
  cardGlow: { position: 'absolute', width: 92, height: 92, borderRadius: 46, opacity: .1, boxShadow: '0 0 30px rgba(49,215,226,.13)' },
  equippedPill: { position: 'absolute', top: 7, right: 7, minHeight: 28, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.volt },
  equippedPillText: { ...typography.label, color: '#080A0C' },
  cardTopline: { marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  rarity: { ...typography.eyebrow, flex: 1, letterSpacing: .4 },
  state: { ...typography.label, color: colors.textMuted },
  name: { ...typography.bodyStrong, minHeight: 38, marginTop: 5, color: colors.text },
  description: { ...typography.caption, minHeight: 48, marginTop: 2, color: colors.textMuted },
  priceRow: { minHeight: 25, marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  sourceDot: { fontSize: 8 },
  price: { ...typography.label, color: '#D9DFE2' },
  action: { minHeight: 44, marginTop: 'auto', alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.volt },
  actionEquipped: { backgroundColor: '#16200E', borderWidth: 1, borderColor: '#53621F' },
  actionDisabled: { backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  actionText: { ...typography.action, color: '#080A0C' },
  actionTextMuted: { color: '#72808A' },
  shopState: { minHeight: 44, marginTop: 'auto', alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  shopStateOwned: { backgroundColor: '#151D0E', borderColor: '#4D5A20' },
  shopStateText: { ...typography.label, color: colors.textMuted, textAlign: 'center' },
  shopStateTextOwned: { color: colors.volt },
  pressed: { opacity: .74, transform: [{ scale: .99 }] },
});
