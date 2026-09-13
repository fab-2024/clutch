import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ReactorScene, type ReactorSceneHandle } from '../reactor/ReactorScene';
import { reactorStageDefinition, type ReactorStage } from '../reactor/model';
import { resolveRelicInstability, type RelicDiagnostics, type SupporterContributionPresentation } from '../relicState';
import type { CommunityFaction, CommunityMutationPresentation, FactionProgress } from '../types';
import { communityFormForLevel, shouldPresentRelicMutation } from '../utils';

type Props = {
  accent?: string;
  compact?: boolean; faction: CommunityFaction | null; progress: FactionProgress;
  mutation?: CommunityMutationPresentation | null;
  replayMutation?: CommunityMutationPresentation | null;
  sceneHeight?: number;
  instabilityPreviewOverride?: { charge: number; objective: number };
  onDiagnosticsChange?: (diagnostics: RelicDiagnostics) => void;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  onSupporterContributionPresented?: (id: string) => Promise<void> | void;
  supporterContribution?: SupporterContributionPresentation | null;
};
const stageFor = (level: number) => Math.max(1, Math.min(5, level)) as ReactorStage;

export default function CollectiveRelic(props: Props) {
  // A faction change must cancel the former faction's animation and replay state.
  return <FactionReactor key={props.faction?.equipe_id ?? 'none'} {...props} />;
}

