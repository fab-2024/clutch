import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import type { GameId } from '@/src/features/onboarding/types';
import { SupporterIdentity } from '@/src/features/shop/components/CosmeticRenderer';
import { useAuth } from '@/src/providers/AuthProvider';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, fonts, radius, typography } from '@/src/theme';

import type { MyCallItem, MyCallsDashboard, MyCallState } from '../types';
import { gameLabel } from '../utils';

type GameFilter = 'followed' | GameId;

type Props = {
  dashboard: MyCallsDashboard;
  followedGames: string[];
  game: GameFilter;
  query: string;
};

const STATES: { id: MyCallState; label: string; key: keyof Pick<MyCallsDashboard, 'ouverts' | 'verrouilles' | 'reussis' | 'manques'> }[] = [
  { id: 'ouvert', label: 'OUVERTS', key: 'ouverts' },
  { id: 'verrouille', label: 'VERROUILLÉS', key: 'verrouilles' },
  { id: 'reussi', label: 'RÉUSSIS', key: 'reussis' },
  { id: 'manque', label: 'MANQUÉS', key: 'manques' },
];

export function MyCallsPanel({ dashboard, followedGames, game, query }: Props) {
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
  const scoped = useMemo(() => Object.fromEntries(STATES.map((item) => [
    item.id,
    filterCalls(dashboard[item.key], game, followedGames, query),
  ])) as Record<MyCallState, MyCallItem[]>, [dashboard, followedGames, game, query]);
  const calls = scoped[state];
  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'Supporter';

  return (
    <View style={styles.section}>
      <View style={styles.explainer}>
        <View style={styles.explainerMark}><Text style={styles.explainerGlyph}>✓</Text></View>
        <View style={styles.explainerCopy}>
          <Text style={styles.explainerEyebrow}>TRANSPARENCE DU CALL</Text>
          <Text style={styles.explainerTitle}>Règle avant. Répartition après.</Text>
          <Text style={styles.explainerText}>Le verrouillage est définitif. La tendance des joueurs n’apparaît qu’une fois ton choix validé.</Text>
        </View>
      </View>

      <SupporterIdentity compact cosmetics={equipped} meta="SIGNATURE DU CALL" pseudo={pseudo} />

      <View style={styles.tabs}>
        {STATES.map((item) => {
          const active = state === item.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={item.id}
              onPress={() => setState(item.id)}
              style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
            >
              <Text style={[styles.tabCount, active && styles.tabCountActive]}>{scoped[item.id].length}</Text>
              <Text numberOfLines={1} style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {calls.length ? (
        <View style={styles.list}>
          {calls.map((call) => <CallCard call={call} key={call.id} />)}
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

function CallCard({ call }: { call: MyCallItem }) {
  const selectedTag = call.choix === 'a' ? call.tag_a : call.choix === 'b' ? call.tag_b : null;
  const resolved = call.etat === 'reussi' || call.etat === 'manque';
  const won = call.etat === 'reussi';
  const accent = call.etat === 'manque' ? colors.danger : call.etat === 'reussi' ? colors.success : colors.volt;
  const action = call.etat === 'ouvert'
    ? 'FAIRE MON CALL'
    : resolved
      ? 'REVOIR LE VERDICT'
      : 'OUVRIR LE MATCH CENTER';

  function open() {
    if (resolved) {
      router.push({ pathname: '/result/[id]', params: { id: call.match_id } });
      return;
    }
    router.push({ pathname: '/match/[id]', params: { id: call.match_id } });
  }

  return (
    <Pressable
      accessibilityLabel={`${call.equipe_a} contre ${call.equipe_b}, ${stateLabel(call.etat)}`}
      accessibilityRole="button"
      onPress={open}
      style={({ pressed }) => [styles.card, { borderColor: `${accent}45` }, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.eventCopy}>
          <Text numberOfLines={1} style={styles.event}>{gameLabel(call.jeu).toUpperCase()} · {call.evenement}</Text>
          <Text style={styles.schedule}>{formatSchedule(call.debut)} · BO{call.format}</Text>
        </View>
        <View style={[styles.statePill, { borderColor: `${accent}66`, backgroundColor: `${accent}12` }]}>
          <View style={[styles.stateDot, { backgroundColor: accent }]} />
          <Text style={[styles.stateText, { color: accent }]}>{stateLabel(call.etat)}</Text>
        </View>
      </View>

      <View style={styles.duel}>
        <CallTeam accent="#65B7FF" name={call.equipe_a} selected={call.choix === 'a'} tag={call.tag_a} />
        <View style={styles.scoreBlock}>
          {resolved ? <Text style={styles.score}>{call.score_a ?? 0}–{call.score_b ?? 0}</Text> : <Text style={styles.vs}>VS</Text>}
          {selectedTag ? <Text style={[styles.selectedTag, { color: accent }]}>CALL · {selectedTag}</Text> : <Text style={styles.noChoice}>CHOIX LIBRE</Text>}
        </View>
        <CallTeam accent="#FF6C7C" name={call.equipe_b} selected={call.choix === 'b'} tag={call.tag_b} />
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
            <Text style={styles.verdictSource}>{call.source_resultat_label ?? 'Validation Clutch'}</Text>
            {call.identifiant_resultat_externe ? <Text numberOfLines={1} style={styles.verdictReference}>RÉF. {call.identifiant_resultat_externe}</Text> : null}
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

function CallTeam({ accent, name, selected, tag }: { accent: string; name: string; selected: boolean; tag: string }) {
  return (
    <View style={styles.team}>
      <View style={[styles.logoWrap, selected && styles.logoWrapSelected]}><TeamLogo accent={accent} name={name} size={45} tag={tag} /></View>
      <Text numberOfLines={1} style={[styles.teamTag, selected && styles.teamTagSelected]}>{tag}</Text>
    </View>
  );
}

function ContractLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.contractLine}><Text style={styles.contractLabel}>{label}</Text><Text numberOfLines={1} style={styles.contractValue}>{value}</Text></View>;
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
  if (value.includes('lol') || value.includes('league')) return 'lol';
  if (value.includes('valorant')) return 'valorant';
  if (value.includes('cs')) return 'cs2';
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
  section: { marginHorizontal: 14, gap: 12 },
  explainer: { minHeight: 116, padding: 14, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#10160E', borderWidth: 1, borderColor: '#414D1E' },
  explainerMark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  explainerGlyph: { color: '#080B0D', fontFamily: fonts.bold, fontSize: 20 },
  explainerCopy: { flex: 1, minWidth: 0 },
  explainerEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .7 },
  explainerTitle: { ...typography.cardTitle, marginTop: 4, color: colors.text },
  explainerText: { ...typography.caption, marginTop: 5, color: colors.textMuted },
  tabs: { minHeight: 66, padding: 5, borderRadius: 20, flexDirection: 'row', gap: 4, backgroundColor: '#090D11', borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, minWidth: 0, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#1A2113', borderWidth: 1, borderColor: '#48551F' },
  tabCount: { ...typography.bodyStrong, color: '#66717C' },
  tabCountActive: { color: colors.volt },
  tabLabel: { ...typography.label, marginTop: 2, color: '#66717C', fontSize: 9 },
  tabLabelActive: { color: colors.text },
  list: { gap: 11 },
  card: { overflow: 'hidden', padding: 14, borderRadius: 25, gap: 13, backgroundColor: '#0B1015', borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eventCopy: { flex: 1, minWidth: 0 },
  event: { ...typography.eyebrow, color: colors.text, letterSpacing: .45 },
  schedule: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  statePill: { minHeight: 27, paddingHorizontal: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 },
  stateDot: { width: 5, height: 5, borderRadius: 3 },
  stateText: { ...typography.label, letterSpacing: .35 },
  duel: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  team: { width: 78, alignItems: 'center', gap: 5 },
  logoWrap: { width: 51, height: 51, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  logoWrapSelected: { borderColor: colors.volt, backgroundColor: '#161D0F' },
  teamTag: { ...typography.bodyStrong, color: colors.textMuted },
  teamTagSelected: { color: colors.text },
  scoreBlock: { flex: 1, alignItems: 'center', gap: 4 },
  vs: { color: '#65717C', fontFamily: fonts.display, fontSize: 18 },
  score: { color: colors.text, fontFamily: fonts.display, fontSize: 27, fontVariant: ['tabular-nums'] },
  selectedTag: { ...typography.label, letterSpacing: .35 },
  noChoice: { ...typography.label, color: '#65717C', letterSpacing: .35 },
  contract: { overflow: 'hidden', borderRadius: 16, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#202932' },
  contractLine: { minHeight: 38, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#232C34' },
  contractLabel: { ...typography.label, color: '#68747F', letterSpacing: .4 },
  contractValue: { ...typography.caption, flex: 1, color: colors.text, textAlign: 'right' },
  hiddenDistribution: { minHeight: 45, paddingHorizontal: 11, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#252E37' },
  hiddenDistributionGlyph: { color: '#75818C', fontSize: 17 },
  hiddenDistributionText: { ...typography.caption, flex: 1, color: colors.textMuted },
  distribution: { padding: 11, borderRadius: 16, gap: 7, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#29333C' },
  distributionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  distributionLabel: { ...typography.label, color: colors.volt, letterSpacing: .35 },
  distributionTotal: { ...typography.label, color: '#71808B' },
  distributionValues: { flexDirection: 'row', justifyContent: 'space-between' },
  distributionA: { ...typography.bodyStrong, color: '#65B7FF' },
  distributionB: { ...typography.bodyStrong, color: '#FF6C7C' },
  distributionTrack: { height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: '#FF6C7C' },
  distributionFill: { height: '100%', backgroundColor: '#65B7FF' },
  verdict: { minHeight: 52, padding: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#080C10', borderWidth: 1, borderColor: '#202932' },
  verdictLabel: { ...typography.label, color: colors.textMuted, letterSpacing: .35 },
  verdictSource: { ...typography.caption, marginTop: 3, color: colors.text },
  verdictReference: { ...typography.eyebrow, maxWidth: 215, marginTop: 3, color: colors.textSubtle, letterSpacing: .25 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  delta: { ...typography.bodyStrong },
  actionRow: { minHeight: 30, paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#202932' },
  action: { ...typography.action, letterSpacing: .4 },
  actionArrow: { fontSize: 15, fontWeight: '900' },
  empty: { minHeight: 160, justifyContent: 'center', padding: 18, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .6 },
  emptyTitle: { ...typography.cardTitle, marginTop: 6, color: colors.text },
  emptyText: { ...typography.body, marginTop: 6, color: colors.textMuted },
  pressed: { opacity: .76 },
});
