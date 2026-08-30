import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import type { GameId } from '@/src/features/onboarding/types';
import { SupporterIdentity } from '@/src/features/shop/components/CosmeticRenderer';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, radius, typography } from '@/src/theme';

import { openMatchCenter, openMatchResult, warmMatchCenter, type MatchCenterTarget } from '../matchCenterNavigation';
import type { MyCallItem, MyCallsDashboard, MyCallState } from '../types';
import { gameLabel } from '../utils';

type GameFilter = 'followed' | GameId;

type Props = {
  dashboard: MyCallsDashboard;
  followedGames: string[];
  game: GameFilter;
  onPrepareMatch?: (match: MatchCenterTarget) => void;
  query: string;
};

const STATES: { id: MyCallState; label: string; key: keyof Pick<MyCallsDashboard, 'ouverts' | 'verrouilles' | 'reussis' | 'manques'> }[] = [
  { id: 'ouvert', label: 'OUVERTS', key: 'ouverts' },
  { id: 'verrouille', label: 'VERROUILLÉS', key: 'verrouilles' },
  { id: 'reussi', label: 'RÉUSSIS', key: 'reussis' },
  { id: 'manque', label: 'MANQUÉS', key: 'manques' },
];
const CALL_PAGE_SIZE = 8;
const INITIAL_VISIBLE: Record<MyCallState, number> = {
  ouvert: CALL_PAGE_SIZE,
  verrouille: CALL_PAGE_SIZE,
  reussi: CALL_PAGE_SIZE,
  manque: CALL_PAGE_SIZE,
};

