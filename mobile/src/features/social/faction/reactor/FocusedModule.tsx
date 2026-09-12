import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Image as SvgImage, Mask, Path } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
import { MACHINE_ART, machineFrame } from './artwork';
import type { ReactorStage } from './model';
import { VesselElixir } from './VesselElixir';
import { PipeReaction } from './PipeReaction';
import { ModuleElixir } from './ModuleElixir';

const MODULE_BOX = '200 360 600 600';

// A separate SVG root is essential: updates to the liquid must not invalidate
// the machine's photograph and offscreen masks on every animation frame.
const ModuleHousing = memo(function ModuleHousing({ stage, box }: { stage: ReactorStage; box: string }) {
  const ART = MACHINE_ART[stage], frame = machineFrame(stage);
  const TRANSFORM = `translate(${frame.x} ${frame.y}) scale(${frame.scale})`;
  const id = `housing-${useId().replace(/:/g, '')}`;
  return <Svg width="100%" height="100%" viewBox={box} style={StyleSheet.absoluteFill}>
    <Defs><Mask id={id} x="0" y="0" width="1000" height="1000" maskUnits="userSpaceOnUse">
      <Path d={ART.silhouette} fill="white" />
      {ART.holes && <Path d={ART.holes} fill="black" />}
    </Mask></Defs>
    <G transform={TRANSFORM}><G mask={`url(#${id})`}><SvgImage href={ART.source} width="1000" height="1000" /></G></G>
  </Svg>;
});

type Props = { fill: SharedValue<number>; reaction: SharedValue<number>; mutation: SharedValue<number>; reduced: boolean };
export function FocusedModule(props: Props) {
  return <RestingMachine stage={1} box={MODULE_BOX} {...props} />;
}

export function RestingMachine({ stage, box = '0 0 1000 1000', ...props }: Props & { stage: ReactorStage; box?: string }) {
  const id = `resting-liquid-${useId().replace(/:/g, '')}`;
  const art = MACHINE_ART[stage], frame = machineFrame(stage);
  const transform = `translate(${frame.x} ${frame.y}) scale(${frame.scale})`;
  return <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <ModuleHousing stage={stage} box={box} />
    <Svg width="100%" height="100%" viewBox={box} style={StyleSheet.absoluteFill}>
      <G transform={transform}>
        {stage === 1 ? <ModuleElixir id={id} {...props} /> : art.cavities.map((cavity, i) => <VesselElixir key={i} cavity={cavity} id={`${id}-${i}`} {...props} />)}
      </G>
    </Svg>
    {<Svg width="100%" height="100%" viewBox={box} style={StyleSheet.absoluteFill}>
      <G transform={transform}><PipeReaction stage={stage} reaction={props.reaction} mutation={props.mutation} reduced={props.reduced} /></G>
    </Svg>}
  </View>;
}
