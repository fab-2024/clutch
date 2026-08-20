import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { gameLabel, matchPhase } from '@/src/features/matches/utils';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';

import {
  cancelAdminMatch,
  createAdminMatch,
  loadAdminMatchData,
  rescheduleAdminMatch,
  settleAdminMatch,
  startAdminMatch,
} from '../api';
import type { AdminEvent, AdminMatch, AdminMatchData } from '../types';

const EMPTY_DATA: AdminMatchData = { matches: [], seasons: [], events: [], teams: [] };

export default function AdminMatchesScreen() {
  const { profile, loading: authLoading } = useAuth();
  const profileId = profile?.id;
  const isAdmin = Boolean(profile?.est_admin);
  const [data, setData] = useState<AdminMatchData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!isAdmin) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setData(await loadAdminMatchData()); }
    catch (caught) { setError(messageFrom(caught, 'Impossible de charger les opérations matchs.')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading && profileId && !isAdmin) router.replace('/(tabs)/matches');
  }, [authLoading, isAdmin, profileId]);

  useEffect(() => { void load(); }, [load]);

  const liveCount = data.matches.filter((match) => matchPhase(match) === 'live').length;
  const attentionCount = data.matches.filter((match) => match.statut === 'a_venir' && new Date(match.debut).getTime() <= Date.now()).length;

  if (authLoading || !profile) return <Screen><View style={styles.center}><Text style={styles.muted}>Vérification des droits…</Text></View></Screen>;
  if (!isAdmin) return <Screen><View style={styles.center}><Text style={styles.deniedTitle}>ACCÈS REFUSÉ.</Text><Text style={styles.muted}>Cette zone est réservée aux administrateurs Clutch.</Text></View></Screen>;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
      >
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Retour à l’Arena" accessibilityRole="button" onPress={() => router.replace('/(tabs)/matches')} style={styles.back}><Text style={styles.backText}>← ARENA</Text></Pressable>
          <View style={styles.securePill}><View style={styles.secureDot} /><Text style={styles.secureText}>ADMIN</Text></View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>OPS // MATCHS</Text>
          <Text style={styles.title}>GARDE L’ARENA{`\n`}À L’HEURE.</Text>
          <Text style={styles.subtitle}>Crée les affiches, démarre le live, reporte ou fige le résultat. Chaque action reste validée côté serveur.</Text>
        </View>

        <View style={styles.stats}>
          <AdminStat label="OUVERTS" value={data.matches.length} />
          <AdminStat label="LIVE" value={liveCount} accent />
          <AdminStat label="À TRAITER" value={attentionCount} warning={attentionCount > 0} />
        </View>

        {error ? <StateCard title="SYNCHRONISATION IMPOSSIBLE" copy={error} action="RÉESSAYER" onPress={() => void load()} /> : null}

        <CreateMatchPanel data={data} disabled={loading} onCreated={() => load()} />

        <View style={styles.sectionHead}>
          <View><Text style={styles.sectionEyebrow}>CYCLE OUVERT</Text><Text style={styles.sectionTitle}>Matchs à piloter.</Text></View>
          <Text style={styles.sectionCount}>{data.matches.length}</Text>
        </View>

        {loading ? <StateCard title="SYNCHRONISATION…" copy="Lecture du calendrier et des droits administrateur." /> : data.matches.length ? (
          <View style={styles.matchList}>
            {data.matches.map((match) => <AdminMatchCard key={match.id} match={match} onChanged={() => load()} />)}
          </View>
        ) : (
          <StateCard title="AUCUN MATCH OUVERT." copy="Crée la prochaine affiche pour réactiver l’Arena." />
        )}
      </ScrollView>
    </Screen>
  );
}

