import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, spacing, typography } from '@/src/theme';

import { loadPartnerCampaignReport } from '../api';
import type { PartnerCampaignMetrics, PartnerCampaignReport } from '../types';

type ReportMode = 'demonstration' | 'live';

type PartnerCampaignReportScreenProps = {
  previewReport?: PartnerCampaignReport;
};

export default function PartnerCampaignReportScreen({ previewReport }: PartnerCampaignReportScreenProps) {
  const params = useLocalSearchParams<{ key?: string | string[] }>();
  const campaignKey = firstParam(params.key) || 'nova-week';
  const { profile, status } = useAuth();
  const isAdmin = Boolean(previewReport || profile?.est_admin);
  const [report, setReport] = useState<PartnerCampaignReport | null>(previewReport ?? null);
  const [mode, setMode] = useState<ReportMode>('demonstration');
  const [loading, setLoading] = useState(!previewReport);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (previewReport) {
      setReport(previewReport);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!isAdmin) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setReport(await loadPartnerCampaignReport(campaignKey));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Rapport partenaire indisponible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignKey, isAdmin, previewReport]);

  useEffect(() => { void load(); }, [load]);

  if (!previewReport && status === 'loading') {
    return <Screen><View style={styles.center}><ActivityIndicator color="#AFA0FF" /><Text style={styles.loadingText}>AGRÉGATION DU RAPPORT…</Text></View></Screen>;
  }

  if (!isAdmin) {
    return <Screen><View style={styles.center}><Text style={styles.denied}>ACCÈS INTERNE.</Text><Text style={styles.muted}>Ce rapport est réservé à l’équipe GRIFF.</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/matches')} style={styles.backButton}><Text style={styles.backButtonText}>REVENIR AUX MATCHS</Text></Pressable></View></Screen>;
  }

  if (loading && !report) {
    return <Screen><View style={styles.center}><ActivityIndicator color="#AFA0FF" /><Text style={styles.loadingText}>AGRÉGATION DU RAPPORT…</Text></View></Screen>;
  }

  if (!report) {
    return <Screen><View style={styles.center}><Text style={styles.denied}>RAPPORT INDISPONIBLE.</Text><Text style={styles.muted}>{error ?? 'Impossible de lire les agrégats.'}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.backButton}><Text style={styles.backButtonText}>RÉESSAYER</Text></Pressable></View></Screen>;
  }

  const metrics = mode === 'live' ? report.live : report.demonstration;
  const modeLabel = mode === 'live' ? 'PILOTE RÉEL' : report.demonstration.label;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#AFA0FF" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir à Nova Week" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.headerBack, pressed && styles.pressed]}><Text style={styles.headerBackText}>← NOVA</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.headerEyebrow}>PARTNER LAB // INTERNE</Text><Text style={styles.headerTitle}>CAMPAIGN REPORT</Text></View>
          <View style={styles.privatePill}><Text style={styles.privatePillText}>AGRÉGÉ</Text></View>
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={['#291A50', '#100E1B', '#080B10']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}><Text style={styles.heroKicker}>{report.campaign.partner.toUpperCase()}{' // ACTIVATION'}</Text><Text style={styles.fictionTag}>{report.campaign.fictionalPartner ? 'FICTIONAL DEMO' : 'PARTNER'}</Text></View>
          <Text style={styles.heroTitle}>{report.campaign.name.toUpperCase()}</Text>
          <Text style={styles.heroSubtitle}>Une lecture commerciale claire, sans profil, email, pseudo ni identifiant utilisateur exposé.</Text>
          <View style={styles.heroFacts}><HeroFact label="PÉRIODE" value={dateRange(report.campaign.startsAt, report.campaign.endsAt)} /><View style={styles.factDivider} /><HeroFact label="EXPORT" value={report.partnerExport.publishable ? 'PRÊT' : 'MASQUÉ'} /><View style={styles.factDivider} /><HeroFact label="SEUIL" value={`${report.partnerExport.privacyThreshold} USERS`} /></View>
        </View>

        <View style={styles.modeTabs}>
          <ModeButton active={mode === 'demonstration'} label="DÉMO COMMERCIALE" onPress={() => setMode('demonstration')} />
          <ModeButton active={mode === 'live'} label="PILOTE LIVE" onPress={() => setMode('live')} />
        </View>
        <View style={styles.modeNotice}><View style={[styles.modeDot, mode === 'live' && styles.modeDotLive]} /><Text style={styles.modeNoticeText}>{modeLabel} · {mode === 'live' ? 'AGRÉGATS OBSERVÉS' : 'DONNÉES 100% SYNTHÉTIQUES'}</Text></View>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.metricGrid}>
          <MetricCard label="ÉLIGIBLES" value={formatNumber(metrics.eligibleUsers)} detail="audience compatible" />
          <MetricCard label="IMPRESSIONS" value={formatNumber(metrics.uniqueImpressions)} detail="utilisateurs uniques" accent />
          <MetricCard label="PARTICIPATION" value={formatPct(metrics.participationRate)} detail={`${formatNumber(metrics.participants)} participants`} />
          <MetricCard label="COMPLÉTION" value={formatPct(metrics.completionRate)} detail={`${formatNumber(metrics.completions)} parcours`} />
          <MetricCard label="RÉCLAMATION" value={formatPct(metrics.claimRate)} detail={`${formatNumber(metrics.rewardsClaimed)} lots`} />
          <MetricCard label="OBJET ÉQUIPÉ" value={formatNumber(metrics.usersWithEquippedItem)} detail="supporters actifs" accent />
        </View>

        <SectionTitle eyebrow="FUNNEL // ACTIVATION" title="DE L’IMPRESSION À L’IDENTITÉ." />
        <View style={styles.funnel}>
          <FunnelRow base={metrics.eligibleUsers} label="ÉLIGIBLES" value={metrics.eligibleUsers} />
          <FunnelRow base={metrics.eligibleUsers} label="IMPRESSION UNIQUE" value={metrics.uniqueImpressions} />
          <FunnelRow base={metrics.eligibleUsers} label="PARTICIPATION" value={metrics.participants} />
          <FunnelRow base={metrics.eligibleUsers} label="3 TÂCHES COMPLÉTÉES" value={metrics.completions} />
          <FunnelRow base={metrics.eligibleUsers} label="LOT RÉCLAMÉ" value={metrics.rewardsClaimed} />
          <FunnelRow base={metrics.eligibleUsers} label="OBJET PORTÉ" value={metrics.usersWithEquippedItem} />
        </View>

        <SectionTitle eyebrow="QUALITÉ // APRÈS ACTIVATION" title="RETENIR, SANS TRAQUER." />
        <View style={styles.retentionRow}>
          <RetentionCard label="J+7" metric={metrics.retention7} synthetic={mode === 'demonstration'} />
          <RetentionCard label="J+30" metric={metrics.retention30} synthetic={mode === 'demonstration'} />
        </View>

        <View style={[styles.exportCard, report.partnerExport.publishable && styles.exportCardReady]}>
          <View style={styles.exportMark}><Text style={styles.exportMarkText}>{report.partnerExport.publishable ? '✓' : '⌁'}</Text></View>
          <View style={styles.exportCopy}><Text style={styles.exportEyebrow}>EXPORT PARTENAIRE</Text><Text style={styles.exportTitle}>{report.partnerExport.publishable ? 'Cohorte publiable.' : 'Cohorte live masquée.'}</Text><Text style={styles.exportText}>{report.partnerExport.publishable ? 'Les indicateurs respectent le seuil minimum et peuvent être exportés sous forme agrégée.' : `Le pilote reste visible en interne, mais aucun export partenaire n’est produit sous ${report.partnerExport.privacyThreshold} utilisateurs éligibles.`}</Text></View>
        </View>

        <View style={styles.privacyCard}>
          <View style={styles.privacyHeader}><View><Text style={styles.privacyEyebrow}>PRIVACY CONTRACT // V1</Text><Text style={styles.privacyTitle}>AGRÉGATS, RIEN D’AUTRE.</Text></View><Text style={styles.privacyShield}>◇</Text></View>
          <PrivacyRow label="Données personnelles dans le rapport" safe={!report.privacy.personalData} />
          <PrivacyRow label="Identifiants ou pseudos" safe={!report.privacy.userIdentifiers} />
          <PrivacyRow label="Cohortes faibles masquées" safe={report.privacy.smallCohortsMasked} />
          <PrivacyRow label="Mesure inter-apps / publicitaire" safe />
          <Text style={styles.privacyFootnote}>La donnée brute reste dans le schéma privé GRIFF. Le partenaire ne reçoit que les indicateurs agrégés déclarés.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}><Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{label}</Text></Pressable>; }
