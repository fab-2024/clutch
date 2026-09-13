import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import GameLogo from '@/src/features/onboarding/components/GameLogo';
import type { GameId } from '@/src/features/onboarding/types';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, fonts, radius, spacing, typography } from '@/src/theme';

import type { ProfileData, RecentPrediction } from '../types';
import { PlayerIdentityCard } from '../identity/PlayerIdentityCard';

type TrendRange = '7j' | '30j' | 'season';

type ProfileStatsOverviewProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData;
  onOpenMatch: (item: RecentPrediction) => void;
  pseudo: string;
};

const GAME_ROWS: { accent: string; id: GameId; label: string }[] = [
  { accent: '#C9DC77', id: 'lol', label: 'League of Legends' },
  { accent: '#FF536C', id: 'valorant', label: 'Valorant' },
  { accent: '#48A8FF', id: 'rocket_league', label: 'Rocket League' },
];

const RANGE_LABELS: Record<TrendRange, string> = { '7j': '7 J', '30j': '30 J', season: 'SAISON' };

export default function ProfileStatsOverview({ cosmetics, data, onOpenMatch, pseudo }: ProfileStatsOverviewProps) {
  const [range, setRange] = useState<TrendRange>('season');
  const total = data.ranking.pronostics_regles;
  const wins = data.ranking.pronostics_gagnes;
  const accuracy = total ? Math.round((wins / total) * 100) : 0;
  const trend = useMemo(() => buildTrend(data.recent, data.ranking.frags, range), [data.ranking.frags, data.recent, range]);
  const mastery = useMemo(() => buildMastery(data.recent, data.bestGame), [data.bestGame, data.recent]);

  return (
    <View style={styles.content} testID="profile-stats-overview">
      <PlayerIdentityCard
        avatarId={data.avatarId}
        cosmetics={cosmetics}
        grade={data.ranking.grade}
        pseudo={data.pseudo || pseudo}
        season={data.ranking.saison_nom}
        team={data.favoriteTeam}
      />

      <View>
        <Text style={styles.sectionLabel}>APERÇU DE SAISON</Text>
        <View style={styles.summary}>
          <SummaryMetric label="RÉUSSITE" value={total ? `${accuracy} %` : '—'} />
          <View style={styles.summaryDivider} />
          <SummaryMetric label="CALLS RÉUSSIS" value={formatNumber(wins)} />
          <View style={styles.summaryDivider} />
          <SummaryMetric label="SÉRIE ACTUELLE" value={`${data.currentStreak}`} />
        </View>
      </View>

      <View>
        <View style={styles.sectionTop}>
          <Text style={styles.sectionLabel}>PROGRESSION DE SAISON</Text>
          <View accessibilityRole="tablist" style={styles.rangeTabs}>
            {(Object.keys(RANGE_LABELS) as TrendRange[]).map((item) => {
              const selected = item === range;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item}
                  onPress={() => setRange(item)}
                  style={[styles.rangeTab, selected && styles.rangeTabSelected]}
                >
                  <Text style={[styles.rangeTabText, selected && styles.rangeTabTextSelected]}>{RANGE_LABELS[item]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.chartPanel}>
          <View style={styles.chartHeadline}>
            <View>
              <Text style={styles.chartValue}>{formatNumber(data.ranking.frags)}</Text>
              <Text style={styles.chartUnit}>FRAGS</Text>
            </View>
            <Text style={styles.chartHint}>{trend.caption}</Text>
          </View>
          <SeasonChart points={trend.values} />
          <View style={styles.chartAxis}>
            <Text style={styles.chartAxisText}>{trend.startLabel}</Text>
            <Text style={styles.chartAxisText}>{trend.endLabel}</Text>
          </View>
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>DOMAINES MAÎTRISÉS</Text>
        <View style={styles.masteryPanel}>
          {GAME_ROWS.map((game) => {
            const stats = mastery[game.id];
            return (
              <View key={game.id} style={styles.masteryRow}>
                <View style={styles.gameIdentity}>
                  <GameLogo color={game.accent} game={game.id} size={19} />
                  <Text numberOfLines={1} style={styles.gameName}>{game.label}</Text>
                </View>
                <View style={styles.masteryTrack}>
                  <View style={[styles.masteryFill, { backgroundColor: game.accent, width: `${Math.max(stats.total ? 5 : 0, stats.accuracy)}%` }]} />
                </View>
                <Text style={styles.masteryValue}>{stats.total ? `${stats.accuracy} %` : '—'}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View>
        <View style={styles.sectionTop}>
          <Text style={styles.sectionLabel}>MES CALLS</Text>
          <Text style={styles.callsCount}>{data.recent.length} TERMINÉ{data.recent.length > 1 ? 'S' : ''}</Text>
        </View>
        {data.recent.length ? (
          <View style={styles.callsPanel}>
            {data.recent.slice(0, 5).map((item, index) => (
              <CallRow
                item={item}
                key={item.id}
                last={index === Math.min(data.recent.length, 5) - 1}
                onPress={() => onOpenMatch(item)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCalls}>
            <Text style={styles.emptyCallsTitle}>AUCUN CALL TERMINÉ</Text>
            <Text style={styles.emptyCallsText}>Tes prochains résultats apparaîtront ici.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryMetric}>
      <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.summaryValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SeasonChart({ points }: { points: number[] }) {
  const width = 320;
  const height = 112;
  const top = 10;
  const bottom = 9;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = Math.max(1, max - min);
  const chartPoints = points.map((value, index) => ({
    x: points.length === 1 ? width / 2 : (index / (points.length - 1)) * width,
    y: top + ((max - value) / spread) * (height - top - bottom),
  }));
  const line = chartPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${chartPoints.at(-1)?.x ?? width} ${height} L ${chartPoints[0]?.x ?? 0} ${height} Z`;
  const finalPoint = chartPoints.at(-1) ?? { x: width, y: height / 2 };

  return (
    <Svg accessibilityLabel="Courbe de progression des Frags" height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
      <Defs>
        <SvgGradient id="season-area" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={colors.volt} stopOpacity={0.34} />
          <Stop offset="1" stopColor={colors.volt} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {[28, 58, 88].map((y) => <Line key={y} stroke="#29404D" strokeOpacity={0.52} strokeWidth={1} x1={0} x2={width} y1={y} y2={y} />)}
      <Path d={area} fill="url(#season-area)" />
      <Path d={line} fill="none" stroke={colors.volt} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.7} />
      <Circle cx={finalPoint.x} cy={finalPoint.y} fill="#F3FF7A" r={4} stroke="#13202A" strokeWidth={2} />
    </Svg>
  );
}

function CallRow({ item, last, onPress }: { item: RecentPrediction; last: boolean; onPress: () => void }) {
  const won = item.statut === 'gagne';
  const selected = item.choix === 'a' ? item.tag_a : item.tag_b;
  const delta = Math.abs(Number(item.delta_frags ?? 0));
  return (
    <Pressable
      accessibilityLabel={`Voir le call ${item.tag_a} contre ${item.tag_b}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.callRow, !last && styles.callRowBorder, pressed && styles.pressed]}
    >
      <View style={[styles.callGameMark, { borderColor: gameAccent(item.jeu) }]}>
        <Text style={[styles.callGameText, { color: gameAccent(item.jeu) }]}>{gameShortName(item.jeu)}</Text>
      </View>
      <View style={styles.callCopy}>
        <Text numberOfLines={1} style={styles.callTeams}>{item.tag_a} <Text style={styles.callVs}>VS</Text> {item.tag_b}</Text>
        <Text numberOfLines={1} style={styles.callMeta}>{selected} · {item.evenement}</Text>
      </View>
      <View style={styles.callOutcome}>
        <View style={styles.callDelta}>
          <CurrencyIcon color={won ? colors.success : colors.danger} kind="frags" size={12} />
          <Text style={[styles.callDeltaText, { color: won ? colors.success : colors.danger }]}>{won ? '+' : '−'}{formatNumber(delta)}</Text>
        </View>
        <Text style={styles.callDate}>{formatCallDate(item.regle_le || item.cree_le)}</Text>
      </View>
      <Text style={styles.callArrow}>›</Text>
    </Pressable>
  );
}

function buildTrend(recent: RecentPrediction[], currentScore: number, range: TrendRange) {
  const now = Date.now();
  const days = range === '7j' ? 7 : range === '30j' ? 30 : null;
  const items = [...recent]
    .filter((item) => {
      if (!days) return true;
      const timestamp = new Date(item.regle_le || item.cree_le).getTime();
      return Number.isFinite(timestamp) && timestamp >= now - days * 86_400_000;
    })
    .sort((a, b) => new Date(a.regle_le || a.cree_le).getTime() - new Date(b.regle_le || b.cree_le).getTime());
  const deltas = items.map(signedDelta);
  let running = currentScore - deltas.reduce((sum, value) => sum + value, 0);
  const values = [running];
  deltas.forEach((delta) => { running += delta; values.push(running); });
  if (values.length === 1) values.push(currentScore);
  const firstDate = items[0]?.regle_le || items[0]?.cree_le;
  const lastDate = items.at(-1)?.regle_le || items.at(-1)?.cree_le;
  return {
    caption: items.length ? `${items.length} verdict${items.length > 1 ? 's' : ''}` : 'Aucun verdict sur la période',
    endLabel: lastDate ? formatAxisDate(lastDate) : 'AUJ.',
    startLabel: firstDate ? formatAxisDate(firstDate) : RANGE_LABELS[range],
    values,
  };
}

function buildMastery(recent: RecentPrediction[], bestGame: ProfileData['bestGame']) {
  const result = Object.fromEntries(GAME_ROWS.map(({ id }) => [id, { accuracy: 0, total: 0, wins: 0 }])) as Record<GameId, { accuracy: number; total: number; wins: number }>;
  recent.forEach((item) => {
    const game = toGameId(item.jeu);
    if (!game) return;
    result[game].total += 1;
    if (item.statut === 'gagne') result[game].wins += 1;
  });
  const bestGameId = bestGame ? toGameId(bestGame.jeu) : null;
  if (bestGameId && !result[bestGameId].total) {
    result[bestGameId] = {
      accuracy: Math.round(bestGame?.precision_pct ?? 0),
      total: Number(bestGame?.pronostics ?? 0),
      wins: Number(bestGame?.gagnes ?? 0),
    };
  }
  GAME_ROWS.forEach(({ id }) => {
    const row = result[id];
    if (row.total) row.accuracy = Math.round((row.wins / row.total) * 100);
  });
  return result;
}

function signedDelta(item: RecentPrediction) {
  const delta = Number(item.delta_frags ?? 0);
  return item.statut === 'perdu' && delta > 0 ? -delta : delta;
}

function toGameId(value: string): GameId | null {
  const game = String(value || '').toLowerCase();
  if (game.includes('rocket') || game === 'rl') return 'rocket_league';
  if (game.includes('league') || game === 'lol') return 'lol';
  if (game.includes('valorant') || game === 'valo') return 'valorant';
  return null;
}

function gameShortName(value: string) {
  const game = toGameId(value);
  if (game === 'lol') return 'L';
  if (game === 'valorant') return 'V';
  if (game === 'rocket_league') return 'RL';
  return 'G';
}

function gameAccent(value: string) {
  return GAME_ROWS.find((item) => item.id === toGameId(value))?.accent ?? colors.textMuted;
}

function formatCallDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TERMINÉ';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date).replace('.', '').toUpperCase();
}

function formatAxisDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date).replace('.', '').toUpperCase();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

const styles = StyleSheet.create({
  content: { marginHorizontal: spacing.md, gap: 20 },
  sectionLabel: { ...typography.eyebrow, color: colors.text, letterSpacing: 0.85 },
  sectionTop: { minHeight: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  summary: { minHeight: 82, marginTop: 7, paddingVertical: 12, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden', borderRadius: radius.md, backgroundColor: '#0B151D', borderWidth: 1, borderColor: '#214151' },
  summaryMetric: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  summaryValue: { fontFamily: fonts.display, fontSize: 25, lineHeight: 27, color: colors.text },
  summaryLabel: { ...typography.label, marginTop: 3, color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  summaryDivider: { width: 1, marginVertical: 4, backgroundColor: '#23404E' },
  rangeTabs: { padding: 2, flexDirection: 'row', borderRadius: 10, backgroundColor: '#0B151D', borderWidth: 1, borderColor: '#1E3947' },
  rangeTab: { minWidth: 42, minHeight: 25, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  rangeTabSelected: { backgroundColor: '#1C3442' },
  rangeTabText: { ...typography.label, color: colors.textMuted, fontSize: 9 },
  rangeTabTextSelected: { color: colors.text },
  chartPanel: { minHeight: 195, marginTop: 7, padding: 12, overflow: 'hidden', borderRadius: radius.md, backgroundColor: '#08141C', borderWidth: 1, borderColor: '#173849' },
  chartHeadline: { minHeight: 42, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  chartValue: { fontFamily: fonts.display, fontSize: 25, lineHeight: 25, color: colors.volt },
  chartUnit: { ...typography.eyebrow, marginTop: 1, color: colors.textMuted, fontSize: 9 },
  chartHint: { ...typography.caption, color: colors.textMuted },
  chartAxis: { marginTop: 1, flexDirection: 'row', justifyContent: 'space-between' },
  chartAxisText: { ...typography.label, color: colors.textMuted, fontSize: 9 },
  masteryPanel: { marginTop: 7, paddingHorizontal: 12, paddingVertical: 9, gap: 11, borderRadius: radius.md, backgroundColor: '#0B151D', borderWidth: 1, borderColor: '#1D3C4B' },
  masteryRow: { minHeight: 29, flexDirection: 'row', alignItems: 'center', gap: 9 },
  gameIdentity: { width: 130, flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameName: { ...typography.label, flex: 1, color: colors.text },
  masteryTrack: { flex: 1, height: 7, overflow: 'hidden', borderRadius: 99, backgroundColor: '#20303B' },
  masteryFill: { height: '100%', borderRadius: 99 },
  masteryValue: { ...typography.label, width: 39, color: colors.text, textAlign: 'right' },
  callsCount: { ...typography.label, color: colors.textMuted, fontSize: 9 },
  callsPanel: { marginTop: 7, overflow: 'hidden', borderRadius: radius.md, backgroundColor: '#0B151D', borderWidth: 1, borderColor: '#1D3C4B' },
  callRow: { minHeight: 70, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  callRowBorder: { borderBottomWidth: 1, borderBottomColor: '#173442' },
  callGameMark: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#071018', borderWidth: 1 },
  callGameText: { ...typography.action },
  callCopy: { flex: 1, minWidth: 0 },
  callTeams: { ...typography.bodyStrong, color: colors.text },
  callVs: { color: colors.textMuted, fontSize: 10 },
  callMeta: { ...typography.caption, marginTop: 2, color: colors.textMuted },
  callOutcome: { alignItems: 'flex-end' },
  callDelta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  callDeltaText: { ...typography.bodyStrong },
  callDate: { ...typography.label, marginTop: 2, color: colors.textMuted, fontSize: 8 },
  callArrow: { color: colors.textMuted, fontSize: 22, lineHeight: 24 },
  emptyCalls: { minHeight: 100, marginTop: 7, padding: 16, justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#0B151D', borderWidth: 1, borderColor: '#1D3C4B' },
  emptyCallsTitle: { ...typography.cardTitle, color: colors.text },
  emptyCallsText: { ...typography.body, marginTop: 4, color: colors.textMuted },
  pressed: { opacity: 0.72 },
});