function AdminStat({ label, value, accent = false, warning = false }: { label: string; value: number; accent?: boolean; warning?: boolean }) {
  return <View style={[styles.stat, accent && styles.statAccent, warning && styles.statWarning]}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function CreateMatchPanel({ data, disabled, onCreated }: { data: AdminMatchData; disabled: boolean; onCreated: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [eventId, setEventId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [format, setFormat] = useState<1 | 3 | 5>(3);
  const [startsAt, setStartsAt] = useState(defaultDateInput);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultSeasonId = data.seasons.find((season) => season.statut === 'en_cours')?.id ?? data.seasons[0]?.id ?? '';
  const defaultEventId = data.events[0]?.id ?? '';

  useEffect(() => {
    if (!seasonId && defaultSeasonId) setSeasonId(defaultSeasonId);
    if (!eventId && defaultEventId) setEventId(defaultEventId);
  }, [defaultEventId, defaultSeasonId, eventId, seasonId]);

  const selectedEvent = data.events.find((event) => event.id === eventId) ?? null;
  const selectedGame = selectedEvent?.jeu ?? null;
  const teams = useMemo(
    () => data.teams.filter((team) => !selectedGame || team.jeu === selectedGame),
    [data.teams, selectedGame],
  );

  function selectEvent(event: AdminEvent) {
    setEventId(event.id);
    setTeamAId('');
    setTeamBId('');
  }

  async function create() {
    if (busy) return;
    setError(null);
    try {
      const parsedDate = parseFutureDate(startsAt);
      if (!eventId || !seasonId || !teamAId || !teamBId) throw new Error('Choisis la saison, le tournoi et les deux équipes.');
      if (teamAId === teamBId) throw new Error('Choisis deux équipes différentes.');
      setBusy(true);
      await createAdminMatch({ eventId, seasonId, teamAId, teamBId, format, startsAt: parsedDate });
      setTeamAId(''); setTeamBId(''); setStartsAt(defaultDateInput()); setExpanded(false);
      await onCreated();
    } catch (caught) { setError(messageFrom(caught, 'Création du match impossible.')); }
    finally { setBusy(false); }
  }

  return (
    <View style={styles.createCard}>
      <Pressable accessibilityLabel={`${expanded ? 'Masquer' : 'Afficher'} le formulaire de création`} accessibilityRole="button" onPress={() => setExpanded((value) => !value)} style={styles.createHeader}>
        <View><Text style={styles.createEyebrow}>NOUVELLE AFFICHE</Text><Text style={styles.createTitle}>Ajouter un match.</Text></View>
        <Text style={styles.createToggle}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.form}>
          <FieldLabel>Saison</FieldLabel>
          <ChoiceRail items={data.seasons} selected={seasonId} label={(item) => item.nom} onSelect={(item) => setSeasonId(item.id)} />
          <FieldLabel>Tournoi</FieldLabel>
          <ChoiceRail items={data.events} selected={eventId} label={(item) => `${gameLabel(item.jeu)} · ${item.nom}`} onSelect={selectEvent} />
          <FieldLabel>Équipe A</FieldLabel>
          <ChoiceRail items={teams} selected={teamAId} label={(item) => `${item.tag} · ${item.nom}`} onSelect={(item) => setTeamAId(item.id)} />
          <FieldLabel>Équipe B</FieldLabel>
          <ChoiceRail items={teams} selected={teamBId} label={(item) => `${item.tag} · ${item.nom}`} onSelect={(item) => setTeamBId(item.id)} />
          <View style={styles.inlineFields}>
            <View style={styles.inlineField}><FieldLabel>Format</FieldLabel><View style={styles.formatRow}>{([1, 3, 5] as const).map((value) => <Pressable accessibilityLabel={`Format BO${value}`} accessibilityRole="button" accessibilityState={{ selected: format === value }} key={value} onPress={() => setFormat(value)} style={[styles.formatButton, format === value && styles.choiceActive]}><Text style={[styles.choiceText, format === value && styles.choiceTextActive]}>BO{value}</Text></Pressable>)}</View></View>
            <View style={styles.dateField}><FieldLabel>Coup d’envoi</FieldLabel><TextInput accessibilityLabel="Date et heure du coup d’envoi" value={startsAt} onChangeText={setStartsAt} placeholder="2026-08-21T20:00" placeholderTextColor="#53606D" autoCapitalize="none" style={styles.input} /></View>
          </View>
          {error ? <Text style={styles.formError}>{error}</Text> : null}
          <Pressable accessibilityLabel="Créer le match" accessibilityRole="button" disabled={disabled || busy} onPress={() => void create()} style={({ pressed }) => [styles.primaryButton, (disabled || busy) && styles.disabled, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>{busy ? 'CRÉATION…' : 'CRÉER LE MATCH'}</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ChoiceRail<T extends { id: string }>({ items, selected, label, onSelect }: { items: T[]; selected: string; label: (item: T) => string; onSelect: (item: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRail}>
      {items.map((item) => <Pressable accessibilityLabel={label(item)} accessibilityRole="button" accessibilityState={{ selected: selected === item.id }} key={item.id} onPress={() => onSelect(item)} style={[styles.choice, selected === item.id && styles.choiceActive]}><Text numberOfLines={1} style={[styles.choiceText, selected === item.id && styles.choiceTextActive]}>{label(item)}</Text></Pressable>)}
    </ScrollView>
  );
}

function FieldLabel({ children }: { children: string }) { return <Text style={styles.fieldLabel}>{children.toUpperCase()}</Text>; }

type ActionMode = 'idle' | 'score' | 'reschedule' | 'cancel';

function AdminMatchCard({ match, onChanged }: { match: AdminMatch; onChanged: () => Promise<void> }) {
  const phase = matchPhase(match);
  const [mode, setMode] = useState<ActionMode>('idle');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [newDate, setNewDate] = useState(defaultDateInput);
  const [reason, setReason] = useState('Match annulé par l’organisation');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await action(); setMode('idle'); await onChanged(); }
    catch (caught) { setError(messageFrom(caught, 'Action impossible sur ce match.')); }
    finally { setBusy(false); }
  }

  function settle() {
    const a = Number(scoreA); const b = Number(scoreB); const expected = Math.ceil(match.format / 2);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b || Math.max(a, b) !== expected) {
      setError(`Score BO${match.format} invalide : le vainqueur doit atteindre ${expected}.`);
      return;
    }
    void run(() => settleAdminMatch(match.id, a, b));
  }

  return (
    <View style={[styles.matchCard, phase === 'live' && styles.matchCardLive]}>
      <View style={styles.matchTop}>
        <View style={styles.matchMeta}><Text style={styles.matchGame}>{gameLabel(match.jeu)} · BO{match.format}</Text><Text numberOfLines={1} style={styles.matchEvent}>{match.evenement}</Text></View>
        <View style={[styles.statusPill, phase === 'live' && styles.statusPillLive]}><View style={[styles.statusDot, phase === 'live' && styles.statusDotLive]} /><Text style={[styles.statusText, phase === 'live' && styles.statusTextLive]}>{phase === 'live' ? 'LIVE' : 'À VENIR'}</Text></View>
      </View>
      <Text style={styles.matchTeams}>{match.tag_a} <Text style={styles.matchVs}>VS</Text> {match.tag_b}</Text>
      <Text style={styles.matchNames}>{match.equipe_a} · {match.equipe_b}</Text>
      <Text style={styles.matchDate}>{formatDateTime(match.debut)}</Text>
      {match.statut === 'a_venir' && phase === 'live' ? <Text style={styles.attention}>STATUT À RÉGULARISER · le coup d’envoi est passé</Text> : null}

      <View style={styles.actionRow}>
        {match.statut === 'a_venir' && phase === 'live' ? <ActionButton label="DÉMARRER" onPress={() => void run(() => startAdminMatch(match.id))} /> : null}
        {phase === 'live' ? <ActionButton label="RÉGLER" primary onPress={() => setMode(mode === 'score' ? 'idle' : 'score')} /> : null}
        {match.statut === 'a_venir' ? <ActionButton label="REPORTER" onPress={() => setMode(mode === 'reschedule' ? 'idle' : 'reschedule')} /> : null}
        <ActionButton label="ANNULER" danger onPress={() => setMode(mode === 'cancel' ? 'idle' : 'cancel')} />
      </View>

      {mode === 'score' ? <View style={styles.inlinePanel}><Text style={styles.inlineTitle}>SCORE FINAL</Text><View style={styles.scoreRow}><TextInput value={scoreA} onChangeText={setScoreA} keyboardType="number-pad" placeholder={match.tag_a} placeholderTextColor="#53606D" style={styles.scoreInput} /><Text style={styles.scoreDash}>—</Text><TextInput value={scoreB} onChangeText={setScoreB} keyboardType="number-pad" placeholder={match.tag_b} placeholderTextColor="#53606D" style={styles.scoreInput} /></View><ConfirmButton busy={busy} label="FIGER LE RÉSULTAT" onPress={settle} /></View> : null}
      {mode === 'reschedule' ? <View style={styles.inlinePanel}><Text style={styles.inlineTitle}>NOUVEAU COUP D’ENVOI</Text><TextInput value={newDate} onChangeText={setNewDate} autoCapitalize="none" style={styles.input} /><ConfirmButton busy={busy} label="CONFIRMER LE REPORT" onPress={() => { try { const iso = parseFutureDate(newDate); void run(() => rescheduleAdminMatch(match.id, iso)); } catch (caught) { setError(messageFrom(caught, 'Date invalide.')); } }} /></View> : null}
      {mode === 'cancel' ? <View style={styles.inlinePanel}><Text style={styles.inlineTitle}>MOTIF D’ANNULATION</Text><TextInput value={reason} onChangeText={setReason} maxLength={120} style={styles.input} /><ConfirmButton busy={busy} danger label="ANNULER DÉFINITIVEMENT" onPress={() => void run(() => cancelAdminMatch(match.id, reason))} /></View> : null}
      {error ? <Text style={styles.formError}>{error}</Text> : null}
    </View>
  );
}

function ActionButton({ label, onPress, primary = false, danger = false }: { label: string; onPress: () => void; primary?: boolean; danger?: boolean }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionButton, primary && styles.actionPrimary, danger && styles.actionDanger, pressed && styles.pressed]}><Text style={[styles.actionText, primary && styles.actionTextPrimary, danger && styles.actionTextDanger]}>{label}</Text></Pressable>;
}

function ConfirmButton({ label, onPress, busy, danger = false }: { label: string; onPress: () => void; busy: boolean; danger?: boolean }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" disabled={busy} onPress={onPress} style={({ pressed }) => [styles.confirmButton, danger && styles.confirmDanger, busy && styles.disabled, pressed && styles.pressed]}><Text style={[styles.confirmText, danger && styles.confirmTextDanger]}>{busy ? 'EN COURS…' : label}</Text></Pressable>;
}

function StateCard({ title, copy, action, onPress }: { title: string; copy: string; action?: string; onPress?: () => void }) {
  return <View style={styles.stateCard}><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateCopy}>{copy}</Text>{action && onPress ? <Pressable accessibilityLabel={action} accessibilityRole="button" onPress={onPress}><Text style={styles.stateAction}>{action}</Text></Pressable> : null}</View>;
}

