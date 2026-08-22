import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';

import type { ArenaMatch, MatchCenterData, MatchProjection, ProjectionChoice } from '../types';
import { gameLabel, matchPhase } from '../utils';
import { styles } from './MatchCenterScreen.styles';

export function PredictionZone({
  data,
  open,
  selected,
  onSelect,
}: {
  data: MatchCenterData;
  open: boolean;
  selected: 'a' | 'b' | null;
  onSelect: (choice: 'a' | 'b') => void;
}) {
  const { match, projection } = data;

  if (match.statut === 'termine') {
    return <ClosedState eyebrow="VERDICT" title="Le match est terminé." copy="Le résultat est figé. Ton historique conserve le delta Frags associé." />;
  }
  if (match.statut === 'annule') {
    return <ClosedState eyebrow="MATCH ANNULÉ" title="Cette affiche ne sera pas jouée." copy="Le pronostic éventuel est annulé sans modifier ton rating." />;
  }
  if (!open) {
    return <ClosedState eyebrow="PRONOSTICS FERMÉS" title="Le match a commencé." copy="Après le coup d’envoi, aucun nouveau pronostic classé n’est accepté." />;
  }
  if (!projection?.choix?.length) {
    return <ClosedState eyebrow="MODÈLE" title="Le risque arrive bientôt." copy="Le snapshot de probabilité n’est pas encore disponible pour cette affiche." />;
  }

  const a = projection.choix.find((choice) => choice.cle === 'a');
  const b = projection.choix.find((choice) => choice.cle === 'b');

  return (
    <View style={styles.market}>
      <Text style={styles.marketEyebrow}>PRONOSTIC CLASSÉ</Text>
      <Text style={styles.marketTitle}>Qui remporte le match ?</Text>
      <Text style={styles.marketCopy}>Choisis un camp. Tu vois le risque exact avant de verrouiller.</Text>
      <View style={styles.choiceGrid}>
        {a ? <ChoiceCard choice="a" team={match.equipe_a} tag={match.tag_a} projection={a} selected={selected === 'a'} onPress={() => onSelect('a')} /> : null}
        {b ? <ChoiceCard choice="b" team={match.equipe_b} tag={match.tag_b} projection={b} selected={selected === 'b'} onPress={() => onSelect('b')} /> : null}
      </View>
    </View>
  );
}

function ChoiceCard({
  choice,
  team,
  tag,
  projection,
  selected,
  onPress,
}: {
  choice: 'a' | 'b';
  team: string;
  tag: string;
  projection: ProjectionChoice;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Choisir ${team}, ${Math.round(Number(projection.proba) * 100)} pour cent, gain ${Math.abs(projection.gain)} Frags, perte ${Math.abs(projection.perte)} Frags`}
      accessibilityHint={`Camp ${choice.toUpperCase()}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}
    >
      <View style={[styles.choiceMark, selected && styles.choiceMarkSelected]}>
        <Text style={[styles.choiceTag, selected && styles.choiceTagSelected]}>{tag}</Text>
      </View>
      <Text numberOfLines={2} style={styles.choiceTeam}>{team}</Text>
      <Text style={styles.choiceProbability}>{Math.round(Number(projection.proba) * 100)}%</Text>
      <View style={styles.choiceRisk}>
        <Text style={styles.choiceGain}>+{Math.abs(projection.gain)}</Text>
        <Text style={styles.choiceSlash}>/</Text>
        <Text style={styles.choiceLoss}>−{Math.abs(projection.perte)}</Text>
        <CurrencyIcon kind="frags" size={12} />
        <Text style={styles.choiceFrags}> FRAGS</Text>
      </View>
    </Pressable>
  );
}

