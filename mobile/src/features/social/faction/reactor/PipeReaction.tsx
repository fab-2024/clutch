import { Ellipse, Path } from 'react-native-svg';
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { MACHINE_ART } from './artwork';
import type { ReactorStage } from './model';
import { coreEnergy, pulse, ramp } from './motion';

const Core = Animated.createAnimatedComponent(Ellipse);
const Light = Animated.createAnimatedComponent(Path);
export function PipeReaction({ stage, reaction, mutation, reduced }: { stage: ReactorStage; reaction: SharedValue<number>; mutation?: SharedValue<number>; reduced: boolean }) {
  const light = useAnimatedProps(() => ({ opacity: reduced ? 0 : Math.max(pulse(reaction.value, 180, 650), pulse(mutation?.value ?? 0, 0, 760)), strokeDashoffset: 1200 * (1 - ramp(reaction.value, 180, 650)) }));
  const core = useAnimatedProps(() => ({ opacity: reduced ? 0 : coreEnergy(reaction.value, mutation?.value ?? 0) * .75 }));
  const cavity = MACHINE_ART[stage].cavities[0];
  return <><Core cx={cavity.x + cavity.width / 2} cy={cavity.y + cavity.height - 4} rx={cavity.width * .35} ry={2} fill="#c2edff" animatedProps={core} />{MACHINE_ART[stage].pipes.map((d, i) => <Light key={i} d={d} fill="none" stroke="#9bd9ff" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 1200" animatedProps={light} />)}</>;
}
