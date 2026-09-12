import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { MACHINE_ART, machineFrame } from './artwork';
import type { ReactorStage } from './model';
import { pulse, ramp, smooth } from './motion';
const Ring = Animated.createAnimatedComponent(Ellipse);
const Shine = Animated.createAnimatedComponent(Rect);
function LockLight({ time, x, y, at }: { time: SharedValue<number>; x: number; y: number; at: number }) {
  const props = useAnimatedProps(() => ({ opacity: pulse(time.value, at, at + 240), rx: 3 + ramp(time.value, at, at + 240) * 16, ry: 2 + ramp(time.value, at, at + 240) * 5 }));
  return <Ring cx={x} cy={y} fill="none" stroke="#b5eaff" strokeWidth={2} animatedProps={props} />;
}
export function ForgeEffects({ time, stage = 2 }: { time: SharedValue<number>; stage?: ReactorStage }) {
  const id = `forge-${useId().replace(/:/g, '')}`;
  const frame = machineFrame(stage);
  const art = MACHINE_ART[stage];
  const [left, right] = art.core;
  const shine = useAnimatedProps(() => ({ x: 70 + smooth(time.value, 3340, 4020) * 850, opacity: pulse(time.value, 3340, 4020) * .18 }));
  const discharge = useAnimatedProps(() => ({ rx: 35 + ramp(time.value, 1100, 1440) * 75, ry: 8 + ramp(time.value, 1100, 1440) * 16, opacity: pulse(time.value, 1100, 1440) * .8 }));
  return <Svg width="100%" height="100%" viewBox="0 0 1000 1000" style={StyleSheet.absoluteFill}>
    <Ring cx={500} cy={738} fill="none" stroke="#8edfff" strokeWidth={2} animatedProps={discharge} />
    <G transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`}>
      <LockLight time={time} x={left - 50} y={art.base + 19} at={1670} />
      <LockLight time={time} x={right + 23} y={art.base + 19} at={1780} />
      <LockLight time={time} x={left - 35} y={art.base - 90} at={2230} />
      <LockLight time={time} x={right + 43} y={art.base - 89} at={2510} />
      <LockLight time={time} x={(left + right) / 2} y={art.base - 68} at={3120} />
      <Defs><ClipPath id={id}><Path d={MACHINE_ART[stage].silhouette} /></ClipPath></Defs>
      <G clipPath={`url(#${id})`}><Shine y={80} width={28} height={850} fill="#deefff" animatedProps={shine} /></G>
    </G>
  </Svg>;
}
