import { StyleSheet } from 'react-native';
import { Canvas, Circle, ColorMatrix, Group, Image, useImage, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { MACHINE_ART } from './artwork';
import type { ReactorStage } from './model';

type Clocks = { fill: SharedValue<number>; heat: SharedValue<number>; mutation: SharedValue<number> };
function Boil({ index, fill, heat, mutation }: Clocks & { index: number }) {
  const radius = 6 + index % 4 * 2;
  const p = useDerivedValue(() => (mutation.value * (.0013 + index * .00017) + index * .173) % 1);
  const cy = useDerivedValue(() => 677 - radius - p.value * Math.max(0, fill.value * 441 - 24));
  const cx = useDerivedValue(() => 387 + (index * 47 % 222) + Math.sin(p.value * 8 + index) * 9);
  const opacity = useDerivedValue(() => heat.value * Math.sin(p.value * Math.PI) * .9);
  return <Circle cx={cx} cy={cy} r={radius} color="#ffe4b6" style="stroke" strokeWidth={2} opacity={opacity} />;
}
function Tank({ image, fill, heat, mutation }: Clocks & { image: SkImage }) {
  const y = useDerivedValue(() => 687 - fill.value * 441 + Math.sin(mutation.value * .021) * heat.value * 9);
  const clear = useDerivedValue(() => { const scale = Math.max(.001, (y.value + 4 - 246) / 97); return [{ translateY: 246 - 250 * scale }, { scaleY: scale }]; });
  const body = useDerivedValue(() => { const scale = Math.max(.001, (687-y.value)/303); return [{ translateY: y.value - 378 * scale }, { scaleY: scale }]; });
  const surface = useDerivedValue(() => [{ translateY: y.value-364 }]);
  const wet = useDerivedValue(() => ({ x: 355, y: y.value, width: 288, height: Math.max(0,687-y.value) }));
  const visible = useDerivedValue(() => Math.min(1,fill.value*35));
  const matrix = useDerivedValue(() => {
    const h = heat.value, k = Math.min(1,h*3);
    return [1-k,0,k*1.2,0,0, 0,1-k,k*(.9-.8*h),0,0, k*.04,0,1-k,0,0, 0,0,0,1,0];
  });
  const photo = <Image image={image} x={0} y={0} width={1000} height={1000} fit="fill" />;
  const hot = <Image image={image} x={0} y={0} width={1000} height={1000} fit="fill"><ColorMatrix matrix={matrix} /></Image>;
  return <Group clip={{x:355,y:246,width:288,height:441}}>
    <Group transform={clear}><Group clip={{x:355,y:250,width:288,height:97}}>{photo}</Group></Group>
    <Group opacity={visible}>
      <Group transform={body}><Group clip={{x:355,y:378,width:288,height:303}}>{hot}</Group></Group>
      <Group transform={surface}><Group clip={{x:355,y:354,width:288,height:24}}>{hot}</Group></Group>
      <Group clip={wet}>
        <Group clip={{x:355,y:674,width:288,height:13}}>{hot}</Group>
        {Array.from({length:10},(_,index)=><Boil key={index} index={index} fill={fill} heat={heat} mutation={mutation} />)}
      </Group>
    </Group>
  </Group>;
}
export function ThermalLiquid({ stage, area, size, ...clocks }: Clocks & { stage: ReactorStage; area: number[]; size: number }) {
  const image = useImage(require('../../../../../assets/social/reactor/module-material-study.png'));
  if (!image) return null;
  const cavities = stage === 1 ? [{x:355,y:246,width:288,height:441}] : MACHINE_ART[stage].cavities;
  const visibleCavities = cavities.filter(c => c.x < area[0] + area[2] && c.x + c.width > area[0] && c.y < area[1] + area[3] && c.y + c.height > area[1]);
  if (!visibleCavities.length) return null;
  return <Canvas style={StyleSheet.absoluteFill}>
    <Group transform={[{scale:size/1000}]} clip={{x:area[0],y:area[1],width:area[2],height:area[3]}}>
      {visibleCavities.map((c,i)=><Group key={i} transform={[{translateX:c.x-355*c.width/288},{translateY:c.y-246*c.height/441},{scaleX:c.width/288},{scaleY:c.height/441}]}><Tank image={image} {...clocks}/></Group>)}
    </Group>
  </Canvas>;
}