function defaultDateInput() {
  const date = new Date(Date.now() + 3 * 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseFutureDate(value: string) {
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) throw new Error('Utilise le format AAAA-MM-JJTHH:mm.');
  if (date.getTime() <= Date.now()) throw new Error('La date doit être dans le futur.');
  return date.toISOString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase();
}

function messageFrom(value: unknown, fallback: string) {
  if (value instanceof Error && value.message) return value.message;
  if (value && typeof value === 'object' && 'message' in value) return String(value.message || fallback);
  return fallback;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 60, gap: 18 },
  center: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: 8 },
  muted: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  deniedTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { minHeight: 40, justifyContent: 'center', paddingRight: 12 },
  backText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  securePill: { minHeight: 30, paddingHorizontal: 11, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#414D1E' },
  secureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  secureText: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  intro: { gap: 9 },
  eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 38, lineHeight: 38, fontWeight: '900', letterSpacing: -2 },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minHeight: 86, padding: 13, borderRadius: 20, justifyContent: 'space-between', backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  statAccent: { backgroundColor: '#0F171D', borderColor: '#294C64' },
  statWarning: { backgroundColor: '#1A130D', borderColor: '#5B3C20' },
  statValue: { color: colors.text, fontSize: 27, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: .8 },
  createCard: { overflow: 'hidden', borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#303A43' },
  createHeader: { minHeight: 82, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  createTitle: { marginTop: 5, color: colors.text, fontSize: 20, fontWeight: '900' },
  createToggle: { color: colors.volt, fontSize: 27, fontWeight: '800' },
  form: { padding: 15, borderTopWidth: 1, borderTopColor: colors.border, gap: 9 },
  fieldLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  choiceRail: { gap: 7, paddingRight: 12 },
  choice: { maxWidth: 220, minHeight: 37, paddingHorizontal: 11, borderRadius: 12, justifyContent: 'center', backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  choiceActive: { backgroundColor: '#171E12', borderColor: colors.volt },
  choiceText: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  choiceTextActive: { color: colors.text },
  inlineFields: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  inlineField: { flex: 1, gap: 7 },
  dateField: { flex: 1.7, gap: 7 },
  formatRow: { flexDirection: 'row', gap: 5 },
  formatButton: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, color: colors.text, fontSize: 10, fontWeight: '800', backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  formError: { color: '#FF9AA3', fontSize: 10, lineHeight: 15 },
  primaryButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  primaryButtonText: { color: '#080B0F', fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  sectionTitle: { marginTop: 4, color: colors.text, fontSize: 22, fontWeight: '900' },
  sectionCount: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  matchList: { gap: 11 },
  matchCard: { padding: 15, borderRadius: 23, gap: 9, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  matchCardLive: { borderColor: '#294C64', backgroundColor: '#0B1218' },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  matchMeta: { flex: 1, minWidth: 0 },
  matchGame: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  matchEvent: { marginTop: 3, color: colors.textMuted, fontSize: 9 },
  statusPill: { minHeight: 27, paddingHorizontal: 9, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#11161C', borderWidth: 1, borderColor: '#29323B' },
  statusPillLive: { backgroundColor: '#0E1A23', borderColor: '#2C5B7A' },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#77828E' },
  statusDotLive: { backgroundColor: '#56ADFF' },
  statusText: { color: colors.textMuted, fontSize: 7, fontWeight: '900' },
  statusTextLive: { color: '#56ADFF' },
  matchTeams: { color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: -1 },
  matchVs: { color: colors.textMuted, fontSize: 13 },
  matchNames: { color: colors.textMuted, fontSize: 10 },
  matchDate: { color: colors.text, fontSize: 9, fontWeight: '900', letterSpacing: .6 },
  attention: { color: '#FFB467', fontSize: 8, fontWeight: '900', letterSpacing: .5 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { minHeight: 36, paddingHorizontal: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#303A43' },
  actionPrimary: { backgroundColor: colors.volt, borderColor: colors.volt },
  actionDanger: { borderColor: '#5A2A31' },
  actionText: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: .5 },
  actionTextPrimary: { color: '#080B0F' },
  actionTextDanger: { color: '#FF8E99' },
  inlinePanel: { padding: 12, borderRadius: 15, gap: 9, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  inlineTitle: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: .9 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreInput: { flex: 1, minHeight: 50, borderRadius: 12, color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center', backgroundColor: '#0C1217', borderWidth: 1, borderColor: '#2B3741' },
  scoreDash: { color: colors.textMuted, fontSize: 15, fontWeight: '900' },
  confirmButton: { minHeight: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  confirmDanger: { backgroundColor: '#2B1116', borderWidth: 1, borderColor: '#6A2E38' },
  confirmText: { color: '#080B0F', fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  confirmTextDanger: { color: '#FF9AA3' },
  stateCard: { minHeight: 130, justifyContent: 'center', padding: 18, borderRadius: radius.lg, gap: 7, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  stateTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  stateCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  stateAction: { marginTop: 4, color: colors.volt, fontSize: 8, fontWeight: '900' },
  disabled: { opacity: .5 },
  pressed: { opacity: .82, transform: [{ scale: .99 }] },
});
