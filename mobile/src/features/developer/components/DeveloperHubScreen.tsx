import { Redirect, router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import FlaskConical from 'lucide-react-native/icons/flask-conical';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { t } from '@/src/lib/i18n';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

type DeveloperDestination = {
  label: string;
  path: string;
};

type DeveloperGroup = {
  title: string;
  description: string;
  destinations: DeveloperDestination[];
};

const GROUPS: DeveloperGroup[] = [
  {
    title: 'CRÉATION',
    description: 'Labs visuels et outils de contrôle.',
    destinations: [
      { label: 'Relique Lab', path: '/social-relic-lab-preview' },
      { label: 'Rank Lab', path: '/rank-lab-preview' },
      { label: 'Navigation', path: '/navigation-preview' },
      { label: 'Administration des matchs', path: '/admin/matches' },
    ],
  },
  {
    title: 'PARCOURS PRODUIT',
    description: 'Chaque étape du parcours sans modifier tes données réelles.',
    destinations: [
      { label: 'Hub', path: '/hub-preview' },
      { label: 'Matchs', path: '/matches-preview' },
      { label: 'Centre de match', path: '/match-center-preview' },
      { label: 'Révélation du résultat', path: '/result-preview' },
      { label: 'Social', path: '/social-v2-preview' },
      { label: 'Social — version de référence', path: '/social-preview' },
      { label: 'Cercle social', path: '/social-circle-preview' },
      { label: 'Défis sociaux', path: '/social-challenges-preview' },
      { label: 'Rank', path: '/rank-preview' },
      { label: 'Onboarding', path: '/onboarding-preview' },
    ],
  },
  {
    title: 'COLLECTION & ÉCONOMIE',
    description: 'Toutes les surfaces liées aux objets et aux Volts.',
    destinations: [
      { label: 'Magasin', path: '/store-preview' },
      { label: 'Boutique', path: '/shop-preview' },
      { label: 'Vitrine', path: '/showcase-preview' },
      { label: 'Profil', path: '/profile-preview' },
      { label: 'Activité de la vitrine', path: '/growth-preview' },
      { label: 'Registre des Volts', path: '/economy-preview' },
      { label: 'Consommables', path: '/consumables-preview' },
      { label: 'Founder Pack', path: '/founder-pack-preview' },
      { label: 'Team Pack', path: '/team-pack-preview' },
    ],
  },
  {
    title: 'SYSTÈME',
    description: 'Écrans transverses et fonctionnalités en attente.',
    destinations: [
      { label: 'Paramètres', path: '/settings-preview' },
      { label: 'Série de calls', path: '/streak-preview' },
      { label: 'Campagne partenaire', path: '/campaign-preview' },
      { label: 'Rapport partenaire', path: '/campaign-report-preview' },
      { label: 'Room — placeholder', path: '/room' },
    ],
  },
];

export default function DeveloperHubScreen() {
  const { profile } = useAuth();
  if (!profile?.est_developpeur) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GriffHeader compact variant="wallet" />

        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel={t('developer.backLabel')}
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>{t('developer.back')}</Text>
          </Pressable>
          <View style={styles.creatorBadge}>
            <ShieldCheck color={colors.volt} size={16} strokeWidth={2.2} />
            <Text style={styles.creatorBadgeText}>{profile.est_createur ? t('developer.creator') : t('developer.account')}</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <View style={styles.introIcon}><FlaskConical color={colors.volt} size={24} strokeWidth={2} /></View>
          <Text style={styles.eyebrow}>{t('developer.eyebrow')}</Text>
          <Text accessibilityRole="header" style={styles.title}>{t('developer.title')}</Text>
          <Text style={styles.subtitle}>{t('developer.subtitle')}</Text>
        </View>

        <View style={styles.capabilities}>
          <Capability label={t('developer.unlimitedVolts')} />
          <Capability label={t('developer.fullCatalog')} />
          <Capability label={t('developer.previews')} />
        </View>

        {GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <View style={styles.groupHeading}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupDescription}>{group.description}</Text>
            </View>
            <View style={styles.destinationList}>
              {group.destinations.map((destination) => (
                <Pressable
                  key={destination.path}
                  accessibilityHint={destination.path}
                  accessibilityLabel={destination.label}
                  accessibilityRole="button"
                  onPress={() => router.push(destination.path as never)}
                  style={({ pressed }) => [styles.destination, pressed && styles.pressed]}
                >
                  <View style={styles.destinationIcon}>
                    <FlaskConical color={colors.textSecondary} size={17} strokeWidth={1.9} />
                  </View>
                  <View style={styles.destinationCopy}>
                    <Text style={styles.destinationLabel}>{destination.label}</Text>
                    <Text numberOfLines={1} style={styles.destinationPath}>{destination.path}</Text>
                  </View>
                  <ChevronRight color={colors.textMuted} size={18} strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.integrity}>{t('developer.integrity')}</Text>
      </ScrollView>
    </Screen>
  );
}

function Capability({ label }: { label: string }) {
  return (
    <View style={styles.capability}>
      <View style={styles.capabilityDot} />
      <Text style={styles.capabilityText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: 64,
  },
  topBar: {
    minHeight: 52,
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  back: {
    minHeight: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  backText: { ...typography.action, color: colors.text },
  creatorBadge: {
    minHeight: 34,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  creatorBadgeText: { ...typography.metadata, color: colors.volt },
  intro: { marginTop: 18, paddingHorizontal: spacing.md, gap: 8 },
  introIcon: {
    width: 48,
    height: 48,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGlassElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 },
  title: { ...typography.displayMedium, color: colors.text },
  subtitle: { ...typography.bodyComfort, maxWidth: 560, color: colors.textSecondary },
  capabilities: { marginTop: 18, paddingHorizontal: spacing.md, gap: 8 },
  capability: {
    minHeight: 36,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  capabilityDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: colors.volt },
  capabilityText: { ...typography.metadata, color: colors.textSecondary },
  group: { marginTop: 28, paddingHorizontal: spacing.md, gap: 11 },
  groupHeading: { gap: 4 },
  groupTitle: { ...typography.sectionTitle, color: colors.text },
  groupDescription: { ...typography.body, color: colors.textMuted },
  destinationList: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  destination: {
    minHeight: 62,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  destinationIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.surfaceGlassElevated,
  },
  destinationCopy: { minWidth: 0, flex: 1 },
  destinationLabel: { ...typography.bodyStrong, color: colors.text },
  destinationPath: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  integrity: {
    ...typography.caption,
    marginTop: 28,
    marginHorizontal: spacing.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  pressed: { opacity: 0.72 },
});
