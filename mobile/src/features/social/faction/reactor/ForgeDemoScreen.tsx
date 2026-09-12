import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/layout/Screen';
import { fonts } from '@/src/theme';
import { ReactorScene, type ReactorSceneHandle } from './ReactorScene';
import { reactorStageDefinition, type ReactorStage } from './model';

// The atelier now exercises exactly the same renderer and lifecycle as Social.
export default function ForgeDemoScreen() {
  const scene = useRef<ReactorSceneHandle>(null);
  const [generation, setGeneration] = useState(0);
  const [stage, setStage] = useState<ReactorStage>(1);
  const [phase, setPhase] = useState('Le moteur est prêt à évoluer.');
  const [finished, setFinished] = useState(false);
  const destination = Math.min(5, stage + 1) as ReactorStage;
  useFocusEffect(useCallback(() => {
    if (finished) return;
    setPhase(stage === 5 ? 'Nexus · pleine puissance' : 'Le moteur est prêt à évoluer.');
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      scene.current?.evolve(destination, stage === 5 ? 1 : 0);

    }, 2400));
    return () => timers.forEach(clearTimeout);
  }, [stage, destination, finished]));
  const complete = () => {
    setPhase('Votre faction a évolué.');
    if (stage === 5) setFinished(true);
    else setStage(destination);
  };
  return <Screen atmosphere="none" style={styles.screen}>
    <View style={styles.header}>
      <Text style={styles.eyebrow}>ATELIER / LES CINQ FORMES</Text>
      <Text style={styles.title}>SURCHAUFFE</Text>
      <Text style={styles.subtitle}>{reactorStageDefinition(stage).title.toUpperCase()}{stage < 5 ? ` → ${reactorStageDefinition(destination).title.toUpperCase()}` : ' · PLEINE PUISSANCE'}</Text>
    </View>
    <View style={styles.scene}>
      <ReactorScene key={generation} ref={scene} stage={stage} fillRatio={finished ? 1 : .72} animateContribution={false} onEvolutionComplete={complete} onEvolutionPhase={value => setPhase(['Le moteur s’emballe.', 'Température critique.', 'La cuve entre en ébullition.', stage === 5 ? 'Décharge de pression.' : 'RUPTURE DES CONDUITS', 'Surcharge contenue.', 'Refroidissement engagé.'][value])} />
    </View>
    <View style={styles.caption}><Text accessibilityLiveRegion="polite" style={styles.phase}>{phase}</Text><Text style={styles.note}>Surchauffe · rupture · évolution · refroidissement</Text></View>
    {finished && <Pressable accessibilityRole="button" onPress={() => { setStage(1); setFinished(false); setGeneration(v => v + 1); }} style={styles.replay}><Text style={styles.replayText}>REVOIR LES TRANSFORMATIONS</Text></Pressable>}
  </Screen>;
}
const styles = StyleSheet.create({
  screen: { backgroundColor: '#080d12', justifyContent: 'center' },
  header: { paddingHorizontal: 26, paddingTop: 30 },
  eyebrow: { color: '#7897ad', fontSize: 10, letterSpacing: 2 },
  title: { color: '#f0f5f8', fontFamily: fonts.bold, fontSize: 39, marginTop: 12 },
  subtitle: { color: '#94c9f0', fontSize: 12, letterSpacing: 3, marginTop: 8 },
  scene: { width: '100%', aspectRatio: 1, marginTop: 14, overflow: 'hidden' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '89%', backgroundColor: '#12181e', borderTopColor: '#23313b', borderTopWidth: 1 },
  caption: { height: 100, paddingTop: 24, alignItems: 'center' },
  phase: { color: '#eef6fc', fontFamily: fonts.bold, fontSize: 19, textAlign: 'center', paddingHorizontal: 16 },
  note: { color: '#7c95a7', fontSize: 11, letterSpacing: .6, marginTop: 12 },
  replay: { position: 'absolute', bottom: 25, alignSelf: 'center', padding: 16 },
  replayText: { color: '#afd9f8', fontSize: 10, letterSpacing: 1.5 },
});
