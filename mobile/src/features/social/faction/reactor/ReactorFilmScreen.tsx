import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/layout/Screen';
import { fonts } from '@/src/theme';
import { ReactorScene, type ReactorSceneHandle } from './ReactorScene';
import { reactorStageDefinition, type ReactorStage } from './model';

// Deterministic recording of the real renderer; only its demo inputs are scripted.
export default function ReactorFilmScreen() {
  const scene = useRef<ReactorSceneHandle>(null);
  const [stage, setStage] = useState<ReactorStage>(1);
  const [fill, setFill] = useState(0);
  const [phase, setPhase] = useState('0 % · cuve vide');
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const lead = stage === 1 ? 3000 : 500;
    const definition = reactorStageDefinition(stage);
    const floor = stage === 1 ? 0 : definition.floor;
    const timers = Array.from({ length: 10 }, (_, index) => {
      const step = index + 1;
      // The pause halfway through keeps the touch reaction readable.
      return setTimeout(() => {
        const supporters = floor + (definition.ceiling - floor) * step / 10;
        setPhase(`${step * 10} % · ${supporters.toLocaleString('fr-FR')} supporters`);
        setFill(step / 10);
      }, lead + step * 1200 + (step > 5 ? 2200 : 0));
    });
    timers.push(
      setTimeout(() => { setPhase('50 % · au toucher : noyau, conduits, bulles'); scene.current?.react(); }, lead + 6600),
      setTimeout(() => { setPhase(stage < 5 ? 'Mise sous pression · transformation' : 'Nexus · pleine puissance'); scene.current?.evolve(stage < 5 ? (stage + 1) as ReactorStage : 5, stage < 5 ? 0 : 1); }, lead + 15400),
    );
    return () => timers.forEach(clearTimeout);
  }, [stage]);
  const complete = () => {
    if (stage === 5) { setFill(1); setPhase('Les cinq formes · toutes les évolutions'); setFinished(true); return; }
    setStage((stage + 1) as ReactorStage); setFill(0); setPhase('Votre faction a évolué · cuve vide');
  };
  return <Screen atmosphere="none" style={styles.screen}>
    <View style={styles.header}><Text style={styles.brand}>GRIFF / RELIQUE COLLECTIVE</Text><Text style={styles.subtitle}>Démonstration animée · données simulées</Text></View>
    <Text style={styles.number}>0{stage} / 05</Text>
    <Text style={styles.title}>{reactorStageDefinition(stage).title}</Text>
    <View style={styles.scene}><ReactorScene ref={scene} stage={stage} fillRatio={fill} animateContribution reduceMotionOverride={false} onEvolutionComplete={complete} /></View>
    <Text accessibilityLiveRegion="polite" style={styles.phase}>{phase}</Text>
    <Text style={styles.footer}>{finished ? 'MODULE → RÉACTEUR → CŒUR D’ARÈNE\nCITADELLE → NEXUS' : 'Verre · élixir · mécanique'}</Text>
  </Screen>;
}
const styles = StyleSheet.create({
  screen: { backgroundColor: '#080d12', justifyContent: 'center' },
  header: { marginHorizontal: 24, marginBottom: 28 },
  brand: { color: '#dfff7a', fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.2 },
  subtitle: { color: '#8595a5', fontSize: 11, marginTop: 8 },
  number: { color: '#62acff', marginHorizontal: 24, fontSize: 14, letterSpacing: 3 },
  title: { color: '#f4f6f8', fontFamily: fonts.bold, fontSize: 30, marginHorizontal: 24, marginTop: 8 },
  scene: { marginTop: 20 },
  phase: { color: '#e4ebf3', fontSize: 15, textAlign: 'center', marginHorizontal: 20, marginTop: 25, minHeight: 42 },
  footer: { color: '#8192a5', fontSize: 11, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 22 },
});
