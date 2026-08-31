import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ExternalLink from 'lucide-react-native/icons/external-link';
import Lock from 'lucide-react-native/icons/lock';
import Share2 from 'lucide-react-native/icons/share-2';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';

import type { MatchJourneySnapshot } from '../matchJourney';
import type { ArenaMatch, MatchCenterData } from '../types';
import { gameLabel } from '../utils';
import { liveStyles as styles } from './LiveMatchCenter.styles';

type LiveMatchCenterProps = {
  compact: boolean;
  data: MatchCenterData;
  onBack: () => void;
  snapshot: MatchJourneySnapshot | null;
};

export function LiveMatchCenter({
  compact,
  data,
  onBack,
  snapshot,
}: LiveMatchCenterProps) {
  const { match } = data;
  const snapshotMatches = snapshot?.matchId === match.id;
  const accentA = snapshotMatches ? snapshot?.accentA ?? LEFT_FALLBACK : LEFT_FALLBACK;
  const accentB = snapshotMatches ? snapshot?.accentB ?? RIGHT_FALLBACK : RIGHT_FALLBACK;
  const logoA = snapshotMatches ? snapshot?.logoA : null;
  const logoB = snapshotMatches ? snapshot?.logoB : null;
  const percentages = communityPercentages(data);

  function shareMatch() {
    void Share.share({
      message: `${match.equipe_a} — ${match.equipe_b} est en direct dans le Match Center Clutch.`,
      title: `${match.tag_a} — ${match.tag_b} · Match Center`,
    }).catch(() => undefined);
  }

  return (
    <View style={styles.root} testID="live-match-center">
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Pressable
          accessibilityLabel="Retour"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}
        >
          <ArrowLeft color="#F7F9FC" size={21} strokeWidth={2.4} />
          <Text style={styles.backText}>RETOUR</Text>
        </Pressable>

        <Text numberOfLines={1} style={styles.headerTitle}>MATCH CENTER</Text>

        <Pressable
          accessibilityHint="Ouvre les options de partage du téléphone"
          accessibilityLabel="Partager ce match"
          accessibilityRole="button"
          hitSlop={8}
          onPress={shareMatch}
          style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
          testID="live-match-share"
        >
          <Share2 color="#F7F9FC" size={22} strokeWidth={2.1} />
        </Pressable>
      </View>

      <LinearGradient
        colors={[accentA, '#33404B', accentB]}
        end={{ x: 1, y: .5 }}
        start={{ x: 0, y: .5 }}
        style={styles.arenaFrame}
      >
        <View style={[styles.arena, compact && styles.arenaCompact]}>
          <LiveArenaBackdrop accentA={accentA} accentB={accentB} />

          <View style={styles.arenaMeta}>
            <Text numberOfLines={1} style={styles.arenaEvent}>
              {gameLabel(match.jeu)} · {match.evenement.toUpperCase()}
            </Text>
            <View style={styles.liveStatus}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.format}>BO{match.format}</Text>
          </View>

          <View style={[styles.matchStage, compact && styles.matchStageCompact]}>
            <LiveTeam
              accent={accentA}
              compact={compact}
              logo={logoA}
              name={match.equipe_a}
              side="left"
              tag={match.tag_a}
            />

            <View style={styles.scoreCenter}>
              <View style={styles.scoreRow}>
                <Text style={styles.score}>{safeScore(match.score_a)}</Text>
                <Text style={styles.scoreDash}>—</Text>
                <Text style={styles.score}>{safeScore(match.score_b)}</Text>
              </View>
              <Text style={styles.mapLabel}>MAP {currentMap(match)}</Text>
              <Text style={styles.liveClock}>{formatTime(match.debut)}</Text>
            </View>

            <LiveTeam
              accent={accentB}
              compact={compact}
              logo={logoB}
              name={match.equipe_b}
              side="right"
              tag={match.tag_b}
            />
          </View>

          <View style={styles.community}>
            <View style={styles.communityDivider} />
            <Text style={styles.communityTitle}>PRONOSTIC COMMUNAUTÉ</Text>
            <View style={styles.communityValues}>
              <Text style={styles.communityTag}>{match.tag_a} <Text style={{ color: accentA }}>{percentages.a}%</Text></Text>
              <Text style={styles.communityTag}><Text style={{ color: accentB }}>{percentages.b}%</Text> {match.tag_b}</Text>
            </View>
            <CommunityBar accentA={accentA} accentB={accentB} percentA={percentages.a} />
            <Text style={styles.projectionMeta}>{projectionMeta(data)}</Text>
          </View>
        </View>
      </LinearGradient>

      <LiveCompanion match={match} />
      <LiveContract data={data} />

      <View style={styles.closedNotice}>
        <View style={styles.noticeIcon}>
          <Lock color="#E6F000" size={24} strokeWidth={2} />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>LE MATCH A COMMENCÉ</Text>
          <Text style={styles.noticeText}>
            {data.prediction
              ? `Ton call ${data.prediction.choix === 'a' ? match.tag_a : match.tag_b} est verrouillé jusqu’au résultat.`
              : 'Aucun nouveau call classé n’est accepté.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function LiveArenaBackdrop({ accentA, accentB }: { accentA: string; accentB: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.decorativeBackdrop}>
      <LinearGradient
        colors={[withAlpha(accentA, .28), 'rgba(1,7,13,.93)', withAlpha(accentB, .24)]}
        end={{ x: 1, y: .52 }}
        start={{ x: 0, y: .48 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(1,4,8,.08)', 'rgba(1,5,10,.24)', 'rgba(1,4,8,.9)']}
        end={{ x: .5, y: 1 }}
        start={{ x: .5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.arenaBeam, styles.arenaBeamLeft, { backgroundColor: withAlpha(accentA, .13) }]} />
      <View style={[styles.arenaBeam, styles.arenaBeamRight, { backgroundColor: withAlpha(accentB, .13) }]} />
      <View style={styles.arenaSeam} />
    </View>
  );
}

function LiveTeam({
  accent,
  compact,
  logo,
  name,
  side,
  tag,
}: {
  accent: string;
  compact: boolean;
  logo: string | null;
  name: string;
  side: 'left' | 'right';
  tag: string;
}) {
  return (
    <View style={styles.team}>
      <View style={[
        styles.teamLogoFrame,
        compact && styles.teamLogoFrameCompact,
        { borderColor: accent, boxShadow: `0 0 18px ${withAlpha(accent, .2)}` },
      ]}>
        <LinearGradient
          colors={[withAlpha(accent, .12), 'rgba(3,9,14,.96)']}
          end={{ x: .5, y: 1 }}
          start={{ x: .5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <TeamLogo
          accent={accent}
          contentScale={.93}
          frameless
          name={name}
          size={compact ? 62 : 76}
          tag={tag}
          uri={logo}
        />
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.teamTag}>{tag}</Text>
      <Text numberOfLines={2} style={styles.teamName}>{name}</Text>
      <View style={[styles.teamUnderline, { backgroundColor: accent }, side === 'right' && styles.teamUnderlineRight]} />
    </View>
  );
}

function CommunityBar({
  accentA,
  accentB,
  percentA,
}: {
  accentA: string;
  accentB: string;
  percentA: number;
}) {
  const split = `${percentA}%` as const;
  return (
    <View
      accessibilityLabel={`Répartition de la communauté : ${percentA} pour cent contre ${100 - percentA} pour cent`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: percentA }}
      style={styles.communityBar}
    >
      <LinearGradient
        colors={[withAlpha(accentA, .74), accentA, '#CDEBFF']}
        end={{ x: 1, y: .5 }}
        start={{ x: 0, y: .5 }}
        style={[styles.communityBarLeft, { width: split }]}
      />
      <LinearGradient
        colors={['#FFF4A8', accentB, withAlpha(accentB, .74)]}
        end={{ x: 1, y: .5 }}
        start={{ x: 0, y: .5 }}
        style={[styles.communityBarRight, { left: split }]}
      />
      <View style={[styles.communityBarSeam, { left: split }]} />
      <View style={styles.communityBarGloss} />
    </View>
  );
}

function LiveCompanion({ match }: { match: ArenaMatch }) {
  const isKarmine = match.tag_a.toUpperCase() === 'KC'
    || match.tag_b.toUpperCase() === 'KC'
    || match.equipe_a.toLowerCase().includes('karmine')
    || match.equipe_b.toLowerCase().includes('karmine');
  const initials = isKarmine ? 'KA' : 'TV';
  const name = isKarmine ? 'KAMETO' : 'TWITCH';

  function watchLive() {
    void Linking.openURL('https://www.twitch.tv/').catch(() => undefined);
  }

  return (
    <LinearGradient
      colors={['#311062', '#6C1CB9', '#35105C']}
      end={{ x: 1, y: .5 }}
      start={{ x: 0, y: .5 }}
      style={styles.companionFrame}
    >
      <View style={styles.companionAvatar}>
        <Text style={styles.companionInitials}>{initials}</Text>
        <View style={styles.companionOnline} />
      </View>
      <View style={styles.companionCopy}>
        <Text style={styles.companionEyebrow}>EN DIRECT SUR TWITCH ◧</Text>
        <Text style={styles.companionName}>{name}</Text>
        <Text numberOfLines={2} style={styles.companionText}>Regarde le match avec sa communauté</Text>
      </View>
      <Pressable
        accessibilityHint="Ouvre Twitch dans le navigateur"
        accessibilityLabel={`Regarder le live de ${name}`}
        accessibilityRole="link"
        onPress={watchLive}
        style={({ pressed }) => [styles.watchButton, pressed && styles.pressed]}
      >
        <Text style={styles.watchButtonText}>REGARDER</Text>
        <ExternalLink color="#5E20BE" size={14} strokeWidth={2.4} />
      </Pressable>
    </LinearGradient>
  );
}

function LiveContract({ data }: { data: MatchCenterData }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const { callContext, match, prediction } = data;
  const chosenTag = prediction?.choix === 'a' ? match.tag_a : prediction?.choix === 'b' ? match.tag_b : null;

  return (
    <View style={styles.contract}>
      <Text style={styles.contractEyebrow}>CONTRAT DU CALL</Text>
      <Text style={styles.contractTitle}>{callContext.regle_resolution.libelle.toUpperCase()}</Text>
      <View style={styles.contractClosedPill}>
        <Lock color="#FF354C" size={15} strokeWidth={2.2} />
        <Text style={styles.contractClosedText}>PRONOSTICS FERMÉS</Text>
      </View>
      {chosenTag ? <Text style={styles.contractPrediction}>TON CALL · {chosenTag}</Text> : null}
      <View style={styles.contractTiming}>
        <CalendarDays color="#8A94A6" size={18} strokeWidth={1.9} />
        <Text style={styles.contractTimingText}>{formatClosedAt(callContext.ferme_le)}</Text>
      </View>
      <View style={styles.contractDivider} />
      <Pressable
        accessibilityLabel={rulesOpen ? 'Masquer les règles du call' : 'Voir les règles du call'}
        accessibilityRole="button"
        accessibilityState={{ expanded: rulesOpen }}
        onPress={() => setRulesOpen((current) => !current)}
        style={({ pressed }) => [styles.rulesButton, pressed && styles.pressed]}
        testID="live-match-rules"
      >
        <Text style={styles.rulesButtonText}>{rulesOpen ? 'MASQUER LES RÈGLES' : 'VOIR LES RÈGLES'}</Text>
        <ChevronRight
          color="#E6F000"
          size={18}
          strokeWidth={2.5}
          style={rulesOpen ? styles.rulesChevronOpen : undefined}
        />
      </Pressable>
      {rulesOpen ? <Text style={styles.rulesCopy}>{callContext.regle_resolution.detail}</Text> : null}
    </View>
  );
}

function communityPercentages(data: MatchCenterData) {
  const distribution = data.callContext.distribution;
  if (distribution && Number.isFinite(distribution.a_pct) && Number.isFinite(distribution.b_pct)) {
    const a = clampPercent(distribution.a_pct);
    return { a, b: 100 - a };
  }
  const choiceA = data.projection?.choix.find((choice) => choice.cle === 'a');
  const a = clampPercent((choiceA?.proba ?? .5) * 100);
  return { a, b: 100 - a };
}

function projectionMeta(data: MatchCenterData) {
  const projection = data.projection;
  if (!projection) return 'MODÈLE CLUTCH · PROBABILITÉS FIGÉES';
  const source = String(projection.source || 'MODÈLE CLUTCH').replaceAll('_', ' ').toUpperCase();
  const frozen = formatFrozenDate(projection.figee_le);
  const k = Number.isFinite(projection.k) ? ` · K=${projection.k}` : '';
  return `${source}${frozen}${k}`;
}

function formatFrozenDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return ` · FIGÉ ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase()}`;
}

function formatClosedAt(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'FERMÉ AU COUP D’ENVOI';
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).toUpperCase();
  return `FERMÉ LE ${day} À ${formatTime(value)}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '--:--';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function currentMap(match: ArenaMatch) {
  const played = safeScoreNumber(match.score_a) + safeScoreNumber(match.score_b);
  return Math.max(1, Math.min(Math.max(1, match.format), played + 1));
}

function safeScore(value: number | null) {
  return String(safeScoreNumber(value));
}

function safeScoreNumber(value: number | null) {
  const score = Number(value);
  return value != null && Number.isFinite(score) && score >= 0 ? Math.round(score) : 0;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function withAlpha(color: string, alpha: number) {
  const value = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${value}` : `rgba(255,255,255,${alpha})`;
}

const LEFT_FALLBACK = '#169CFF';
const RIGHT_FALLBACK = '#F4D800';