export function MyCallsPanel({ dashboard, followedGames, game, onPrepareMatch, query }: Props) {
  const { profile, session } = useAuth();
  const { equipped } = useCosmetics();
  const initialState = dashboard.verrouilles.length
    ? 'verrouille'
    : dashboard.ouverts.length
      ? 'ouvert'
      : dashboard.reussis.length
        ? 'reussi'
        : 'manque';
  const [state, setState] = useState<MyCallState>(initialState);
  const [visibleByState, setVisibleByState] = useState(INITIAL_VISIBLE);
  const scoped = useMemo(() => Object.fromEntries(STATES.map((item) => [
    item.id,
    filterCalls(dashboard[item.key], game, followedGames, query),
  ])) as Record<MyCallState, MyCallItem[]>, [dashboard, followedGames, game, query]);
  const calls = scoped[state];
  const visibleCalls = calls.slice(0, visibleByState[state]);
  const hiddenCount = Math.max(0, calls.length - visibleCalls.length);
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';

  useEffect(() => {
    setVisibleByState(INITIAL_VISIBLE);
  }, [dashboard, followedGames, game, query]);

  return (
    <View style={styles.section}>
      <SupporterIdentity cosmetics={equipped} meta="SIGNATURE DU CALL" pseudo={pseudo} />

      <View accessibilityRole="tablist" style={styles.tabs}>
        {STATES.map((item, index) => {
          const active = state === item.id;
          return (
            <Pressable
              accessibilityLabel={`${item.label}, ${scoped[item.id].length}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.id}
              onPress={() => setState(item.id)}
              style={({ pressed }) => [styles.tab, index < STATES.length - 1 && styles.tabDivider, active && styles.tabActive, pressed && styles.pressed]}
            >
              <Text style={[styles.tabCount, active && styles.tabCountActive]}>{scoped[item.id].length}</Text>
              <Text numberOfLines={2} style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {calls.length ? (
        <View style={styles.list}>
          {visibleCalls.map((call) => <CallCard call={call} key={call.id} onPrepareMatch={onPrepareMatch} />)}
          {hiddenCount ? (
            <Pressable
              accessibilityLabel={`Afficher ${Math.min(CALL_PAGE_SIZE, hiddenCount)} calls supplémentaires`}
              accessibilityRole="button"
              onPress={() => setVisibleByState((current) => ({
                ...current,
                [state]: current[state] + CALL_PAGE_SIZE,
              }))}
              style={({ pressed }) => [styles.loadMore, pressed && styles.pressed]}
            >
              <Text style={styles.loadMoreText}>AFFICHER LA SUITE</Text>
              <Text style={styles.loadMoreMeta}>{visibleCalls.length}/{calls.length}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyEyebrow}>{stateLabel(state)}</Text>
          <Text style={styles.emptyTitle}>{emptyTitle(state)}</Text>
          <Text style={styles.emptyText}>Change de jeu ou choisis un autre état pour poursuivre.</Text>
        </View>
      )}
    </View>
  );
}

function CallCard({ call, onPrepareMatch }: { call: MyCallItem; onPrepareMatch?: (match: MatchCenterTarget) => void }) {
  const selectedTag = call.choix === 'a' ? call.tag_a : call.choix === 'b' ? call.tag_b : null;
  const resolved = call.etat === 'reussi' || call.etat === 'manque';
  const won = call.etat === 'reussi';
  const accent = call.etat === 'manque' ? colors.danger : call.etat === 'reussi' ? colors.success : colors.volt;
  const action = call.etat === 'ouvert'
    ? 'FAIRE MON CALL'
    : resolved
      ? 'REVOIR LE VERDICT'
      : 'OUVRIR LE MATCH CENTER';
  const matchTarget = {
    equipe_a: call.equipe_a,
    equipe_b: call.equipe_b,
    evenement: call.evenement,
    format: call.format,
    id: call.match_id,
    jeu: call.jeu,
    score_a: call.score_a,
    score_b: call.score_b,
    tag_a: call.tag_a,
    tag_b: call.tag_b,
  };
  const prepare = () => {
    if (resolved) return;
    if (onPrepareMatch) onPrepareMatch(matchTarget);
    else warmMatchCenter(matchTarget);
  };

  function open() {
    if (resolved) {
      openMatchResult(matchTarget, { source: 'calls' });
      return;
    }
    prepare();
    openMatchCenter(matchTarget, { source: 'calls' });
  }

  return (
    <Pressable
      accessibilityLabel={`${call.equipe_a} contre ${call.equipe_b}, ${stateLabel(call.etat)}`}
      accessibilityRole="button"
      onPress={open}
      onPressIn={prepare}
      style={({ pressed }) => [styles.card, { borderColor: `${accent}45` }, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.eventCopy}>
          <Text numberOfLines={2} style={styles.event}>{gameLabel(call.jeu).toUpperCase()} · {call.evenement}</Text>
          <Text style={styles.schedule}>{formatSchedule(call.debut)} · BO{call.format}</Text>
        </View>
        <View style={[styles.statePill, { borderColor: `${accent}66`, backgroundColor: `${accent}12` }]}>
          <View style={[styles.stateDot, { backgroundColor: accent }]} />
          <Text style={[styles.stateText, { color: accent }]}>{stateLabel(call.etat)}</Text>
        </View>
      </View>

      <View style={styles.duel}>
        <CallTeam accent="#20BDF2" name={call.equipe_a} selected={call.choix === 'a'} side="left" tag={call.tag_a} />
        <View style={styles.scoreBlock}>
          {resolved ? <Text style={styles.score}>{call.score_a ?? 0}–{call.score_b ?? 0}</Text> : <Text style={styles.vs}>VS</Text>}
          {selectedTag ? <Text style={[styles.selectedTag, { color: accent }]}>CALL · {selectedTag}</Text> : <Text style={styles.noChoice}>CHOIX LIBRE</Text>}
        </View>
        <CallTeam accent="#FF4E63" name={call.equipe_b} selected={call.choix === 'b'} side="right" tag={call.tag_b} />
      </View>

      <View style={styles.contract}>
        <ContractLine label="RÈGLE" value={`${call.regle_resolution.libelle} · BO${call.format}`} />
        <ContractLine label="PARTICIPANTS" value={`${call.participants} joueur${call.participants > 1 ? 's' : ''}`} />
        <ContractLine label={call.verrouille_le ? 'VERROUILLÉ' : 'FERMETURE'} value={formatMoment(call.verrouille_le ?? call.ferme_le)} />
      </View>

      {call.distribution ? <Distribution call={call} /> : (
        <View style={styles.hiddenDistribution}>
          <Text style={styles.hiddenDistributionGlyph}>◌</Text>
          <Text style={styles.hiddenDistributionText}>Répartition masquée jusqu’à la validation de ton choix.</Text>
        </View>
      )}

      {resolved ? (
        <View style={styles.verdict}>
          <View>
            <Text style={styles.verdictLabel}>{call.resultat_corrige ? `CORRIGÉ · RÉVISION ${call.revision_resultat}` : 'SOURCE DU VERDICT'}</Text>
            <Text style={styles.verdictSource}>{call.source_resultat_label ?? 'Validation GRIFF'}</Text>
            {call.identifiant_resultat_externe ? <Text numberOfLines={2} style={styles.verdictReference}>RÉF. {call.identifiant_resultat_externe}</Text> : null}
          </View>
          <View style={styles.deltaRow}>
            <CurrencyIcon color={won ? colors.success : colors.danger} kind="frags" size={13} />
            <Text style={[styles.delta, { color: won ? colors.success : colors.danger }]}>{signed(call.delta_frags ?? 0)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actionRow}><Text style={[styles.action, { color: accent }]}>{action}</Text><Text style={[styles.actionArrow, { color: accent }]}>→</Text></View>
    </Pressable>
  );
}

function CallTeam({ accent, name, selected, side, tag }: { accent: string; name: string; selected: boolean; side: 'left' | 'right'; tag: string }) {
  return (
    <LinearGradient
      colors={[`${accent}42`, '#07111A', `${accent}24`]}
      end={{ x: side === 'left' ? 1 : 0, y: .5 }}
      start={{ x: side === 'left' ? 0 : 1, y: .5 }}
      style={[styles.team, side === 'left' ? styles.teamLeft : styles.teamRight, { borderColor: selected ? colors.volt : `${accent}88` }]}
    >
      <View style={[styles.logoWrap, { borderColor: `${accent}B8`, backgroundColor: `${accent}14` }, selected && styles.logoWrapSelected]}><TeamLogo accent={accent} name={name} size={57} tag={tag} /></View>
      <Text numberOfLines={1} style={[styles.teamTag, selected && styles.teamTagSelected]}>{tag}</Text>
    </LinearGradient>
  );
}

function ContractLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.contractLine}><Text style={styles.contractLabel}>{label}</Text><Text numberOfLines={2} style={styles.contractValue}>{value}</Text></View>;
}

function Distribution({ call }: { call: MyCallItem }) {
  const distribution = call.distribution!;
  const width = `${Math.max(2, Math.min(98, distribution.a_pct))}%` as `${number}%`;
  return (
    <View style={styles.distribution}>
      <View style={styles.distributionTop}>
        <Text style={styles.distributionLabel}>RÉPARTITION APRÈS TON CALL</Text>
        <Text style={styles.distributionTotal}>{distribution.total} VALIDÉ{distribution.total > 1 ? 'S' : ''}</Text>
      </View>
      <View style={styles.distributionValues}>
        <Text style={styles.distributionA}>{call.tag_a} {Math.round(distribution.a_pct)}%</Text>
        <Text style={styles.distributionB}>{Math.round(distribution.b_pct)}% {call.tag_b}</Text>
      </View>
      <View style={styles.distributionTrack}><View style={[styles.distributionFill, { width }]} /></View>
    </View>
  );
}

function filterCalls(calls: MyCallItem[], game: GameFilter, followed: string[], query: string) {
  const normalized = query.trim().toLocaleLowerCase('fr-FR');
  return calls.filter((call) => {
    const key = gameId(call.jeu);
    const matchesGame = game === 'followed' ? !followed.length || (key ? followed.includes(key) : false) : key === game;
    if (!matchesGame) return false;
    if (!normalized) return true;
    return [call.equipe_a, call.tag_a, call.equipe_b, call.tag_b, call.evenement, call.jeu]
      .some((value) => value.toLocaleLowerCase('fr-FR').includes(normalized));
  });
}

function gameId(game: string): GameId | null {
  const value = game.toLowerCase();
  if (value.includes('rocket') || value === 'rl') return 'rocket_league';
  if (value.includes('lol') || value.includes('league')) return 'lol';
  if (value.includes('valorant')) return 'valorant';
  return null;
}

function stateLabel(state: MyCallState) {
  if (state === 'ouvert') return 'OUVERT';
  if (state === 'verrouille') return 'VERROUILLÉ';
  if (state === 'reussi') return 'RÉUSSI';
  return 'MANQUÉ';
}

function emptyTitle(state: MyCallState) {
  if (state === 'ouvert') return 'AUCUN MATCH OUVERT ICI.';
  if (state === 'verrouille') return 'AUCUN CALL EN ATTENTE.';
  if (state === 'reussi') return 'AUCUN VERDICT RÉUSSI.';
  return 'AUCUN CALL MANQUÉ.';
}

function formatSchedule(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '').toUpperCase();
}

function formatMoment(value: string) {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '').toUpperCase();
}

function signed(value: number) {
  const amount = Math.round(Number(value) || 0);
  return `${amount >= 0 ? '+' : '−'}${Math.abs(amount)}`;
}

const styles = StyleSheet.create({
  section: { marginHorizontal: 14, gap: 14 },
  tabs: { minHeight: 78, overflow: 'hidden', borderRadius: 20, flexDirection: 'row', backgroundColor: '#07111A', borderWidth: 1, borderColor: '#154760' },
  tab: { flex: 1, minWidth: 0, minHeight: 76, paddingHorizontal: 2, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  tabDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#1B526D' },
  tabActive: { margin: 7, minHeight: 62, borderRadius: 16, backgroundColor: colors.volt, borderWidth: 1, borderColor: '#F1FF48', boxShadow: '0 0 18px rgba(220,255,36,.48)' },
  tabCount: { color: '#7EC3E5', fontFamily: fonts.display, fontSize: 20, fontVariant: ['tabular-nums'] },
  tabCountActive: { color: '#080B0D' },
  tabLabel: { ...typography.label, marginTop: 3, color: '#77B3D0', textAlign: 'center', letterSpacing: .35 },
  tabLabelActive: { color: '#080B0D' },
  list: { gap: 11 },
  loadMore: { minHeight: 50, paddingHorizontal: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#303A43' },
  loadMoreText: { ...typography.action, color: colors.volt, letterSpacing: .35 },
  loadMoreMeta: { ...typography.label, color: colors.textMuted },
  card: { overflow: 'hidden', padding: 14, borderRadius: 22, gap: 15, backgroundColor: '#06131E', borderWidth: 1 },
  cardTop: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eventCopy: { flex: 1, minWidth: 0 },
  event: { ...typography.bodyStrong, color: colors.text, letterSpacing: .15 },
  schedule: { ...typography.label, marginTop: 5, color: '#78C9F2', letterSpacing: .3 },
  statePill: { minHeight: 32, paddingHorizontal: 11, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1 },
  stateDot: { width: 7, height: 7, borderRadius: 4 },
  stateText: { ...typography.action, letterSpacing: .45 },
  duel: { minHeight: 164, overflow: 'hidden', borderRadius: 18, flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#061019', borderWidth: 1, borderColor: '#22516A' },
  team: { flex: 1, minWidth: 0, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1 },
  teamLeft: { borderTopLeftRadius: 17, borderBottomLeftRadius: 17, borderRightWidth: 0 },
  teamRight: { borderTopRightRadius: 17, borderBottomRightRadius: 17, borderLeftWidth: 0 },
  logoWrap: { width: 74, height: 74, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  logoWrapSelected: { borderColor: colors.volt, backgroundColor: '#18210D', boxShadow: '0 0 14px rgba(220,255,36,.25)' },
  teamTag: { color: '#F6F8F9', fontFamily: fonts.display, fontSize: 20 },
  teamTagSelected: { color: colors.text },
  scoreBlock: { width: 80, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#071019', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1D394A', zIndex: 2 },
  vs: { color: '#F4F6F7', fontFamily: fonts.display, fontSize: 26 },
  score: { color: colors.text, fontFamily: fonts.display, fontSize: 25, fontVariant: ['tabular-nums'] },
  selectedTag: { ...typography.label, textAlign: 'center', letterSpacing: .35 },
  noChoice: { ...typography.label, color: colors.textMuted, letterSpacing: .35 },
  contract: { overflow: 'hidden', borderRadius: 16, backgroundColor: '#071724', borderWidth: 1, borderColor: '#1C4A63' },
  contractLine: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1C4A63' },
  contractLabel: { ...typography.label, color: '#7CC4E6', letterSpacing: .45 },
  contractValue: { ...typography.caption, flex: 1, color: colors.text, textAlign: 'right' },
  hiddenDistribution: { minHeight: 52, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#1D4054' },
  hiddenDistributionGlyph: { color: '#76B8D6', fontSize: 17 },
  hiddenDistributionText: { ...typography.caption, flex: 1, color: '#79A9C0' },
  distribution: { paddingHorizontal: 7, paddingVertical: 14, gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#1D4054' },
  distributionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  distributionLabel: { ...typography.label, color: colors.volt, letterSpacing: .35 },
  distributionTotal: { ...typography.label, color: '#7BB9D7' },
  distributionValues: { flexDirection: 'row', justifyContent: 'space-between' },
  distributionA: { ...typography.bodyStrong, color: '#65B7FF' },
  distributionB: { ...typography.bodyStrong, color: '#FF6C7C' },
  distributionTrack: { height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: '#FF4E63' },
  distributionFill: { height: '100%', backgroundColor: '#20BDF2' },
  verdict: { minHeight: 52, padding: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#080C10', borderWidth: 1, borderColor: '#202932' },
  verdictLabel: { ...typography.label, color: colors.textMuted, letterSpacing: .35 },
  verdictSource: { ...typography.caption, marginTop: 3, color: colors.text },
  verdictReference: { ...typography.eyebrow, maxWidth: 215, marginTop: 3, color: colors.textSubtle, letterSpacing: .25 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  delta: { ...typography.bodyStrong },
  actionRow: { minHeight: 48, paddingHorizontal: 7, paddingTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1D4054' },
  action: { ...typography.action, letterSpacing: .4 },
  actionArrow: { fontSize: 24, fontWeight: '900' },
  empty: { minHeight: 160, justifyContent: 'center', padding: 18, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  emptyTitle: { ...typography.cardTitle, marginTop: 6, color: colors.text },
  emptyText: { ...typography.body, marginTop: 6, color: colors.textMuted },
  pressed: { opacity: .76 },
});
