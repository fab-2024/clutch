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
import { colors, radius, spacing, typography } from '@/src/theme';

import {
  cancelAdminMatch,
  correctAdminMatchResult,
  createAdminMatch,
  loadAdminMatchData,
  loadAdminMatchHistory,
  rescheduleAdminMatch,
  settleAdminMatch,
  startAdminMatch,
} from '../api';
import type { AdminEvent, AdminMatch, AdminMatchAudit, AdminMatchData } from '../types';

const EMPTY_DATA: AdminMatchData = { matches: [], seasons: [], events: [], teams: [] };
const RESULT_SOURCES = [
  { id: 'grid', label: 'GRID' },
  { id: 'pandascore', label: 'PandaScore' },
  { id: 'liquipedia', label: 'Liquipedia' },
  { id: 'validation_clutch', label: 'Validation Clutch' },
] as const;

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

  const openMatches = useMemo(
    () => [...data.matches]
      .filter((match) => match.statut === 'a_venir' || match.statut === 'en_cours')
      .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime()),
    [data.matches],
  );
  const closedMatches = useMemo(
    () => data.matches
      .filter((match) => match.statut === 'termine' || match.statut === 'annule')
      .slice(0, 20),
    [data.matches],
  );
  const liveCount = openMatches.filter((match) => matchPhase(match) === 'live').length;
  const attentionCount = openMatches.filter((match) => match.statut === 'a_venir' && new Date(match.debut).getTime() <= Date.now()).length;

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
          <AdminStat label="OUVERTS" value={openMatches.length} />
          <AdminStat label="LIVE" value={liveCount} accent />
          <AdminStat label="À TRAITER" value={attentionCount} warning={attentionCount > 0} />
        </View>

        {error ? <StateCard title="SYNCHRONISATION IMPOSSIBLE" copy={error} action="RÉESSAYER" onPress={() => void load()} /> : null}

        <CreateMatchPanel data={data} disabled={loading} onCreated={() => load()} />

        <View style={styles.sectionHead}>
          <View><Text style={styles.sectionEyebrow}>CYCLE OUVERT</Text><Text style={styles.sectionTitle}>Matchs à piloter.</Text></View>
          <Text style={styles.sectionCount}>{openMatches.length}</Text>
        </View>

        {loading ? <StateCard title="SYNCHRONISATION…" copy="Lecture du calendrier et des droits administrateur." /> : openMatches.length ? (
          <View style={styles.matchList}>
            {openMatches.map((match) => <AdminMatchCard key={match.id} match={match} onChanged={() => load()} />)}
          </View>
        ) : (
          <StateCard title="AUCUN MATCH OUVERT." copy="Crée la prochaine affiche pour réactiver l’Arena." />
        )}

        {closedMatches.length ? (
          <>
            <View style={styles.sectionHead}>
              <View><Text style={styles.sectionEyebrow}>HISTORIQUE RÉCENT</Text><Text style={styles.sectionTitle}>Résultats et corrections.</Text></View>
              <Text style={styles.sectionCount}>{closedMatches.length}</Text>
            </View>
            <View style={styles.matchList}>
              {closedMatches.map((match) => <AdminMatchCard key={match.id} match={match} onChanged={() => load()} />)}
            </View>
          </>
        ) : null}
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

function ChoiceRail<T extends { id: string }>({ items, selected, label, onSelect }: { items: readonly T[]; selected: string; label: (item: T) => string; onSelect: (item: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRail}>
      {items.map((item) => <Pressable accessibilityLabel={label(item)} accessibilityRole="button" accessibilityState={{ selected: selected === item.id }} key={item.id} onPress={() => onSelect(item)} style={[styles.choice, selected === item.id && styles.choiceActive]}><Text numberOfLines={1} style={[styles.choiceText, selected === item.id && styles.choiceTextActive]}>{label(item)}</Text></Pressable>)}
    </ScrollView>
  );
}

function FieldLabel({ children }: { children: string }) { return <Text style={styles.fieldLabel}>{children.toUpperCase()}</Text>; }

type ActionMode = 'idle' | 'score' | 'correction' | 'reschedule' | 'cancel' | 'history';

