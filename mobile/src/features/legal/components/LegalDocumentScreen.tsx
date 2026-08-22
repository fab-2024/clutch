import { router } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { colors, spacing, typography } from '@/src/theme';

import type { LegalDocument } from '../types';

export default function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir en arrière" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>← RETOUR</Text>
          </Pressable>
        </View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{document.eyebrow}</Text>
          <Text style={styles.title}>{document.title}</Text>
          <Text style={styles.updated}>MISE À JOUR · {document.updatedAt.toUpperCase()}</Text>
          <Text style={styles.lead}>{document.introduction}</Text>
        </View>
        {document.sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
              {section.paragraphs.map((paragraph) => <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>)}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: spacing.md, paddingBottom: 72 },
  header: { minHeight: 72, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#171D23' },
  back: { minHeight: 38, alignSelf: 'flex-start', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' },
  backText: { ...typography.action, color: colors.text },
  intro: { paddingVertical: 28, gap: 9 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 },
  title: { ...typography.displayMedium, maxWidth: 590, color: colors.text },
  updated: { ...typography.label, color: colors.textSubtle },
  lead: { ...typography.body, maxWidth: 640, marginTop: 8, color: colors.textMuted, lineHeight: 23 },
  section: { flexDirection: 'row', gap: 14, paddingVertical: 22, borderTopWidth: 1, borderTopColor: '#1B2229' },
  number: { ...typography.label, width: 24, color: colors.volt },
  sectionCopy: { flex: 1, minWidth: 0, gap: 10 },
  sectionTitle: { ...typography.cardTitle, color: colors.text },
  paragraph: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  pressed: { opacity: 0.72 },
});
