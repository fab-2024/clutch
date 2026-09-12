import { useEffect, useReducer, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/layout/Screen';
import { fonts } from '@/src/theme';
import { ReactorScene, type ReactorSceneHandle } from './ReactorScene';
import { createReactorLabState, nextReactorStage, reactorFillRatio, reactorLabReducer, reactorStageDefinition, REACTOR_STAGES } from './model';

export default function ReactorLabScreen() {
  const params = useLocalSearchParams<{ reducedMotion?: string; supporters?: string; moduleOnly?: string }>();
  const moduleOnly = params.moduleOnly === '1';
  const requestedSupporters = params.supporters === undefined ? 63 : Number(params.supporters);
  const initialSupporters = moduleOnly ? Math.min(99, Math.max(1, Number.isFinite(requestedSupporters) ? requestedSupporters : 63)) : requestedSupporters;
  const [state, dispatch] = useReducer(reactorLabReducer, initialSupporters, createReactorLabState);
  const [generation, setGeneration] = useState(0);
  const scene = useRef<ReactorSceneHandle>(null);
  const definition = reactorStageDefinition(state.stage);
  const next = moduleOnly ? null : nextReactorStage(state.stage);
  const followingStage = nextReactorStage(state.stage);
  const nextName = followingStage ? reactorStageDefinition(followingStage).name : null;
  const remaining = Math.max(0, definition.ceiling - state.supporters);
  const prepareDisabled = state.running || state.prepared || (!next && !moduleOnly);
  useEffect(() => {
    dispatch({ type: 'reset', supporters: initialSupporters });
    setGeneration((v) => v + 1);
  }, [initialSupporters]);
  const reset = () => { setGeneration((v) => v + 1); dispatch({ type: 'reset', supporters: 63 }); };
  const activate = () => {
    if (state.running) return;
    if (state.prepared && next) { dispatch({ type: 'start' }); scene.current?.evolve(); }
    else scene.current?.react();
  };
  const status = state.running ? `Évolution vers ${nextName}…`
    : state.prepared ? moduleOnly ? "Cuve chargée. Touche le Module pour voir sa réaction." : `Prêt à évoluer. Touche ${definition.name}.`
    : state.evolved ? `Votre faction a évolué : ${definition.name}.`
    : state.stage === 5 ? 'La dernière forme. La puissance continue de grandir.'
    : 'Une communauté qui grandit. Une puissance qui se construit.';
  return <Screen atmosphere="none" style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><Text style={styles.brand}>GRIFF / ATELIER</Text><Text style={styles.tag}>APERÇU · DONNÉES DE DÉMO</Text></View>
      <Text style={styles.eyebrow}>RELIQUE COLLECTIVE</Text>
      <Text style={styles.title}>{definition.title}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={state.prepared && next ? `Transformer ${definition.name} en ${nextName}` : `Activer ${definition.name}`} accessibilityState={{ disabled: state.running }} disabled={state.running} onPress={activate} testID="reactor-lab-stage">
        <ReactorScene key={generation} ref={scene} focusModule={moduleOnly} stage={state.stage} fillRatio={reactorFillRatio(state.supporters, definition.floor, definition.ceiling)} animateContribution={!state.prepared} onEvolutionCancel={() => dispatch({ type: 'cancel' })} onEvolutionComplete={() => dispatch({ type: 'finish' })} reduceMotionOverride={params.reducedMotion === undefined ? undefined : params.reducedMotion === '1'} />
      </Pressable>
      <View style={styles.progress}><Text style={styles.count}>{state.supporters.toLocaleString('fr-FR')} <Text style={styles.goal}>/ {definition.ceiling.toLocaleString('fr-FR')}</Text></Text><Text style={styles.supporters}>supporters</Text><Text style={styles.remaining}>{remaining > 0 ? `${remaining.toLocaleString('fr-FR')} avant ${nextName ?? 'la pleine puissance'}` : 'Pleine puissance atteinte'}</Text></View>
      {!moduleOnly && <View style={styles.rail}>{REACTOR_STAGES.map((item) => <View key={item.level} style={styles.railItem} accessibilityLabel={`${item.name}, ${item.level === state.stage ? 'forme actuelle' : item.level < state.stage ? 'acquise' : 'à venir'}`}><Text style={item.level <= state.stage ? styles.selected : styles.muted}>0{item.level}</Text><Text style={[styles.railName, item.level === state.stage && styles.selected]}>{item.name}</Text></View>)}</View>}
      <View style={[styles.controls, moduleOnly && { marginTop: 22 }]}>
        <Pressable accessibilityRole="button" onPress={reset} style={styles.reset}><Text style={styles.resetText}>RÉINITIALISER</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={prepareDisabled} accessibilityState={{ disabled: prepareDisabled }} onPress={() => dispatch({ type: 'prepare' })} style={[styles.prepare, prepareDisabled && styles.disabled]}><Text style={styles.prepareText}>{moduleOnly ? 'REMPLIR LA CUVE' : next ? 'PRÉPARER LA MUTATION' : 'FORME FINALE ATTEINTE'}</Text></Pressable>
      </View>
      <Text style={styles.note}>Touche la machine pour voir sa réaction. Les données de cet atelier sont simulées.</Text>
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  screen: { backgroundColor: '#080d12' }, content: { paddingBottom: 30 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  brand: { color: '#e4e9ed', fontFamily: fonts.bold, fontSize: 12 }, tag: { color: '#8c9aa7', fontSize: 9 },
  eyebrow: { marginHorizontal: 22, marginTop: 12, color: '#9eabb7', fontSize: 12, letterSpacing: 2 },
  title: { marginHorizontal: 20, marginTop: 6, color: '#f2f3f5', fontFamily: fonts.bold, fontSize: 36 },
  status: { marginHorizontal: 22, marginTop: 8, color: '#9aabbc', fontSize: 12, minHeight: 34, lineHeight: 17 },
  progress: { paddingHorizontal: 22, marginTop: -4 }, count: { color: '#fff', fontFamily: fonts.bold, fontSize: 44 }, goal: { color: '#929dae', fontSize: 32 },
  supporters: { color: '#b1bdcd', fontSize: 19 }, remaining: { color: '#7c8b9e', fontSize: 13, marginTop: 4 },
  rail: { margin: 22, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29323b', flexDirection: 'row', justifyContent: 'space-between' },
  railItem: { flex: 1, alignItems: 'center', gap: 5 }, railName: { color: '#738292', fontSize: 10, textAlign: 'center', minHeight: 28 },
  selected: { color: '#62acff', fontFamily: fonts.bold, fontSize: 12 }, muted: { color: '#738292', fontSize: 12 },
  controls: { marginHorizontal: 22, gap: 10, flexDirection: 'row', flexWrap: 'wrap' },
  reset: { padding: 14, borderWidth: 1, borderColor: '#46515b', borderRadius: 8 }, resetText: { color: '#cbd2d9', fontFamily: fonts.bold, fontSize: 10 },
  prepare: { padding: 14, borderRadius: 8, backgroundColor: '#dfff7a' }, prepareText: { color: '#11170b', fontFamily: fonts.bold, fontSize: 10 },
  disabled: { opacity: .4 }, note: { marginHorizontal: 22, marginTop: 16, color: '#7b8894', fontSize: 12, lineHeight: 18 },
});
