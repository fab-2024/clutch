import { Platform } from 'react-native';
import { Circle, ClipPath, Defs, G, Image as SvgImage, Rect } from 'react-native-svg';
import Animated, { type SharedValue, useAnimatedProps, useDerivedValue } from 'react-native-reanimated';
import { bubbleEnergy, ramp } from './motion';

const Moving = Animated.createAnimatedComponent(G);
const Bubble = Animated.createAnimatedComponent(Circle);
const Volume = Animated.createAnimatedComponent(Rect);
const SOURCE = require('../../../../../assets/social/reactor/module-material-study.png');
const WEB = Platform.OS === 'web';
const LEFT = 355, RIGHT = 643, TOP = 246, BOTTOM = 687;
// Runtime windows in the SAME photograph: clear glass, liquid body, meniscus,
// and lower caustic. No opaque vector panel is painted over the vessel.
const CLEAR_TOP = 250, CLEAR_BOTTOM = 347, BODY_TOP = 378, BODY_BOTTOM = 681;
const SURFACE_TOP = 354, SURFACE_HEIGHT = 24;
type Props = { id: string; fill: SharedValue<number>; reaction: SharedValue<number>; mutation: SharedValue<number>; reduced: boolean };
function matrix(scale: number, y: number): { transform?: string; matrix?: number[] } {
  'worklet';
  return WEB ? { transform: `matrix(1 0 0 ${scale} 0 ${y})` } : { matrix: [1, 0, 0, scale, 0, y] };
}
export function ModuleElixir({ id, fill, reaction, mutation, reduced }: Props) {
  const level = useDerivedValue(() => {
    const fraction = Math.max(0, Math.min(1, fill.value));
    const wave = reduced ? 0 : Math.sin((reaction.value + mutation.value) * .009) * bubbleEnergy(reaction.value, mutation.value) * 2;
    return Math.max(TOP, Math.min(BOTTOM, BOTTOM - fraction * (BOTTOM - TOP) + wave));
  });
  const empty = useAnimatedProps(() => {
    const scale = Math.max(.001, (level.value + 4 - TOP) / (CLEAR_BOTTOM - CLEAR_TOP));
    return matrix(scale, TOP - CLEAR_TOP * scale);
  });
  const body = useAnimatedProps(() => {
    const scale = Math.max(.001, (BOTTOM - level.value) / (BODY_BOTTOM - BODY_TOP));
    return { ...matrix(scale, level.value - BODY_TOP * scale), opacity: fill.value > .0001 ? 1 : 0 };
  });
  const surface = useAnimatedProps(() => ({ ...matrix(1, level.value - SURFACE_TOP - 10), opacity: Math.min(1, Math.max(0, fill.value * 35)) }));
  const volume = useAnimatedProps(() => ({ y: level.value, height: Math.max(0, BOTTOM - level.value) }));
  const bottom = useAnimatedProps(() => ({ opacity: Math.min(1, Math.max(0, fill.value * 20)) }));
  const window = (name: string, top: number, height: number) => <ClipPath id={`${id}-${name}`}><Rect x={LEFT} y={top} width={RIGHT - LEFT} height={height} /></ClipPath>;
  return <G>
    <Defs>
      {window('cavity-photo', TOP, BOTTOM - TOP)}
      {window('clear-photo', CLEAR_TOP, CLEAR_BOTTOM - CLEAR_TOP)}
      {window('body-photo', BODY_TOP, BODY_BOTTOM - BODY_TOP)}
      {window('surface-photo', SURFACE_TOP, SURFACE_HEIGHT)}
      {window('bottom-photo', 674, 13)}
      <ClipPath id={`${id}-wet`}><Volume x={LEFT} width={RIGHT - LEFT} animatedProps={volume} /></ClipPath>
    </Defs>
    <G clipPath={`url(#${id}-cavity-photo)`}>
      <Moving animatedProps={empty}><G clipPath={`url(#${id}-clear-photo)`}><SvgImage href={SOURCE} width="1000" height="1000" /></G></Moving>
      <Moving animatedProps={body}><G clipPath={`url(#${id}-body-photo)`}><SvgImage href={SOURCE} width="1000" height="1000" /></G></Moving>
      <Moving animatedProps={surface}><G clipPath={`url(#${id}-surface-photo)`}><SvgImage href={SOURCE} width="1000" height="1000" /></G></Moving>
      <G clipPath={`url(#${id}-wet)`}>
        <Moving animatedProps={bottom}><G clipPath={`url(#${id}-bottom-photo)`}><SvgImage href={SOURCE} width="1000" height="1000" /></G></Moving>
        {[0, 1, 2, 3, 4, 5].map(index => <RisingBubble key={index} index={index} level={level} reaction={reaction} mutation={mutation} reduced={reduced} />)}
      </G>
    </G>
  </G>;
}

function RisingBubble({ index, level, reaction, mutation, reduced }: { index: number; level: SharedValue<number>; reaction: SharedValue<number>; mutation: SharedValue<number>; reduced: boolean }) {
  const radius = [6, 8, 5, 7, 5.5, 7.5][index];
  const delay = [0, 180, 65, 260, 120, 220][index];
  const originX = [420, 575, 460, 540, 395, 605][index];
  const props = useAnimatedProps(() => {
    const time = mutation.value > 0 ? mutation.value : reaction.value;
    const start = mutation.value > 0 ? (time >= 2920 ? 2920 : 780) : 450;
    const end = mutation.value > 0 ? (time >= 2920 ? 3700 : 1460) : 1450;
    const progress = ramp(time, start + delay, end);
    const depth = Math.max(0, BOTTOM - level.value - radius * 2);
    return {
      cx: originX + Math.sin(progress * Math.PI * 2 + index) * 5,
      cy: BOTTOM - radius - 3 - progress * depth,
      opacity: reduced || depth < radius ? 0 : bubbleEnergy(reaction.value, mutation.value) * .9,
    };
  });
  return <Bubble r={radius} fill="#79bfff" fillOpacity={.16} stroke="#b7e5ff" strokeWidth={1.8} animatedProps={props} />;
}
