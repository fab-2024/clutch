import { LinearGradient } from 'expo-linear-gradient';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, layout, typography } from '@/src/theme';

import { showcaseRingMetricLabel } from '../progression';
import type { ShowcaseRingFamily, ShowcaseRingProgress } from '../types';

type ShowcaseRingDetailSheetProps = {
  onClose: () => void;
  onEquip: (family: ShowcaseRingFamily | null) => void | Promise<void>;
  progress: ShowcaseRingProgress | null;
  visible: boolean;
};

export default function ShowcaseRingDetailSheet({
  onClose,
  onEquip,
  progress,
  visible,
}: ShowcaseRingDetailSheetProps) {
  if (!progress) return null;
  const { definition, display } = progress;
  const equipped = progress.availability === 'equipped';
  const locked = progress.availability === 'locked';

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Fermer la fiche de l’anneau" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          style={[styles.sheet, { borderColor: `${definition.accent}72` }]}
        >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text style={[styles.eyebrow, { color: definition.accent }]}>ANNEAU ÉVOLUTIF // PALIER {display.stage}</Text>
              <Text style={styles.title}>{definition.name.toUpperCase()}</Text>
              <Text style={styles.stage}>{display.name.toUpperCase()}</Text>
            </View>
            <Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
          </View>

          <View style={styles.visual}>
            <LinearGradient colors={[`${definition.accent}18`, 'rgba(5,8,11,.02)', 'rgba(5,8,11,.92)']} style={StyleSheet.absoluteFill} />
            <View style={[styles.visualGlow, { backgroundColor: `${definition.accent}24`, boxShadow: `0 0 36px ${definition.accent}32` }]} />
            <Image
              resizeMode="contain"
              source={display.assets.full}
              style={[styles.image, locked && styles.imageLocked]}
              tintColor={locked ? '#78838C' : undefined}
            />
            {locked ? <View style={styles.lock}><Text style={styles.lockGlyph}>◇</Text><Text style={styles.lockText}>À DÉBLOQUER</Text></View> : null}
          </View>

          <Text style={styles.description}>{definition.description}</Text>
          <View style={styles.stageRow}>
            {definition.stages.map((stage) => {
              const unlocked = stage.stage <= progress.unlockedStages;
              return <View key={stage.stage} style={[styles.stageDot, unlocked && { backgroundColor: definition.accent, borderColor: definition.accent }]} />;
            })}
          </View>

          <View style={styles.metrics}>
            <View><Text style={styles.metricLabel}>PROGRESSION</Text><Text style={styles.metricValue}>{showcaseRingMetricLabel(progress.family, progress.value)}</Text></View>
            <Text style={[styles.metricStage, { color: definition.accent }]}>{progress.unlockedStages}/5</Text>
          </View>
          <View style={styles.track}><View style={[styles.trackFill, { backgroundColor: definition.accent, width: `${Math.max(locked ? 0 : 4, Math.round(progress.progress * 100))}%` }]} /></View>

          <View style={styles.condition}>
            <Text style={styles.conditionLabel}>{progress.next ? 'PROCHAIN PALIER' : 'ÉVOLUTION COMPLÈTE'}</Text>
            <Text style={styles.conditionValue}>{progress.next?.condition.label ?? 'Toutes les couronnes sont révélées.'}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: locked, selected: equipped }}
            disabled={locked}
            onPress={() => {
              void Promise.resolve(onEquip(equipped ? null : progress.family)).catch(() => undefined);
            }}
            style={({ pressed }) => [
              styles.action,
              equipped && styles.actionEquipped,
              locked && styles.actionLocked,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.actionText, equipped && { color: definition.accent }, locked && styles.actionTextLocked]}>
              {locked ? display.condition.label.toUpperCase() : equipped ? 'RETIRER DE LA VITRINE' : 'ÉQUIPER DANS LA VITRINE'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,5,8,.80)' },
  sheet: { width: '100%', maxWidth: layout.contentMaxWidth, maxHeight: '94%', alignSelf: 'center', overflow: 'hidden', borderTopLeftRadius: 31, borderTopRightRadius: 31, backgroundColor: '#0B1218', borderWidth: 1 },
  sheetContent: { padding: 18, paddingBottom: 28, gap: 13 },
  handle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#44515B' },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.eyebrow, letterSpacing: .7 },
  title: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 30 },
  stage: { ...typography.bodyStrong, marginTop: 3, color: colors.textMuted },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  closeText: { color: colors.text, fontSize: 24, lineHeight: 25 },
  visual: { position: 'relative', height: 260, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  visualGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  image: { width: 250, height: 250 },
  imageLocked: { opacity: .17 },
  lock: { position: 'absolute', alignItems: 'center', gap: 6 },
  lockGlyph: { color: colors.textMuted, fontFamily: fonts.display, fontSize: 30 },
  lockText: { ...typography.action, color: colors.textMuted },
  description: { ...typography.body, color: colors.textMuted },
  stageRow: { flexDirection: 'row', gap: 7 },
  stageDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#172029', borderWidth: 1, borderColor: '#30414E' },
  metrics: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  metricLabel: { ...typography.label, color: '#71808C' },
  metricValue: { ...typography.bodyStrong, marginTop: 2, color: colors.text },
  metricStage: { fontFamily: fonts.display, fontSize: 24 },
  track: { height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: '#152633' },
  trackFill: { height: '100%', borderRadius: 4 },
  condition: { padding: 12, borderRadius: 16, backgroundColor: '#0B1218', borderWidth: 1, borderColor: '#30414E' },
  conditionLabel: { ...typography.eyebrow, color: '#71808C' },
  conditionValue: { ...typography.bodyStrong, marginTop: 4, color: colors.text },
  action: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.volt },
  actionEquipped: { backgroundColor: '#111820', borderWidth: 1, borderColor: '#30414E' },
  actionLocked: { backgroundColor: '#111A22', borderWidth: 1, borderColor: '#30414E' },
  actionText: { ...typography.action, color: '#080A0C', textAlign: 'center' },
  actionTextLocked: { maxWidth: '88%', color: colors.textMuted },
  pressed: { opacity: .74 },
});
