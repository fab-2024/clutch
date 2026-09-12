import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { pulse, ramp, smooth } from './motion';
import { MACHINE_ART, machineFrame } from './artwork';
import type { ReactorStage } from './model';
type Vent = { x: number; y: number };
const VENTS: Record<ReactorStage, readonly Vent[]> = {
  1: [{ x: 281, y: 520 }, { x: 714, y: 520 }],
  2: [{ x: 443, y: 665 }, { x: 755, y: 668 }],
  3: [{ x: 297, y: 634 }, { x: 703, y: 634 }],
  4: [{ x: 347, y: 690 }, { x: 653, y: 690 }],
  5: [{ x: 286, y: 770 }, { x: 714, y: 770 }],
};
const Puff = Animated.createAnimatedComponent(Circle);
const Spark = Animated.createAnimatedComponent(Line);
const Tube = Animated.createAnimatedComponent(Path);
function Steam({ time, side, index, gradient, vent }: { vent: Vent; gradient: string; time: SharedValue<number>; side: number; index: number }) {
  const props = useAnimatedProps(() => {
    const t = time.value, at = 1950 + (side > 0 ? 140 : 0) + index * 65;
    const p = ramp(t, at, at + 1300);
    return { cx: vent.x + side * p * (95 + index * 17), cy: vent.y - p * (55 + index * 19), r: 6 + p * (24 + index * 3), opacity: pulse(t, at, at + 1300) * .19 };
  });
  return <Puff fill={`url(#${gradient})`} animatedProps={props} />;
}
function Ejecta({ time, side, index, vent }: { vent: Vent; time: SharedValue<number>; side: number; index: number }) {
  const props = useAnimatedProps(() => {
    const at = 1970 + (side > 0 ? 140 : 0), p = ramp(time.value, at, at + 650);
    const x = vent.x + side * p * (125 + index * 16);
    const y = vent.y + (index - 3) * 25 * p + p * p * 55;
    return { x1: x, x2: x - side * (4 + 12 * (1-p)), y1: y, y2: y - (index-3)*2, opacity: pulse(time.value, at, at + 650) };
  });
  return <Spark stroke="#ffc16b" strokeWidth={2} animatedProps={props} />;
}
export function OverheatEffects({ time, heat, stage = 1 }: { stage?: ReactorStage; time: SharedValue<number>; heat: SharedValue<number> }) {
  const frame = machineFrame(stage);
  const vents = VENTS[stage].map(v => ({ x: frame.x + v.x * frame.scale, y: frame.y + v.y * frame.scale }));
  const gradient = `steam-${useId().replace(/:/g,'')}`;
  const hot = useAnimatedProps(() => ({ opacity: heat.value * (1-smooth(time.value, 1950, 2250)), stroke: heat.value > .75 ? '#ff4325' : '#ff9b32' }));
  return <Svg width="100%" height="100%" viewBox="0 0 1000 1000" style={StyleSheet.absoluteFill}>
    <Defs><RadialGradient id={gradient}><Stop offset="0" stopColor="#e1e9eb" stopOpacity={.8}/><Stop offset=".5" stopColor="#b6cbd1" stopOpacity={.45}/><Stop offset="1" stopColor="#8ea7b0" stopOpacity={0}/></RadialGradient></Defs>
    <G transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`}><Tube d={MACHINE_ART[stage].pipes.join(" ")} strokeWidth={4 / frame.scale} fill="none" animatedProps={hot} /></G>
    {[-1, 1].flatMap(side => Array.from({length: 7}, (_, index) => <Steam gradient={gradient} key={`v${side}-${index}`} vent={vents[side < 0 ? 0 : 1]} side={side} index={index} time={time} />))}
    {[-1, 1].flatMap(side => Array.from({length: 7}, (_, index) => <Ejecta key={`s${side}-${index}`} vent={vents[side < 0 ? 0 : 1]} side={side} index={index} time={time} />))}
  </Svg>;
}