function FactionReactor({ accent, compact = false, faction, progress, mutation, replayMutation, sceneHeight, onMutationPresented, onDiagnosticsChange, onSupporterContributionPresented, supporterContribution, instabilityPreviewOverride }: Props) {
  const scene = useRef<ReactorSceneHandle>(null);
  const active = useRef<CommunityMutationPresentation | null>(null);
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() => new Set());
  const [last, setLast] = useState<CommunityMutationPresentation | null>(null);
  const [playing, setPlaying] = useState<CommunityMutationPresentation | null>(null);
  const [generation, setGeneration] = useState(0);
  const [message, setMessage] = useState('');
  const contribution = useRef<string | null>(null);
  const previousCharge = useRef(progress.charge);
  const pending = mutation && shouldPresentRelicMutation(mutation, null) && !completed.has(mutation.id) ? mutation : null;
  const replay = last ?? replayMutation;
  const current = stageFor(progress.level);
  const displayed = playing ? stageFor(playing.from_level) : current;
  const start = (event: CommunityMutationPresentation) => {
    if (active.current) return;
    active.current = event;
    setMessage('');
    setGeneration(value => value + 1);
    setPlaying(event);
  };
  useEffect(() => {
    if (playing) scene.current?.evolve(stageFor(playing.to_level), stageFor(playing.to_level) === current ? progress.progress : 1);
    // Snapshot the event once; polling cannot restart an animation in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing?.id, generation]);
  useEffect(() => {
    if (progress.charge > previousCharge.current && !playing && !pending && !supporterContribution) scene.current?.react();
    previousCharge.current = progress.charge;
  }, [progress.charge, playing, pending, supporterContribution]);
  useEffect(() => {
    if (!supporterContribution || contribution.current === supporterContribution.id || playing) return;
    contribution.current = supporterContribution.id;
    scene.current?.react();
    void Promise.resolve(onSupporterContributionPresented?.(supporterContribution.id)).catch(() => undefined);
  }, [supporterContribution, playing, onSupporterContributionPresented]);
  useEffect(() => {
    const instability = resolveRelicInstability(instabilityPreviewOverride?.charge ?? progress.charge, instabilityPreviewOverride?.objective ?? progress.objective);
    onDiagnosticsChange?.({ tier: instability.tier, ratio: instability.ratio, mutationFromForm: mutation ? communityFormForLevel(mutation.from_level).container : null, mutationToForm: mutation ? communityFormForLevel(mutation.to_level).container : null, mutationEventId: mutation?.id ?? null, mutationEventPresented: Boolean(mutation && completed.has(mutation.id)) });
  }, [progress.charge, progress.objective, instabilityPreviewOverride, mutation, onDiagnosticsChange, playing, completed]);
  const finish = () => {
    const event = active.current;
    if (!event) return;
    active.current = null;
    setPlaying(null);
    setLast(event);
    setMessage(`Votre faction a évolué : ${event.to_level >= 6 ? 'Nexus · pleine puissance' : reactorStageDefinition(stageFor(event.to_level)).name}.`);
    if (!completed.has(event.id)) {
      setCompleted((current) => new Set(current).add(event.id));
      void Promise.resolve(onMutationPresented?.(event.id)).catch(() => {
        setCompleted((current) => {
          const retryable = new Set(current);
          retryable.delete(event.id);
          return retryable;
        });
        setMessage('Évolution affichée. Sa mémorisation sera réessayée à la prochaine lecture.');
      });
    }
  };
  const cancel = () => { active.current = null; setPlaying(null); };
  const disabled = !faction || progress.level === 0 || Boolean(playing);
  const status = playing ? 'Votre faction évolue…' : message || (pending ? 'Une nouvelle évolution est disponible.' : '');
  return <View style={styles.container}>
    <Pressable testID="collective-relic-stage" accessibilityRole="button" accessibilityLabel={`Réacteur ${reactorStageDefinition(displayed).name} de ${faction?.nom ?? 'la faction'}`} accessibilityHint={pending ? 'Voir l’évolution de votre faction' : 'Activer le noyau, les conduits puis les bulles'} accessibilityState={{ disabled }} disabled={disabled} onPress={() => pending ? start(pending) : scene.current?.react()}>
      <ReactorScene accent={accent} height={sceneHeight} key={generation} ref={scene} stage={displayed} fillRatio={playing ? .99 : progress.progress} animateContribution={false} onEvolutionComplete={finish} onEvolutionCancel={cancel} teamLogo={faction?.logo} teamName={faction?.nom} teamTag={faction?.tag} />
    </Pressable>
    <Text numberOfLines={1} style={[styles.status, compact && styles.statusCompact]} accessibilityLiveRegion="polite">{status}</Text>
    {!playing && (pending || replay) ? <Pressable accessibilityLabel={pending ? 'Voir l’évolution de la relique' : 'Revoir la transformation de la relique'} accessibilityRole="button" onPress={() => start((pending ?? replay)!)} style={({ pressed }) => [styles.replay, compact && styles.replayCompact, pressed && styles.replayPressed]} testID={compact ? 'relic-replay-compact' : 'relic-replay'}><Text style={[styles.replayText, compact && styles.replayTextCompact]}>{compact ? (pending ? 'VOIR L’ÉVOLUTION' : '↻ REVOIR') : (pending ? 'Voir l’évolution' : 'Revoir la transformation')}</Text></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { position: 'relative' },
  status: { color: '#adbdcc', fontSize: 12, textAlign: 'center', marginHorizontal: 20, marginTop: 6 },
  statusCompact: { position: 'absolute', left: 34, right: 34, bottom: 10, marginHorizontal: 0, marginTop: 0, color: '#B9C5CC', fontSize: 9, lineHeight: 12, textShadowColor: '#000', textShadowRadius: 4 },
  replay: { alignSelf: 'center', padding: 14, marginBottom: 8 },
  replayCompact: { position: 'absolute', top: 38, right: 12, minHeight: 27, paddingHorizontal: 9, paddingVertical: 6, marginBottom: 0, borderRadius: 7, borderWidth: 1, borderColor: '#41515B', backgroundColor: 'rgba(4,10,14,.86)', boxShadow: '0 3px 12px rgba(0,0,0,.42)' },
  replayText: { color: '#dfff7a', fontWeight: '600' },
  replayTextCompact: { color: '#C7D2D8', fontSize: 8, lineHeight: 10, letterSpacing: .7 },
  replayPressed: { opacity: .72 },
});
