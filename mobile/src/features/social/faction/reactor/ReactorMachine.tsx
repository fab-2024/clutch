import { memo, useId, useState } from 'react';
import { ThermalLiquid } from './ThermalLiquid';
import { forgeAttachment } from './forgeMotion';
import { ModuleElixir } from './ModuleElixir';
import { FocusedModule, RestingMachine } from './FocusedModule';
import { VesselElixir } from './VesselElixir';
import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Image as SvgImage, Mask, Path, Rect } from 'react-native-svg';
import Animated, { type SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { MACHINE_ART, machineFrame } from './artwork';
import { type ReactorStage } from './model';
import { attachmentPose, machineRole, coreEnergy, pressure, pulse, ramp, smooth } from './motion';

const Surface = Animated.createAnimatedComponent(Ellipse);
const Light = Animated.createAnimatedComponent(Path);
type Clocks = { fill: SharedValue<number>; mutation: SharedValue<number>; reaction: SharedValue<number>; reduced: boolean; heat?: SharedValue<number> };
type Props = Clocks & { focusModule?: boolean; active?: boolean; forge?: boolean; from: ReactorStage; to: ReactorStage };
type Piece = 'core' | 'left' | 'right' | 'base-left' | 'base-right' | 'rear-left' | 'rear-right';


function MachinePiece({ stage, piece, from, to, id, size, forge = false, ...clocks }: Props & { stage: ReactorStage; piece: Piece; id: string; size: number }) {
  const { mutation, reaction, reduced } = clocks;
  const art = MACHINE_ART[stage];
  const [left, right] = art.core;
  const rear = stage === 5 ? 340 : 0;
  const area = piece === 'core' ? [left, 0, right - left, art.base] : piece === 'base-left' ? [0, art.base, 500, 1000 - art.base] : piece === 'base-right' ? [500, art.base, 500, 1000 - art.base] : piece === 'rear-left' ? [0, 0, left, rear] : piece === 'rear-right' ? [right, 0, 1000 - right, rear] : piece === 'left' ? [0, rear, left, art.base - rear] : [right, rear, 1000 - right, art.base - rear];
  const frame = machineFrame(stage), a = MACHINE_ART[from].cavities[0], b = MACHINE_ART[to].cavities[0];
  const fa = machineFrame(from), fb = machineFrame(to);
  const poseStyle = useAnimatedStyle(() => {
    const t = mutation.value;
    const role = machineRole(stage, from, to);
    const active = role === 'incoming' || role === 'outgoing', incoming = role === 'incoming';
    let opacity = stage === from ? 1 : 0, x = 0, y = 0, scale = 1, angle = 0;
    if (active) {
      if (reduced) opacity = incoming ? ramp(t, 0, 300) : 1 - ramp(t, 0, 300);
      else if (piece === 'core') {
        const p = smooth(t, forge ? 1120 : 1260, forge ? 1660 : 1740);
        opacity = incoming ? smooth(t, forge ? 1280 : 1420, forge ? 1660 : 1740) : 1 - smooth(t, forge ? 1280 : 1420, forge ? 1660 : 1740);
        const sourceX = fa.x + (a.x + a.width / 2) * fa.scale;
        const targetX = fb.x + (b.x + b.width / 2) * fb.scale;
        const sourceY = fa.y + (a.y + a.height / 2) * fa.scale;
        const targetY = fb.y + (b.y + b.height / 2) * fb.scale;
        const c = art.cavities[0];
        const worldWidth = a.width * fa.scale + (b.width * fb.scale - a.width * fa.scale) * p;
        scale = worldWidth / (c.width * frame.scale);
        x = (sourceX + (targetX - sourceX) * p - frame.x) / frame.scale - (c.x + c.width / 2) * scale;
        y = (sourceY + (targetY - sourceY) * p - frame.y) / frame.scale - (c.y + c.height / 2) * scale;
      } else {
        const pose = forge ? forgeAttachment(piece, incoming, t) : { ...attachmentPose(piece, stage, incoming, t, false), angle: 0 };
        angle = pose.angle;
        opacity = pose.visible; x = pose.x; y = pose.y;
        if (clocks.heat && !incoming && !piece.startsWith('base')) {
          const rupture = smooth(t, 1120, 1500);
          const side = piece.endsWith('left') ? -1 : 1;
          x = side * 320 * rupture; y = -130 * rupture + 100 * rupture * rupture;
          angle = side * 55 * rupture;
        }
      }
    }
    if (piece === 'core' && !reduced) x += Math.sin(t * .14) * (pressure(t) * 2.5 + (clocks.heat?.value ?? 0) * 3.5);
    return { opacity, transform: [{ translateX: (frame.x + x * frame.scale) * size / 1000 }, { translateY: (frame.y + y * frame.scale) * size / 1000 }, { scale: frame.scale * scale }, { translateX: (area[0] + area[2] / 2) * size / 1000 }, { translateY: (area[1] + area[3]) * size / 1000 }, { rotateZ: `${angle}deg` }, { translateX: -(area[0] + area[2] / 2) * size / 1000 }, { translateY: -(area[1] + area[3]) * size / 1000 }] };
  });
  const pipeLight = useAnimatedProps(() => ({ opacity: reduced ? 0 : Math.max(pulse(reaction.value, 180, 650), pulse(mutation.value, 0, 760), pulse(mutation.value, 2600, 3350)), strokeDashoffset: 1200 * (1 - (mutation.value > 0 ? ramp(mutation.value, 2600, 3150) : ramp(reaction.value, 180, 650))) }));
  const pipeAssembly = useAnimatedStyle(() => ({ opacity: from !== to && stage === to && !reduced ? smooth(mutation.value, 2600, 3150) : 1 }));
  const core = useAnimatedProps(() => ({ opacity: reduced ? 0 : coreEnergy(reaction.value, mutation.value) * .75 }));
  const clip = `${id}-${piece}`;
  return <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'top left' }, poseStyle]}>
    <PiecePhoto stage={stage} id={clip} area={area} />
    <Animated.View style={[StyleSheet.absoluteFill, pipeAssembly]}><PiecePhoto stage={stage} id={`${clip}-conduits`} area={area} pipes /></Animated.View>
    <Svg width="100%" height="100%" viewBox="0 0 1000 1000" style={StyleSheet.absoluteFill}>
      <Defs><ClipPath id={clip}><Rect x={area[0]} y={area[1]} width={area[2]} height={area[3]} /></ClipPath>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        {!clocks.heat && stage === 1 && piece === 'core' && <ModuleElixir id={`${clip}-material`} {...clocks} />}
        {!clocks.heat && stage !== 1 && art.cavities.map((c, i) => c.x < area[0] + area[2] && c.x + c.width > area[0] && c.y < area[1] + area[3] && c.y + c.height > area[1] ? <VesselElixir key={i} cavity={c} {...clocks} id={`${clip}-tank-${i}`} /> : null)}
        <Surface cx={stage === 2 ? 620 : 500} cy={stage === 1 ? 682 : stage === 2 ? 732 : stage === 3 ? 715 : stage === 4 ? 755 : 794} rx={stage === 2 ? 34 : 38} ry="3" fill="#c2edff" animatedProps={core} />
        {art.pipes.map((d, i) => <Light key={i} d={d} fill="none" stroke="#9bd9ff" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 1200" animatedProps={pipeLight} />)}
      </G>
    </Svg>
    {clocks.heat && <ThermalLiquid stage={stage} area={area} size={size} fill={clocks.fill} heat={clocks.heat} mutation={mutation} />}
  </Animated.View>;
}

// Native transforms move this cached photograph. Liquid updates live in another
// SVG root, so they never re-rasterize the silhouette and cavity masks.
const PiecePhoto = memo(function PiecePhoto({ stage, id, area, pipes = false }: { stage: ReactorStage; id: string; area: number[]; pipes?: boolean }) {
  const art = MACHINE_ART[stage];
  return <View style={StyleSheet.absoluteFill} shouldRasterizeIOS renderToHardwareTextureAndroid>
    <Svg width="100%" height="100%" viewBox="0 0 1000 1000">
      <Defs>
        <ClipPath id={`${id}-area`}><Rect x={area[0]} y={area[1]} width={area[2]} height={area[3]} /></ClipPath>
        <Mask id={`${id}-photo`} x="0" y="0" width="1000" height="1000" maskUnits="userSpaceOnUse">
          {!pipes && <Path d={art.silhouette} fill="white" />}
          {!pipes && art.holes && <Path d={art.holes} fill="black" />}
          {art.pipes.map((d, i) => <Path key={i} d={d} fill="none" stroke={pipes ? "white" : "black"} strokeWidth="11" strokeLinecap="round" />)}
          {!pipes && stage !== 1 && art.cavities.map((c, i) => <Rect key={i} x={c.x} y={c.y} width={c.width} height={c.height} rx={c.lip} fill="black" />)}
        </Mask>
      </Defs>
      <G clipPath={`url(#${id}-area)`}><G mask={`url(#${id}-photo)`}><SvgImage href={art.source} width="1000" height="1000" /></G></G>
    </Svg>
  </View>;
}, (a, b) => a.stage === b.stage && a.id === b.id && a.pipes === b.pipes);

function Machine({ stage, size, ...props }: Props & { stage: ReactorStage; size: number }) {
  const id = `machine-${stage}-${useId().replace(/:/g, '')}`;
  const pieces: Piece[] = stage === 5 ? ['rear-left', 'rear-right', 'left', 'right', 'core', 'base-left', 'base-right'] : ['left', 'right', 'core', 'base-left', 'base-right'];
  return <>{pieces.map(piece => <MachinePiece key={piece} stage={stage} piece={piece} id={id} size={size} {...props} />)}</>;
}

export function ReactorMachine(props: Props) {
  const [size, setSize] = useState(0);
  const dormant = useSharedValue(0);
  if (props.focusModule) return <FocusedModule fill={props.fill} mutation={props.mutation} reaction={props.reaction} reduced={props.reduced} />;
  const transforming = props.active || props.from !== props.to;
  // Prepare the destination's lightweight view during assembly and keep that
  // same native view at completion, avoiding a blank image decode on handoff.
  const stages = Array.from(new Set([props.from, props.to]));
  return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={event => setSize(event.nativeEvent.layout.width)}>
    <View style={[StyleSheet.absoluteFill, { opacity: transforming ? 0 : 1 }]}>
      <RestingMachine stage={props.to} {...props} fill={transforming ? dormant : props.fill} mutation={transforming ? dormant : props.mutation} reaction={transforming ? dormant : props.reaction} />
    </View>
    {transforming && size > 0 && stages.map(stage => <Machine key={stage} stage={stage} size={size} {...props} />)}
  </View>;
}
