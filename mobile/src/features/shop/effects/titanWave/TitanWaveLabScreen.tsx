import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PreviewRoute } from '@/src/components/dev/PreviewRoute';
import { colors, typography } from '@/src/theme';
import TitanWavePreview from './TitanWavePreview';

export default function TitanWaveLabScreen() {
  const [time, setTime] = useState<number | undefined>();
  const [reduced, setReduced] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [open, setOpen] = useState(true);
  return <PreviewRoute><ScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>Onde Titanide</Text>
    <Text style={styles.description}>Aperçu de développement · Pack Sang des Titans</Text>
    {open ? <View style={styles.stage}><TitanWavePreview key={generation} previewTimeMs={time} reduceMotionOverride={reduced} /></View> : null}
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => { setTime(undefined); setOpen(true); setGeneration((value) => value + 1); }}><Text style={styles.label}>Jouer</Text></Pressable>
      {[[0, 'Repos'], [200, 'Charge'], [500, 'Impact'], [850, 'Retombée'], [1600, 'Fin']].map(([ms, label]) => <Pressable key={ms} accessibilityRole="button" style={styles.button} onPress={() => setTime(Number(ms))}><Text style={styles.label}>{label}</Text></Pressable>)}
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduced }} accessibilityLabel="Réduire les animations" style={styles.button} onPress={() => setReduced((value) => !value)}><Text style={styles.label}>Mouvements réduits : {reduced ? 'oui' : 'non'}</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => setOpen((value) => !value)}><Text style={styles.label}>{open ? 'Fermer' : 'Rouvrir'}</Text></Pressable>
    </View>
  </ScrollView></PreviewRoute>;
}
const styles = StyleSheet.create({
  root: { flexGrow: 1, padding: 16, paddingTop: 42, gap: 14, backgroundColor: '#071018' },
  title: { ...typography.sectionTitle, color: colors.text },
  description: { ...typography.body, color: colors.textSecondary },
  stage: { height: 230, maxWidth: 600, width: '100%', borderWidth: 1, borderRadius: 16, borderColor: '#34404A', overflow: 'hidden', backgroundColor: '#0B1218', alignSelf: 'center' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { padding: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#34404A' },
  label: { ...typography.control, color: colors.text },
});