export function LockedPrediction({ data }: { data: MatchCenterData }) {
  const { match, prediction } = data;
  if (!prediction) return null;
  const team = prediction.choix === 'a' ? match.equipe_a : match.equipe_b;
  const tag = prediction.choix === 'a' ? match.tag_a : match.tag_b;
  const settled = prediction.statut === 'gagne' || prediction.statut === 'perdu';
  const cancelled = prediction.statut === 'annule';
  const won = prediction.statut === 'gagne';
  const lost = prediction.statut === 'perdu';
  const resolved = settled || cancelled;
  const delta = Math.abs(Number(prediction.delta_frags ?? 0));
  const eyebrow = won
    ? 'CALL VALIDÉ'
    : lost
      ? 'CALL MANQUÉ'
      : cancelled
        ? 'CALL ANNULÉ'
        : 'TON CHOIX EST VERROUILLÉ';
  const outcomeCopy = cancelled
    ? 'Le match a été annulé : ton rating Frags reste inchangé.'
    : settled
      ? 'Ton rating de saison a été mis à jour et ce verdict rejoint maintenant ton historique.'
      : 'Après le résultat, Clutch tranche le call puis applique automatiquement le delta à ton rating.';

  return (
    <View style={[styles.lockedCard, won && styles.lockedCardWin, lost && styles.lockedCardLoss]}>
      <View style={styles.lockedHeader}>
        <View>
          <Text style={[styles.lockedEyebrow, lost && styles.lockedEyebrowLoss]}>{eyebrow}</Text>
          <Text style={styles.lockedTeam}>{team}</Text>
        </View>
        <View style={styles.lockedBadge}><Text style={styles.lockedBadgeText}>{tag}</Text></View>
      </View>
      <View style={styles.lockedMeta}>
        <Text style={styles.lockedModel}>{Math.round(Number(prediction.proba_figee) * 100)}% modèle</Text>
        <Text style={styles.lockedDot}>·</Text>
        <Text style={styles.lockedModel}>K={prediction.k_frags}</Text>
      </View>
      <View style={styles.verdictLine}>
        <Text style={styles.verdictLabel}>{settled ? 'VERDICT' : 'STATUT'}</Text>
        <Text style={[
          styles.verdictValue,
          won && styles.verdictWin,
          lost && styles.verdictLoss,
        ]}>
          {won
            ? `+${delta} FRAGS`
            : lost
              ? `−${delta} FRAGS`
              : cancelled
                ? 'PRONOSTIC ANNULÉ'
                : 'EN ATTENTE DU RÉSULTAT'}
        </Text>
      </View>
      <Text style={styles.lockedOutcomeCopy}>{outcomeCopy}</Text>

      <View style={styles.callTimeline}>
        <TimelineStep complete label="CALL" meta="VERROUILLÉ" />
        <Text style={styles.timelineArrow}>→</Text>
        <TimelineStep complete={resolved} label="VERDICT" meta={cancelled ? 'ANNULÉ' : settled ? 'TERMINÉ' : 'À VENIR'} />
        <Text style={styles.timelineArrow}>→</Text>
        <TimelineStep complete={settled} label="RATING" meta={cancelled ? 'INCHANGÉ' : settled ? 'MIS À JOUR' : 'APRÈS MATCH'} />
      </View>

      <View style={styles.lockedActions}>
        {settled ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/result/[id]', params: { id: match.id } })} style={({ pressed }) => [styles.lockedPrimaryAction, pressed && styles.confirmPressed]}>
            <Text style={styles.lockedPrimaryText}>REVOIR LE VERDICT</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/(tabs)/matches', params: { view: 'calls' } })}
          style={({ pressed }) => [settled ? styles.lockedSecondaryAction : styles.lockedPrimaryAction, pressed && styles.confirmPressed]}
        >
          <Text style={settled ? styles.lockedSecondaryText : styles.lockedPrimaryText}>{settled ? 'PROCHAIN CALL' : 'SUIVRE DANS MES CALLS'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TimelineStep({ complete, label, meta }: { complete: boolean; label: string; meta: string }) {
  return (
    <View style={styles.timelineStep}>
      <View style={[styles.timelineDot, complete && styles.timelineDotComplete]}><Text style={[styles.timelineDotText, complete && styles.timelineDotTextComplete]}>{complete ? '✓' : '·'}</Text></View>
      <Text style={[styles.timelineLabel, complete && styles.timelineLabelComplete]}>{label}</Text>
      <Text numberOfLines={1} style={styles.timelineMeta}>{meta}</Text>
    </View>
  );
}

export function HeroTeam({
  tag,
  name,
  probability,
  score,
  winner,
}: {
  tag: string;
  name: string;
  probability?: number;
  score: number | null;
  winner: boolean;
}) {
  return (
    <View style={styles.heroTeam}>
      <View style={[styles.heroTeamMark, winner && styles.heroTeamWinner]}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.heroTeamTag, winner && styles.winnerText]}>{tag}</Text>
      </View>
      <Text numberOfLines={2} style={styles.heroTeamName}>{name}</Text>
      {score !== null ? <Text style={[styles.heroScore, winner && styles.winnerText]}>{score}</Text> : null}
      {score === null && probability !== undefined ? <Text style={styles.heroProbability}>{Math.round(Number(probability) * 100)}%</Text> : null}
    </View>
  );
}

export function ProbabilityBar({ a, b, tagA, tagB }: { a: ProjectionChoice; b: ProjectionChoice; tagA: string; tagB: string }) {
  const width = `${Math.max(4, Math.min(96, Math.round(Number(a.proba) * 100)))}%` as `${number}%`;
  return (
    <View style={styles.probabilityWrap}>
      <View style={styles.probabilityLabels}>
        <Text style={styles.probabilityText}>{tagA} <Text style={styles.probabilityStrong}>{Math.round(Number(a.proba) * 100)}%</Text></Text>
        <Text style={styles.probabilityText}><Text style={styles.probabilityStrong}>{Math.round(Number(b.proba) * 100)}%</Text> {tagB}</Text>
      </View>
      <View style={styles.probabilityTrack}><View style={[styles.probabilityFill, { width }]} /></View>
    </View>
  );
}

export function ProjectionMeta({ projection }: { projection: MatchProjection }) {
  const source = String(projection.source || 'modèle').replace(/_/g, ' ').toUpperCase();
  const frozenAt = projection.figee_le
    ? new Date(projection.figee_le).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()
    : null;
  return (
    <View style={styles.projectionMeta}>
      <Text style={styles.projectionMetaText}>{source}</Text>
      {frozenAt ? <><Text style={styles.projectionMetaDot}>·</Text><Text style={styles.projectionMetaText}>FIGÉ {frozenAt}</Text></> : null}
      {projection.k ? <><Text style={styles.projectionMetaDot}>·</Text><Text style={styles.projectionMetaText}>K={projection.k}</Text></> : null}
    </View>
  );
}

export function CallContract({ data }: { data: MatchCenterData }) {
  const { callContext, match, prediction } = data;
  const distribution = callContext.distribution;
  const resolved = prediction?.statut === 'gagne' || prediction?.statut === 'perdu';
  const lockedAt = callContext.verrouille_le
    ? formatDateTime(callContext.verrouille_le)
    : null;
  const closesAt = formatDateTime(callContext.ferme_le);
  const width = `${Math.max(2, Math.min(98, distribution?.a_pct ?? 50))}%` as `${number}%`;

  return (
    <View style={styles.contractCard}>
      <View style={styles.contractHeader}>
        <View>
          <Text style={styles.contractEyebrow}>CONTRAT DU CALL</Text>
          <Text style={styles.contractTitle}>{callContext.regle_resolution.libelle}</Text>
        </View>
        <View style={styles.contractPeople}><Text style={styles.contractPeopleValue}>{callContext.participants}</Text><Text style={styles.contractPeopleLabel}>JOUEUR{callContext.participants > 1 ? 'S' : ''}</Text></View>
      </View>
      <Text style={styles.contractCopy}>{callContext.regle_resolution.detail}</Text>
      <View style={styles.contractTiming}>
        <Text style={styles.contractTimingLabel}>{lockedAt ? 'CHOIX VERROUILLÉ' : 'FERMETURE DU CALL'}</Text>
        <Text style={styles.contractTimingValue}>{lockedAt ?? closesAt}</Text>
      </View>

      {distribution ? (
        <View style={styles.contractDistribution}>
          <View style={styles.contractDistributionTop}>
            <Text style={styles.contractDistributionLabel}>RÉPARTITION RÉVÉLÉE</Text>
            <Text style={styles.contractDistributionTotal}>{distribution.total} CALL{distribution.total > 1 ? 'S' : ''}</Text>
          </View>
          <View style={styles.contractDistributionValues}>
            <Text style={styles.contractDistributionA}>{match.tag_a} {Math.round(distribution.a_pct)}%</Text>
            <Text style={styles.contractDistributionB}>{Math.round(distribution.b_pct)}% {match.tag_b}</Text>
          </View>
          <View style={styles.contractDistributionTrack}><View style={[styles.contractDistributionFill, { width }]} /></View>
        </View>
      ) : (
        <View style={styles.contractHidden}><Text style={styles.contractHiddenGlyph}>◌</Text><Text style={styles.contractHiddenText}>La répartition restera masquée jusqu’à ce que tu valides ton choix.</Text></View>
      )}

      {resolved ? (
        <View style={styles.contractSource}>
          <Text style={styles.contractSourceLabel}>{callContext.resultat_corrige ? `CORRIGÉ · RÉVISION ${callContext.revision_resultat}` : 'SOURCE DU VERDICT'}</Text>
          <View style={styles.contractSourceCopy}>
            <Text style={styles.contractSourceValue}>{callContext.source_resultat_label ?? 'Validation Clutch'}</Text>
            {callContext.identifiant_resultat_externe ? <Text numberOfLines={1} style={styles.contractSourceReference}>RÉF. {callContext.identifiant_resultat_externe}</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function RelatedMatches({ matches }: { matches: ArenaMatch[] }) {
  return (
    <View style={styles.relatedSection}>
      <View>
        <Text style={styles.relatedEyebrow}>PROCHAINS MATCHS</Text>
        <Text style={styles.relatedTitle}>Continue dans la même Arena.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRail}>
        {matches.map((match) => (
          <Pressable
            accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}`}
            accessibilityRole="button"
            key={match.id}
            onPress={() => router.replace({ pathname: '/match/[id]', params: { id: match.id } })}
            style={({ pressed }) => [styles.relatedCard, pressed && styles.pressed]}
          >
            <View style={styles.relatedTop}>
              <Text style={styles.relatedWhen}>{formatRelatedDate(match.debut)}</Text>
              <Text style={styles.relatedGame}>{gameLabel(match.jeu)}</Text>
            </View>
            <Text numberOfLines={1} style={styles.relatedEvent}>{match.evenement}</Text>
            <Text style={styles.relatedDuel}>{match.tag_a} <Text style={styles.relatedVs}>VS</Text> {match.tag_b}</Text>
            <View style={styles.relatedFooter}><Text style={styles.relatedFormat}>BO{match.format}</Text><Text style={styles.relatedArrow}>→</Text></View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ClosedState({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <View style={styles.closedCard}>
      <Text style={styles.closedEyebrow}>{eyebrow}</Text>
      <Text style={styles.closedTitle}>{title}</Text>
      <Text style={styles.closedCopy}>{copy}</Text>
    </View>
  );
}

export function RiskCell({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <View style={styles.riskCell}>
      <Text style={styles.riskLabel}>{label}</Text>
      <Text style={[styles.riskValue, positive ? styles.riskGain : styles.riskLoss]}>{value}</Text>
      <View style={styles.riskUnitRow}>
        <CurrencyIcon kind="frags" size={11} />
        <Text style={styles.riskUnit}>FRAGS</Text>
      </View>
    </View>
  );
}

export function LoadingCard() {
  return (
    <View style={styles.loadingCard}>
      <View style={styles.loadingLineWide} />
      <View style={styles.loadingLine} />
      <View style={styles.loadingDuel}>
        <View style={styles.loadingCircle} /><View style={styles.loadingCircle} />
      </View>
    </View>
  );
}

export function formatMatchDate(match: MatchCenterData['match']) {
  const phase = matchPhase(match);
  if (phase === 'finished') return 'MATCH TERMINÉ';
  if (phase === 'cancelled') return 'MATCH ANNULÉ';
  if (phase === 'live') return 'LIVE · PRONOSTICS FERMÉS';
  const date = new Date(match.debut);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).replace('.', '').toUpperCase();
}

function formatRelatedDate(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase()} · ${formatTime(value)}`;
}