function AdminMatchCard({ match, onChanged }: { match: AdminMatch; onChanged: () => Promise<void> }) {
  const phase = matchPhase(match);
  const [mode, setMode] = useState<ActionMode>('idle');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [source, setSource] = useState('validation_clutch');
  const [externalId, setExternalId] = useState('');
  const [newDate, setNewDate] = useState(defaultDateInput);
  const [reason, setReason] = useState('Match annulé par l’organisation');
  const [correctionReason, setCorrectionReason] = useState('Correction après vérification de la source officielle');
  const [history, setHistory] = useState<AdminMatchAudit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceLabel = RESULT_SOURCES.find((item) => item.id === source)?.label ?? 'Validation Clutch';
  const terminal = match.statut === 'termine' || match.statut === 'annule';
  const statusLabel = match.statut === 'termine'
    ? `FINAL · V${Math.max(1, match.resultat_revision)}`
    : match.statut === 'annule'
      ? 'ANNULÉ'
      : phase === 'live'
        ? 'LIVE'
        : 'À VENIR';

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
    if (!externalId.trim()) {
      setError('Ajoute la référence fournie par la source officielle.');
      return;
    }
    if (mode === 'correction' && correctionReason.trim().length < 10) {
      setError('Explique la correction en au moins 10 caractères.');
      return;
    }
    void run(() => mode === 'correction'
      ? correctAdminMatchResult({
        matchId: match.id,
        scoreA: a,
        scoreB: b,
        source,
        sourceLabel,
        externalId: externalId.trim(),
        reason: correctionReason.trim(),
      })
      : settleAdminMatch({
        matchId: match.id,
        scoreA: a,
        scoreB: b,
        source,
        sourceLabel,
        externalId: externalId.trim(),
      }));
  }

  function openCorrection() {
    if (mode === 'correction') {
      setMode('idle');
      return;
    }
    setScoreA(String(match.score_a ?? ''));
    setScoreB(String(match.score_b ?? ''));
    setSource(RESULT_SOURCES.some((item) => item.id === match.resultat_source)
      ? match.resultat_source!
      : 'validation_clutch');
    setExternalId(match.resultat_identifiant_externe ?? '');
    setMode('correction');
    setError(null);
  }

  async function openHistory() {
    if (mode === 'history') {
      setMode('idle');
      return;
    }
    setMode('history');
    setHistoryLoading(true);
    setError(null);
    try {
      const data = await loadAdminMatchHistory(match.id);
      setHistory(data.operations ?? []);
    } catch (caught) {
      setError(messageFrom(caught, 'Journal d’opérations indisponible.'));
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <View style={[styles.matchCard, phase === 'live' && styles.matchCardLive, terminal && styles.matchCardTerminal]}>
      <View style={styles.matchTop}>
        <View style={styles.matchMeta}><Text style={styles.matchGame}>{gameLabel(match.jeu)} · BO{match.format}</Text><Text numberOfLines={1} style={styles.matchEvent}>{match.evenement}</Text></View>
        <View style={[styles.statusPill, phase === 'live' && styles.statusPillLive, terminal && styles.statusPillTerminal]}><View style={[styles.statusDot, phase === 'live' && styles.statusDotLive, terminal && styles.statusDotTerminal]} /><Text style={[styles.statusText, phase === 'live' && styles.statusTextLive, terminal && styles.statusTextTerminal]}>{statusLabel}</Text></View>
      </View>
      <Text style={styles.matchTeams}>{match.tag_a} <Text style={styles.matchVs}>VS</Text> {match.tag_b}</Text>
      <Text style={styles.matchNames}>{match.equipe_a} · {match.equipe_b}</Text>
      <Text style={styles.matchDate}>{formatDateTime(match.debut)}</Text>
      {match.statut === 'a_venir' && phase === 'live' ? <Text style={styles.attention}>STATUT À RÉGULARISER · le coup d’envoi est passé</Text> : null}
      {match.statut === 'termine' ? <ResultReceipt match={match} /> : null}
      {match.statut === 'annule' ? <Text style={styles.cancelReceipt}>MOTIF · {match.motif_annulation ?? 'Non renseigné'}</Text> : null}

      <View style={styles.actionRow}>
        {match.statut === 'a_venir' && phase === 'live' ? <ActionButton label="DÉMARRER" onPress={() => void run(() => startAdminMatch(match.id))} /> : null}
        {match.statut === 'en_cours' ? <ActionButton label="RÉGLER" primary onPress={() => setMode(mode === 'score' ? 'idle' : 'score')} /> : null}
        {match.statut === 'a_venir' ? <ActionButton label="REPORTER" onPress={() => setMode(mode === 'reschedule' ? 'idle' : 'reschedule')} /> : null}
        {match.statut === 'termine' ? <ActionButton label="CORRIGER" danger onPress={openCorrection} /> : null}
        {!terminal ? <ActionButton label="ANNULER" danger onPress={() => setMode(mode === 'cancel' ? 'idle' : 'cancel')} /> : null}
        <ActionButton label="JOURNAL" onPress={() => void openHistory()} />
      </View>

      {mode === 'score' || mode === 'correction' ? (
        <View style={styles.inlinePanel}>
          <Text style={styles.inlineTitle}>{mode === 'correction' ? 'CORRECTION DU RÉSULTAT' : 'RÉSULTAT OFFICIEL'}</Text>
          <View style={styles.scoreRow}>
            <TextInput accessibilityLabel={`Score ${match.tag_a}`} value={scoreA} onChangeText={setScoreA} keyboardType="number-pad" placeholder={match.tag_a} placeholderTextColor="#53606D" style={styles.scoreInput} />
            <Text style={styles.scoreDash}>—</Text>
            <TextInput accessibilityLabel={`Score ${match.tag_b}`} value={scoreB} onChangeText={setScoreB} keyboardType="number-pad" placeholder={match.tag_b} placeholderTextColor="#53606D" style={styles.scoreInput} />
          </View>
          <ResultSourceFields externalId={externalId} onExternalIdChange={setExternalId} onSourceChange={setSource} source={source} />
          {mode === 'correction' ? (
            <>
              <FieldLabel>Motif obligatoire</FieldLabel>
              <TextInput accessibilityLabel="Motif de la correction" value={correctionReason} onChangeText={setCorrectionReason} maxLength={240} multiline style={[styles.input, styles.reasonInput]} />
            </>
          ) : null}
          <ConfirmButton busy={busy} danger={mode === 'correction'} label={mode === 'correction' ? 'APPLIQUER LA CORRECTION' : 'FIGER LE RÉSULTAT'} onPress={settle} />
        </View>
      ) : null}
      {mode === 'reschedule' ? <View style={styles.inlinePanel}><Text style={styles.inlineTitle}>NOUVEAU COUP D’ENVOI</Text><TextInput accessibilityLabel="Nouvelle date et heure du match" value={newDate} onChangeText={setNewDate} autoCapitalize="none" style={styles.input} /><ConfirmButton busy={busy} label="CONFIRMER LE REPORT" onPress={() => { try { const iso = parseFutureDate(newDate); void run(() => rescheduleAdminMatch(match.id, iso)); } catch (caught) { setError(messageFrom(caught, 'Date invalide.')); } }} /></View> : null}
      {mode === 'cancel' ? <View style={styles.inlinePanel}><Text style={styles.inlineTitle}>MOTIF D’ANNULATION</Text><TextInput accessibilityLabel="Motif de l’annulation" value={reason} onChangeText={setReason} maxLength={120} style={styles.input} /><ConfirmButton busy={busy} danger label="ANNULER DÉFINITIVEMENT" onPress={() => void run(() => cancelAdminMatch(match.id, reason))} /></View> : null}
      {mode === 'history' ? <AuditTrail loading={historyLoading} operations={history} /> : null}
      {error ? <Text style={styles.formError}>{error}</Text> : null}
    </View>
  );
}