function HeroFact({ label, value }: { label: string; value: string }) { return <View style={styles.heroFact}><Text style={styles.heroFactValue}>{value}</Text><Text style={styles.heroFactLabel}>{label}</Text></View>; }
function MetricCard({ accent = false, detail, label, value }: { accent?: boolean; detail: string; label: string; value: string }) { return <View style={[styles.metricCard, accent && styles.metricCardAccent]}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, accent && styles.metricValueAccent]}>{value}</Text><Text style={styles.metricDetail}>{detail}</Text></View>; }
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <View style={styles.sectionTitleBlock}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text></View>; }
function FunnelRow({ base, label, value }: { base: number; label: string; value: number }) { const width = base ? Math.max(value ? 5 : 0, Math.min(100, Math.round((value / base) * 100))) : 0; return <View style={styles.funnelRow}><View style={styles.funnelTop}><Text style={styles.funnelLabel}>{label}</Text><Text style={styles.funnelValue}>{formatNumber(value)}</Text></View><View style={styles.funnelTrack}><View style={[styles.funnelFill, { width: `${width}%` }]} /></View></View>; }
function RetentionCard({ label, metric, synthetic }: { label: string; metric: PartnerCampaignMetrics['retention7']; synthetic: boolean }) { return <View style={styles.retentionCard}><Text style={styles.retentionLabel}>{label}</Text><Text style={styles.retentionValue}>{metric.rate == null ? '—' : formatPct(metric.rate)}</Text><Text style={styles.retentionDetail}>{synthetic ? 'projection synthétique' : metric.cohort ? `${formatNumber(metric.retained)}/${formatNumber(metric.cohort)} retenus` : 'cohorte non mature'}</Text></View>; }
function PrivacyRow({ label, safe }: { label: string; safe: boolean }) { return <View style={styles.privacyRow}><Text style={styles.privacyRowLabel}>{label}</Text><Text style={[styles.privacyState, !safe && styles.privacyStateWarning]}>{safe ? 'NON / PROTÉGÉ ✓' : 'À VÉRIFIER'}</Text></View>; }
function firstParam(value?: string | string[]) { return Array.isArray(value) ? value[0] : value; }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value); }
function formatPct(value: number) { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)}%`; }
function dateRange(start: string, end: string) { const f = (value: string) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase(); return `${f(start)}–${f(end)}`; }

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: 54, gap: 18 },
  center: { flex: 1, minHeight: 520, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: 1 },
  denied: { ...typography.displaySmall, color: colors.text, textAlign: 'center' },
  muted: { ...typography.body, maxWidth: 310, color: colors.textMuted, textAlign: 'center' },
  backButton: { minHeight: 47, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#171B22' },
  backButtonText: { ...typography.action, color: colors.text },
  header: { minHeight: 72, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#1A1724' },
  headerBack: { minHeight: 42, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1016', borderWidth: 1, borderColor: '#302A42' },
  headerBackText: { ...typography.action, color: colors.text },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { ...typography.eyebrow, color: '#8F86A0', letterSpacing: .65 },
  headerTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 23, lineHeight: 24 },
  privatePill: { minHeight: 31, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: '#181426', borderWidth: 1, borderColor: '#4C3E69' },
  privatePillText: { ...typography.label, color: '#B8A8FF', fontSize: 9 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 342, marginHorizontal: spacing.md, padding: 19, borderRadius: 29, borderWidth: 1, borderColor: '#584475' },
  heroGlow: { position: 'absolute', right: -72, top: -65, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(139,108,255,.16)', boxShadow: '0 0 80px rgba(139,108,255,.18)' },
  heroTop: { zIndex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  heroKicker: { ...typography.eyebrow, color: '#C0B1FF', letterSpacing: .85 },
  fictionTag: { ...typography.label, color: '#9D91B2', fontSize: 9 },
  heroTitle: { ...typography.displayMedium, zIndex: 1, marginTop: 34, color: colors.text, fontSize: 48, lineHeight: 47 },
  heroSubtitle: { ...typography.body, zIndex: 1, maxWidth: 340, marginTop: 9, color: '#CAC3D8' },
  heroFacts: { minHeight: 76, zIndex: 1, marginTop: 'auto', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(5,6,11,.66)', borderWidth: 1, borderColor: '#413650' },
  heroFact: { flex: 1, alignItems: 'center' },
  heroFactValue: { ...typography.bodyStrong, color: colors.text, textAlign: 'center' },
  heroFactLabel: { ...typography.label, marginTop: 4, color: '#827A8E', fontSize: 8 },
  factDivider: { width: 1, height: 34, backgroundColor: '#383141' },
  modeTabs: { minHeight: 57, marginHorizontal: spacing.md, padding: 5, flexDirection: 'row', gap: 5, borderRadius: 18, backgroundColor: '#0A0D12', borderWidth: 1, borderColor: '#26232E' },
  modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  modeButtonActive: { backgroundColor: '#211934', borderWidth: 1, borderColor: '#5C477B' },
  modeButtonText: { ...typography.action, color: '#6F6978', fontSize: 10 },
  modeButtonTextActive: { color: '#C5B8FF' },
  modeNotice: { minHeight: 39, marginHorizontal: spacing.md, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 13, backgroundColor: '#111018' },
  modeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#AFA0FF' },
  modeDotLive: { backgroundColor: colors.volt },
  modeNoticeText: { ...typography.label, flex: 1, color: '#91889E', fontSize: 9, letterSpacing: .35 },
  error: { marginHorizontal: spacing.md, padding: 12, borderRadius: 15, backgroundColor: '#1A1018', borderWidth: 1, borderColor: '#5A294E' },
  errorText: { ...typography.body, color: '#FF9CCF' },
  metricGrid: { marginHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', minHeight: 137, padding: 14, borderRadius: 21, backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#292632' },
  metricCardAccent: { backgroundColor: '#151126', borderColor: '#564274' },
  metricLabel: { ...typography.eyebrow, color: '#81798A', letterSpacing: .5 },
  metricValue: { marginTop: 12, color: colors.text, fontFamily: fonts.display, fontSize: 33, lineHeight: 34, fontVariant: ['tabular-nums'] },
  metricValueAccent: { color: '#B8A8FF' },
  metricDetail: { ...typography.caption, marginTop: 'auto', color: colors.textMuted },
  sectionTitleBlock: { marginHorizontal: spacing.md, paddingTop: 8 },
  sectionEyebrow: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: .7 },
  sectionTitle: { ...typography.sectionTitle, maxWidth: 340, marginTop: 4, color: colors.text },
  funnel: { marginHorizontal: spacing.md, padding: 16, gap: 14, borderRadius: 24, backgroundColor: '#0A0D12', borderWidth: 1, borderColor: '#292632' },
  funnelRow: { gap: 7 },
  funnelTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  funnelLabel: { ...typography.label, color: '#8C8495', fontSize: 9, letterSpacing: .35 },
  funnelValue: { ...typography.label, color: colors.text, fontVariant: ['tabular-nums'] },
  funnelTrack: { height: 8, overflow: 'hidden', borderRadius: 5, backgroundColor: '#24212A' },
  funnelFill: { height: '100%', borderRadius: 5, backgroundColor: '#AFA0FF' },
  retentionRow: { marginHorizontal: spacing.md, flexDirection: 'row', gap: 10 },
  retentionCard: { flex: 1, minHeight: 151, padding: 15, borderRadius: 22, backgroundColor: '#151126', borderWidth: 1, borderColor: '#4E3B6A' },
  retentionLabel: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: .6 },
  retentionValue: { marginTop: 15, color: colors.text, fontFamily: fonts.display, fontSize: 39, lineHeight: 40 },
  retentionDetail: { ...typography.caption, marginTop: 'auto', color: '#8F869D' },
  exportCard: { minHeight: 156, marginHorizontal: spacing.md, padding: 16, flexDirection: 'row', gap: 13, borderRadius: 24, backgroundColor: '#131113', borderWidth: 1, borderColor: '#4A3D2B' },
  exportCardReady: { backgroundColor: '#11150D', borderColor: '#44511F' },
  exportMark: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#241D14' },
  exportMarkText: { color: '#D1B266', fontFamily: fonts.display, fontSize: 24 },
  exportCopy: { flex: 1, minWidth: 0 },
  exportEyebrow: { ...typography.eyebrow, color: '#C4A55A', letterSpacing: .55 },
  exportTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text },
  exportText: { ...typography.caption, marginTop: 6, color: colors.textMuted },
  privacyCard: { marginHorizontal: spacing.md, padding: 16, borderRadius: 24, backgroundColor: '#0A0D12', borderWidth: 1, borderColor: '#292632' },
  privacyHeader: { minHeight: 67, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  privacyEyebrow: { ...typography.eyebrow, color: '#AFA0FF', letterSpacing: .55 },
  privacyTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text },
  privacyShield: { color: '#AFA0FF', fontFamily: fonts.display, fontSize: 33 },
  privacyRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#25222B' },
  privacyRowLabel: { ...typography.caption, flex: 1, color: colors.textMuted },
  privacyState: { ...typography.label, color: colors.volt, fontSize: 9 },
  privacyStateWarning: { color: '#FFB75D' },
  privacyFootnote: { ...typography.caption, marginTop: 12, color: '#77717E' },
  pressed: { opacity: .76 },
});