function ResultSourceFields({ externalId, onExternalIdChange, onSourceChange, source }: { externalId: string; onExternalIdChange: (value: string) => void; onSourceChange: (value: string) => void; source: string }) {
  return (
    <>
      <FieldLabel>Source officielle</FieldLabel>
      <ChoiceRail items={RESULT_SOURCES} selected={source} label={(item) => item.label} onSelect={(item) => onSourceChange(item.id)} />
      <FieldLabel>Référence externe</FieldLabel>
      <TextInput accessibilityLabel="Identifiant externe du résultat" value={externalId} onChangeText={onExternalIdChange} maxLength={180} autoCapitalize="none" autoCorrect={false} placeholder="Ex. match-893742/result-final" placeholderTextColor="#53606D" style={styles.input} />
      <Text style={styles.sourceHint}>La référence doit venir du fournisseur choisi et rend le rejeu idempotent.</Text>
    </>
  );
}

function ResultReceipt({ match }: { match: AdminMatch }) {
  return (
    <View style={styles.resultReceipt}>
      <View style={styles.resultReceiptTop}>
        <Text style={styles.resultReceiptLabel}>{match.resultat_revision > 1 ? `CORRIGÉ · RÉVISION ${match.resultat_revision}` : 'PROVENANCE DU RÉSULTAT'}</Text>
        <Text style={styles.resultReceiptScore}>{match.score_a}–{match.score_b}</Text>
      </View>
      <Text style={styles.resultReceiptSource}>{match.resultat_source_label ?? match.resultat_source ?? 'Source inconnue'}</Text>
      <Text numberOfLines={1} style={styles.resultReceiptReference}>RÉF. {match.resultat_identifiant_externe ?? 'absente'}</Text>
      {match.resultat_motif_correction ? <Text style={styles.resultReceiptReason}>{match.resultat_motif_correction}</Text> : null}
    </View>
  );
}

function AuditTrail({ loading, operations }: { loading: boolean; operations: AdminMatchAudit[] }) {
  if (loading) return <View style={styles.auditPanel}><Text style={styles.auditEmpty}>LECTURE DU JOURNAL…</Text></View>;
  return (
    <View style={styles.auditPanel}>
      <Text style={styles.inlineTitle}>JOURNAL IMMUABLE</Text>
      {operations.length ? operations.map((operation) => (
        <View key={operation.id} style={styles.auditRow}>
          <View style={styles.auditMarker} />
          <View style={styles.auditCopy}>
            <Text style={styles.auditAction}>{auditActionLabel(operation.action)} · V{operation.revision}</Text>
            <Text style={styles.auditMeta}>{formatDateTime(operation.cree_le)} · {operation.acteur_pseudo ?? 'SYSTÈME'}</Text>
            {operation.identifiant_externe ? <Text numberOfLines={1} style={styles.auditReference}>RÉF. {operation.identifiant_externe}</Text> : null}
            {operation.motif ? <Text style={styles.auditReason}>{operation.motif}</Text> : null}
          </View>
        </View>
      )) : <Text style={styles.auditEmpty}>AUCUNE OPÉRATION ENREGISTRÉE.</Text>}
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

function auditActionLabel(action: AdminMatchAudit['action']) {
  const labels: Record<AdminMatchAudit['action'], string> = {
    import_historique: 'IMPORT HISTORIQUE',
    demarrage: 'DÉMARRAGE',
    report: 'REPORT',
    annulation: 'ANNULATION',
    resultat_initial: 'RÉSULTAT INITIAL',
    correction_resultat: 'CORRECTION',
  };
  return labels[action];
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
  muted: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  deniedTitle: { ...typography.sectionTitle, color: colors.text },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { minHeight: 40, justifyContent: 'center', paddingRight: 12 },
  backText: { ...typography.action, color: colors.textMuted, letterSpacing: .5 },
  securePill: { minHeight: 30, paddingHorizontal: 11, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#414D1E' },
  secureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  secureText: { ...typography.label, color: colors.volt, letterSpacing: .5 },
  intro: { gap: 9 },
  eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.2 },
  title: { ...typography.displayMedium, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minHeight: 94, padding: 13, borderRadius: 20, justifyContent: 'space-between', backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  statAccent: { backgroundColor: '#0F171D', borderColor: '#294C64' },
  statWarning: { backgroundColor: '#1A130D', borderColor: '#5B3C20' },
  statValue: { ...typography.metric, color: colors.text },
  statLabel: { ...typography.label, color: colors.textMuted, letterSpacing: .3 },
  createCard: { overflow: 'hidden', borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#303A43' },
  createHeader: { minHeight: 88, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  createTitle: { ...typography.cardTitle, marginTop: 5, color: colors.text },
  createToggle: { color: colors.volt, fontSize: 27, fontWeight: '800' },
  form: { padding: 15, borderTopWidth: 1, borderTopColor: colors.border, gap: 9 },
  fieldLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .6 },
  choiceRail: { gap: 7, paddingRight: 12 },
  choice: { maxWidth: 220, minHeight: 42, paddingHorizontal: 11, borderRadius: 12, justifyContent: 'center', backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  choiceActive: { backgroundColor: '#171E12', borderColor: colors.volt },
  choiceText: { ...typography.label, color: colors.textMuted },
  choiceTextActive: { color: colors.text },
  inlineFields: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  inlineField: { flex: 1, gap: 7 },
  dateField: { flex: 1.7, gap: 7 },
  formatRow: { flexDirection: 'row', gap: 5 },
  formatButton: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  input: { ...typography.bodyStrong, minHeight: 46, paddingHorizontal: 12, borderRadius: 12, color: colors.text, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  formError: { ...typography.body, color: '#FF9AA3' },
  primaryButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  primaryButtonText: { ...typography.action, color: '#080B0F', letterSpacing: .4 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  sectionTitle: { ...typography.sectionTitle, marginTop: 4, color: colors.text },
  sectionCount: { ...typography.label, color: colors.textMuted },
  matchList: { gap: 11 },
  matchCard: { padding: 15, borderRadius: 23, gap: 9, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  matchCardLive: { borderColor: '#294C64', backgroundColor: '#0B1218' },
  matchCardTerminal: { borderColor: '#313A2C', backgroundColor: '#0A0F0D' },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  matchMeta: { flex: 1, minWidth: 0 },
  matchGame: { ...typography.eyebrow, color: colors.volt, letterSpacing: .4 },
  matchEvent: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  statusPill: { minHeight: 32, paddingHorizontal: 9, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#11161C', borderWidth: 1, borderColor: '#29323B' },
  statusPillLive: { backgroundColor: '#0E1A23', borderColor: '#2C5B7A' },
  statusPillTerminal: { backgroundColor: '#13180F', borderColor: '#3B4727' },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#77828E' },
  statusDotLive: { backgroundColor: '#56ADFF' },
  statusDotTerminal: { backgroundColor: colors.volt },
  statusText: { ...typography.label, color: colors.textMuted },
  statusTextLive: { color: '#56ADFF' },
  statusTextTerminal: { color: colors.volt },
  matchTeams: { ...typography.metric, color: colors.text },
  matchVs: { ...typography.body, color: colors.textMuted },
  matchNames: { ...typography.caption, color: colors.textMuted },
  matchDate: { ...typography.label, color: colors.text, letterSpacing: .3 },
  attention: { ...typography.label, color: '#FFB467', letterSpacing: .2 },
  resultReceipt: { padding: 11, borderRadius: 14, gap: 3, backgroundColor: '#0F150E', borderWidth: 1, borderColor: '#34421E' },
  resultReceiptTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultReceiptLabel: { ...typography.eyebrow, flex: 1, color: colors.volt, letterSpacing: .45 },
  resultReceiptScore: { ...typography.metricSmall, color: colors.text },
  resultReceiptSource: { ...typography.bodyStrong, color: colors.text },
  resultReceiptReference: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .2 },
  resultReceiptReason: { ...typography.caption, marginTop: 3, color: '#C3B39F' },
  cancelReceipt: { ...typography.caption, padding: 10, borderRadius: 12, color: '#D9A3A8', backgroundColor: '#171012', borderWidth: 1, borderColor: '#4A252B' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { minHeight: 40, paddingHorizontal: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#303A43' },
  actionPrimary: { backgroundColor: colors.volt, borderColor: colors.volt },
  actionDanger: { borderColor: '#5A2A31' },
  actionText: { ...typography.label, color: colors.textMuted, letterSpacing: .2 },
  actionTextPrimary: { color: '#080B0F' },
  actionTextDanger: { color: '#FF8E99' },
  inlinePanel: { padding: 12, borderRadius: 15, gap: 9, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  inlineTitle: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .5 },
  sourceHint: { ...typography.caption, color: colors.textSubtle },
  reasonInput: { minHeight: 78, paddingTop: 12, textAlignVertical: 'top' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreInput: { ...typography.metricSmall, flex: 1, minHeight: 52, borderRadius: 12, color: colors.text, textAlign: 'center', backgroundColor: '#0C1217', borderWidth: 1, borderColor: '#2B3741' },
  scoreDash: { ...typography.metricSmall, color: colors.textMuted },
  confirmButton: { minHeight: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  confirmDanger: { backgroundColor: '#2B1116', borderWidth: 1, borderColor: '#6A2E38' },
  confirmText: { ...typography.action, color: '#080B0F', letterSpacing: .3 },
  confirmTextDanger: { color: '#FF9AA3' },
  auditPanel: { padding: 12, borderRadius: 15, gap: 10, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#263039' },
  auditRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1D252C' },
  auditMarker: { width: 7, height: 7, marginTop: 4, borderRadius: 4, backgroundColor: colors.volt },
  auditCopy: { flex: 1, minWidth: 0 },
  auditAction: { ...typography.label, color: colors.text },
  auditMeta: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  auditReference: { ...typography.eyebrow, marginTop: 3, color: colors.textSubtle, letterSpacing: .2 },
  auditReason: { ...typography.caption, marginTop: 3, color: '#C3B39F' },
  auditEmpty: { ...typography.label, color: colors.textMuted },
  stateCard: { minHeight: 130, justifyContent: 'center', padding: 18, borderRadius: radius.lg, gap: 7, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  stateTitle: { ...typography.cardTitle, color: colors.text },
  stateCopy: { ...typography.body, color: colors.textMuted },
  stateAction: { ...typography.action, marginTop: 4, color: colors.volt },
  disabled: { opacity: .5 },
  pressed: { opacity: .82, transform: [{ scale: .99 }] },
});
