import {
  BlurMask,
  Canvas,
  Circle,
  FitBox,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  rect,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from '../matchPresentation';
import type { MatchConfrontationCanvasProps } from './MatchConfrontationCanvas.types';
import { buildMatchTerritoryPalette } from './matchConfrontationPalette';

const ARTBOARD_WIDTH = 400;
const ARTBOARD_HEIGHT = 280;
const PLATE_OUTWARD_SHIFT = 7;
const FRACTURE_ATMOSPHERE_ASSET = require('../../../../assets/hub/match-fracture-atmosphere-v1.png');

const LEFT_FACE_PATH = 'M79 59 L161 76 Q173 78 175 88 L189 162 Q191 171 180 172 L98 175 Q87 175 85 165 L72 70 Q69 59 79 59 Z';
const RIGHT_FACE_PATH = 'M245 76 L321 59 Q333 58 331 69 L324 162 Q323 172 311 172 L236 169 Q224 169 227 158 L234 87 Q235 79 245 76 Z';
const LEFT_INNER_BEVEL = 'M83 67 L158 81 Q168 82 170 90 L182 157 Q184 165 174 166 L100 168 Q92 168 90 160 L78 73 Q77 66 83 67 Z';
const RIGHT_INNER_BEVEL = 'M249 82 L317 66 Q326 65 325 73 L318 157 Q317 165 308 165 L239 163 Q232 162 233 155 L240 91 Q240 84 249 82 Z';
const LEFT_EXPOSED_EDGE = 'M79 59 L161 76 Q173 78 175 88 M175 88 L189 162 Q191 171 180 172';
const RIGHT_EXPOSED_EDGE = 'M245 76 L321 59 Q333 58 331 69 M245 76 Q235 79 234 87 L227 158 Q224 169 236 169';
const LEFT_EDGE_HIGHLIGHTS = [
  'M80 59 L122 68',
  'M139 72 L161 76 Q171 78 174 86',
  'M177 103 L182 133',
  'M185 146 L189 162 Q190 169 182 171',
] as const;
const RIGHT_EDGE_HIGHLIGHTS = [
  'M246 76 L270 70',
  'M287 67 L320 59 Q329 59 331 67',
  'M243 82 Q236 84 235 92 L231 119',
  'M229 137 L227 158 Q225 166 235 168',
] as const;
const LEFT_OPPOSITE_EDGE = 'M79 59 Q69 59 72 70 L85 165 Q87 175 98 175';
const RIGHT_OPPOSITE_EDGE = 'M331 69 L324 162 Q323 172 311 172';
const LEFT_TOP_REFLECTION = 'M79 60 L161 77 Q171 79 173 88 L175 99 L76 78 L72 69 Q70 60 79 60 Z';
const RIGHT_TOP_REFLECTION = 'M245 77 L321 60 Q331 59 330 69 L329 81 L234 101 L235 87 Q236 80 245 77 Z';

const TORN_OPENING_PATH = 'M199 -12 L191 18 L188 36 L195 55 L206 74 L203 94 L192 113 L184 132 L196 146 L200 158 L207 173 L202 192 L191 208 L185 230 L194 250 L200 292 L207 292 L202 250 L192 230 L198 208 L210 192 L215 173 L208 158 L202 145 L190 132 L199 116 L211 96 L214 77 L202 58 L194 39 L197 19 L204 -12 Z';
const LEFT_TEAR_EDGE = 'M199 -12 L191 18 L188 36 L195 55 L206 74 L203 94 L192 113 L184 132 L196 146 L200 158 L207 173 L202 192 L191 208 L185 230 L194 250 L200 292';
const RIGHT_TEAR_EDGE = 'M204 -12 L197 19 L194 39 L202 58 L214 77 L211 96 L199 116 L190 132 L202 145 L208 158 L215 173 L210 192 L198 208 L192 230 L202 250 L207 292';
const LEFT_CORE_SEGMENTS = [
  'M199 -6 L191 18 L188 36',
  'M195 55 L206 74 L203 94',
  'M192 113 L184 132',
  'M200 158 L207 173',
  'M202 192 L191 208',
  'M185 230 L194 250',
] as const;
const RIGHT_CORE_SEGMENTS = [
  'M204 -6 L197 19',
  'M194 39 L202 58 L214 77',
  'M211 96 L199 116',
  'M208 158 L215 173',
  'M210 192 L198 208',
  'M192 230 L202 250 L207 286',
] as const;
const TEAR_BRANCHES = [
  ['M195 55 L184 48', 'left'],
  ['M203 94 L191 88 L185 91', 'left'],
  ['M184 132 L171 126', 'left'],
  ['M196 146 L177 137', 'left'],
  ['M200 158 L185 165', 'left'],
  ['M207 173 L194 181', 'left'],
  ['M191 208 L178 216', 'left'],
  ['M214 77 L224 68', 'right'],
  ['M199 116 L212 109', 'right'],
  ['M202 145 L216 137', 'right'],
  ['M208 158 L228 151', 'right'],
  ['M215 173 L229 182', 'right'],
  ['M210 192 L225 201', 'right'],
] as const;

const LEFT_RAYS = [
  'M-24 18 L184 121',
  'M-18 56 L187 132',
  'M-15 103 L184 140',
  'M-15 178 L181 151',
  'M-18 227 L185 160',
  'M-24 292 L188 168',
] as const;
const RIGHT_RAYS = [
  'M424 18 L216 121',
  'M418 56 L214 132',
  'M415 103 L217 140',
  'M415 178 L220 151',
  'M418 227 L216 160',
  'M424 292 L213 168',
] as const;
const LEFT_BEAMS = [
  'M-12 12 L187 128 L10 48 Z',
  'M-18 75 L185 140 L0 112 Z',
  'M-10 278 L184 154 L24 224 Z',
] as const;
const RIGHT_BEAMS = [
  'M412 12 L214 128 L390 48 Z',
  'M418 75 L216 140 L400 112 Z',
  'M410 278 L216 154 L376 224 Z',
] as const;
const LEFT_SHARDS = [
  'M12 88 L72 36 L45 107 Z',
  'M5 194 L73 148 L48 226 Z',
  'M104 17 L158 42 L122 64 Z',
  'M105 229 L170 195 L142 260 Z',
] as const;
const RIGHT_SHARDS = [
  'M388 88 L328 36 L355 107 Z',
  'M395 194 L327 148 L352 226 Z',
  'M296 17 L242 42 L278 64 Z',
  'M295 229 L230 195 L258 260 Z',
] as const;
const DEPTH_LAYERS = [14, 11, 8, 5, 3] as const;
const DEPTH_COLORS = ['#010204', '#020509', '#03080D', '#050C13', '#071019'] as const;
const RIGHT_DEPTH_COLORS = ['#020101', '#030201', '#050302', '#070402', '#090503'] as const;
const IMPACT_RAYS = [
  ['M197 144 L184 139', .75],
  ['M196 147 L177 146', .9],
  ['M197 150 L181 157', .6],
  ['M199 141 L194 132', .52],
  ['M205 143 L218 137', .7],
  ['M205 146 L232 145', .92],
  ['M204 149 L222 157', .62],
  ['M202 151 L205 162', .48],
] as const;
const IMPACT_FRAGMENTS = [
  ['M183 139 L190 143 L184 145 Z', '#BFDFFF'],
  ['M211 137 L207 143 L216 140 Z', '#FFD3A1'],
  ['M179 151 L189 149 L183 155 Z', '#E6F3FF'],
  ['M215 153 L208 150 L220 150 Z', '#FF9A4B'],
  ['M197 133 L202 140 L197 139 Z', '#FFF6D5'],
  ['M172 145 L181 146 L175 149 Z', '#79C7FF'],
  ['M224 144 L216 147 L228 148 Z', '#FF8A42'],
  ['M209 162 L205 153 L213 164 Z', '#F6D5AE'],
  ['M188 132 L194 140 L187 137 Z', '#A9D7FF'],
  ['M218 164 L211 155 L222 161 Z', '#FFB06B'],
] as const;
const IMPACT_PARTICLES = [
  [177, 123, .72], [224, 127, .8], [169, 143, .42], [235, 147, .58],
  [181, 169, .52], [221, 176, .4], [187, 108, .34], [231, 112, .38],
  [160, 155, .3], [242, 163, .34], [176, 186, .28], [219, 195, .36],
  [187, 135, .44], [214, 160, .32], [228, 137, .26], [166, 130, .3],
  [191, 119, .25], [208, 124, .29], [183, 157, .24], [217, 151, .27],
] as const;
const IMPACT_WARM_CORE = 'M196.7 146.8 C197.8 142.4 199.7 140.8 202.8 141.8 C206 142.9 206.2 146.4 204.3 149.2 C202.1 152.5 198.2 151.3 196.7 146.8 Z';
const IMPACT_WHITE_CORE = 'M199.4 146.6 C200.1 144.4 201.5 143.8 202.7 145.1 C203.7 146.4 202.7 148.3 201 148.6 C199.8 148.7 199 147.7 199.4 146.6 Z';
const BACKGROUND_DUST = [
  [22, 33], [54, 118], [89, 25], [126, 205], [154, 79], [173, 241],
  [232, 43], [259, 196], [281, 82], [319, 226], [347, 51], [382, 148],
  [35, 244], [76, 182], [116, 143], [148, 267], [247, 255], [303, 131],
  [339, 174], [374, 263],
] as const;
const FILM_GRAIN = [
  [12, 17], [31, 73], [46, 151], [64, 238], [82, 112], [101, 269], [119, 37], [137, 184],
  [151, 124], [168, 216], [181, 58], [217, 33], [232, 189], [248, 91], [264, 246], [281, 147],
  [298, 21], [314, 104], [329, 206], [346, 69], [361, 254], [379, 132], [390, 42], [18, 266],
  [57, 28], [93, 194], [128, 91], [157, 263], [223, 119], [255, 224], [287, 273], [338, 158],
] as const;
const LEFT_FACE_GRAIN = [[91, 82], [111, 105], [137, 91], [155, 128], [104, 151], [163, 157], [126, 167]] as const;
const RIGHT_FACE_GRAIN = [[252, 95], [278, 79], [305, 89], [294, 126], [246, 143], [281, 160], [313, 150]] as const;

export default function MatchConfrontationCanvasSkia({
  height,
  leftAccent,
  leftWinner,
  reduceMotion,
  rightAccent,
  rightWinner,
  width,
}: MatchConfrontationCanvasProps) {
  const fractureTexture = useImage(FRACTURE_ATMOSPHERE_ASSET);
  const leftPalette = buildMatchTerritoryPalette(leftAccent);
  const rightPalette = buildMatchTerritoryPalette(rightAccent);
  const atmosphere = useSharedValue(reduceMotion ? .52 : 0);

  useEffect(() => {
    cancelAnimation(atmosphere);
    if (reduceMotion) {
      atmosphere.value = .52;
      return undefined;
    }
    atmosphere.value = 0;
    atmosphere.value = withRepeat(
      withTiming(1, { duration: 4_800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(atmosphere);
  }, [atmosphere, reduceMotion]);

  const impactRadius = useDerivedValue(() => 36 + atmosphere.value * 4);
  const impactOuterRadius = useDerivedValue(() => 43 + atmosphere.value * 5);
  const impactOpacity = useDerivedValue(() => .5 + atmosphere.value * .08);
  const fractureOpacity = useDerivedValue(() => .9 + atmosphere.value * .09);
  const fractureTextureOpacity = useDerivedValue(() => .4 + atmosphere.value * .035);

  return (
    <Canvas accessibilityLabel="Décor lumineux de la confrontation" style={{ height, width }}>
      <FitBox dst={rect(0, 0, width, height)} fit="fill" src={rect(0, 0, ARTBOARD_WIDTH, ARTBOARD_HEIGHT)}>
        <Rect color="#010409" height={ARTBOARD_HEIGHT} width={ARTBOARD_WIDTH} x={0} y={0} />

        <Rect height={ARTBOARD_HEIGHT} width={205} x={0} y={0}>
          <LinearGradient colors={[leftPalette.outer, leftPalette.outer, leftPalette.middle, leftPalette.nearFracture]} end={vec(204, 146)} positions={[0, .34, .79, 1]} start={vec(0, 138)} />
        </Rect>
        <Rect height={ARTBOARD_HEIGHT} width={205} x={195} y={0}>
          <LinearGradient colors={[rightPalette.nearFracture, rightPalette.middle, rightPalette.outer, rightPalette.outer]} end={vec(400, 138)} positions={[0, .21, .66, 1]} start={vec(196, 146)} />
        </Rect>

        <Circle cx={125} cy={132} r={166}>
          <RadialGradient c={vec(126, 130)} colors={[withAlpha(leftPalette.nearFracture, .37), withAlpha(leftPalette.middle, .23), 'rgba(0,0,0,0)']} positions={[0, .42, 1]} r={166} />
        </Circle>
        <Circle cx={277} cy={132} r={166}>
          <RadialGradient c={vec(276, 130)} colors={[withAlpha(rightPalette.nearFracture, .39), withAlpha(rightPalette.middle, .24), 'rgba(0,0,0,0)']} positions={[0, .42, 1]} r={166} />
        </Circle>
        <Circle color={withAlpha(leftPalette.nearFracture, .14)} cx={126} cy={128} r={88}><BlurMask blur={28} style="normal" /></Circle>
        <Circle color={withAlpha(rightPalette.nearFracture, .15)} cx={276} cy={128} r={86}><BlurMask blur={28} style="normal" /></Circle>
        <Circle color={withAlpha(leftPalette.nearFracture, .13)} cx={178} cy={145} r={72}><BlurMask blur={32} style="normal" /></Circle>
        <Circle color={withAlpha(rightPalette.nearFracture, .14)} cx={222} cy={145} r={72}><BlurMask blur={32} style="normal" /></Circle>
        <Circle color="rgba(0,0,0,.2)" cx={56} cy={226} r={96}><BlurMask blur={28} style="normal" /></Circle>
        <Circle color="rgba(0,0,0,.18)" cx={350} cy={224} r={92}><BlurMask blur={28} style="normal" /></Circle>

        {LEFT_SHARDS.map((path, index) => (
          <Path key={`left-shard-${index}`} color={withAlpha(leftAccent, index % 2 ? .026 : .044)} path={path} />
        ))}
        {RIGHT_SHARDS.map((path, index) => (
          <Path key={`right-shard-${index}`} color={withAlpha(rightAccent, index % 2 ? .026 : .047)} path={path} />
        ))}
        {LEFT_BEAMS.map((path, index) => (
          <Path key={`left-beam-${index}`} color={withAlpha(index === 1 ? '#4C9DFF' : leftAccent, index === 1 ? .04 : .024)} path={path} />
        ))}
        {RIGHT_BEAMS.map((path, index) => (
          <Path key={`right-beam-${index}`} color={withAlpha(index === 1 ? '#FF8A3D' : rightAccent, index === 1 ? .044 : .026)} path={path} />
        ))}
        {BACKGROUND_DUST.map(([cx, cy], index) => (
          <Circle key={`background-dust-${index}`} color={index < BACKGROUND_DUST.length / 2 ? withAlpha(leftPalette.local, .34) : withAlpha(rightPalette.local, .34)} cx={cx} cy={cy} opacity={index % 3 === 0 ? .22 : .1} r={index % 4 === 0 ? .65 : .38} />
        ))}
        <Group blendMode="screen">
          {LEFT_RAYS.map((path, index) => (
            <Path key={`left-ray-${index}`} color={withAlpha(index % 2 ? leftPalette.local : leftPalette.edge, [ .1, .16, .43, .34, .12, .23 ][index])} path={path} strokeCap="round" strokeWidth={[ .5, .65, 1.15, .95, .52, .76 ][index]} style="stroke" />
          ))}
          {RIGHT_RAYS.map((path, index) => (
            <Path key={`right-ray-${index}`} color={withAlpha(index % 2 ? rightPalette.local : rightPalette.edge, [ .11, .18, .4, .36, .12, .24 ][index])} path={path} strokeCap="round" strokeWidth={[ .52, .68, 1.08, 1, .5, .78 ][index]} style="stroke" />
          ))}
        </Group>
        {FILM_GRAIN.map(([cx, cy], index) => (
          <Circle key={`film-grain-${index}`} color={index % 3 === 0 ? '#FFFFFF' : '#02070C'} cx={cx} cy={cy} opacity={index % 4 === 0 ? .06 : .032} r={index % 5 === 0 ? .48 : .28} />
        ))}

        <Rect height={ARTBOARD_HEIGHT} width={ARTBOARD_WIDTH} x={0} y={0}>
          <LinearGradient colors={['rgba(0,0,0,.76)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.04)', 'rgba(0,0,0,.78)']} end={vec(200, 280)} positions={[0, .2, .68, 1]} start={vec(200, 0)} />
        </Rect>
        <Rect height={ARTBOARD_HEIGHT} width={ARTBOARD_WIDTH} x={0} y={0}>
          <LinearGradient colors={['rgba(0,0,0,.44)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.44)']} end={vec(400, 140)} positions={[0, .18, .82, 1]} start={vec(0, 140)} />
        </Rect>

        <Path color="rgba(0,0,0,.16)" path={LEFT_TEAR_EDGE} strokeCap="round" strokeJoin="round" strokeWidth={9} style="stroke"><BlurMask blur={10} style="normal" /></Path>
        <Group blendMode="screen">
          <Path color={withAlpha(leftPalette.nearFracture, .32)} path={LEFT_TEAR_EDGE} strokeCap="round" strokeJoin="round" strokeWidth={38} style="stroke"><BlurMask blur={29} style="normal" /></Path>
          <Path color={withAlpha(rightPalette.nearFracture, .34)} path={RIGHT_TEAR_EDGE} strokeCap="round" strokeJoin="round" strokeWidth={38} style="stroke"><BlurMask blur={29} style="normal" /></Path>
          <Path color={withAlpha(leftPalette.local, .52)} path={LEFT_TEAR_EDGE} strokeCap="round" strokeJoin="round" strokeWidth={13} style="stroke"><BlurMask blur={10} style="normal" /></Path>
          <Path color={withAlpha(rightPalette.local, .55)} path={RIGHT_TEAR_EDGE} strokeCap="round" strokeJoin="round" strokeWidth={13} style="stroke"><BlurMask blur={10} style="normal" /></Path>
        </Group>
        <Path color="#000104" path={TORN_OPENING_PATH} />
        {fractureTexture ? (
          <>
            <Group opacity={.72}>
              <SkiaImage fit="fill" height={288} image={fractureTexture} width={158} x={121} y={-4} />
            </Group>
            <Group blendMode="screen" opacity={fractureTextureOpacity}>
              <SkiaImage fit="fill" height={288} image={fractureTexture} width={158} x={121} y={-4} />
            </Group>
          </>
        ) : null}
        <Path color={withAlpha(leftPalette.edge, .72)} path={LEFT_TEAR_EDGE} strokeCap="round" strokeJoin="round" strokeWidth={1.35} style="stroke" />
        <Path color={withAlpha(rightPalette.edge, .76)} path={RIGHT_TEAR_EDGE} strokeCap="round" strokeJoin="round" strokeWidth={1.35} style="stroke" />
        {LEFT_CORE_SEGMENTS.map((path, index) => (
          <Group blendMode="screen" key={`left-core-${index}`}>
            <Path color={leftPalette.local} opacity={index === 0 || index === 3 || index === 5 ? .62 : .24} path={path} strokeCap="round" strokeJoin="round" strokeWidth={5.2} style="stroke"><BlurMask blur={5.2} style="normal" /></Path>
            <Path color="#F7FCFF" opacity={index === 0 || index === 3 || index === 5 ? fractureOpacity : index === 2 ? .48 : .16} path={path} strokeCap="round" strokeJoin="round" strokeWidth={index % 2 ? 1.15 : 2.1} style="stroke" />
          </Group>
        ))}
        {RIGHT_CORE_SEGMENTS.map((path, index) => (
          <Group blendMode="screen" key={`right-core-${index}`}>
            <Path color={rightPalette.local} opacity={index === 1 || index === 2 || index === 4 ? .64 : .25} path={path} strokeCap="round" strokeJoin="round" strokeWidth={5.2} style="stroke"><BlurMask blur={5.2} style="normal" /></Path>
            <Path color="#FFF8EE" opacity={index === 1 || index === 2 || index === 4 ? fractureOpacity : index === 5 ? .46 : .15} path={path} strokeCap="round" strokeJoin="round" strokeWidth={index % 2 ? 1.7 : 1.15} style="stroke" />
          </Group>
        ))}
        {TEAR_BRANCHES.map(([path, side], index) => (
          <Path key={`tear-branch-${index}`} color={side === 'left' ? leftPalette.edge : rightPalette.edge} opacity={index % 4 === 0 ? .62 : index % 3 === 0 ? .43 : .27} path={path} strokeCap="round" strokeJoin="round" strokeWidth={index % 2 ? .65 : .9} style="stroke" />
        ))}

        <PlateArtwork accent={leftAccent} facePath={LEFT_FACE_PATH} innerPath={LEFT_INNER_BEVEL} reflectionPath={LEFT_TOP_REFLECTION} side="left" winner={leftWinner} />
        <PlateArtwork accent={rightAccent} facePath={RIGHT_FACE_PATH} innerPath={RIGHT_INNER_BEVEL} reflectionPath={RIGHT_TOP_REFLECTION} side="right" winner={rightWinner} />

        <Group blendMode="screen">
          <Circle color={withAlpha(leftPalette.local, .34)} cx={194} cy={146} opacity={impactOpacity} r={impactOuterRadius}><BlurMask blur={36} style="normal" /></Circle>
          <Circle color={withAlpha(rightPalette.local, .36)} cx={207} cy={146} opacity={impactOpacity} r={impactOuterRadius}><BlurMask blur={36} style="normal" /></Circle>
          <Circle color={withAlpha(leftPalette.nearFracture, .5)} cx={195} cy={146} opacity={impactOpacity} r={impactRadius}><BlurMask blur={25} style="normal" /></Circle>
          <Circle color={withAlpha(rightPalette.nearFracture, .52)} cx={207} cy={146} opacity={impactOpacity} r={impactRadius}><BlurMask blur={25} style="normal" /></Circle>
          <Circle color="#FFE229" cx={201} cy={146} opacity={.72} r={7}><BlurMask blur={9} style="normal" /></Circle>
          <Circle color="#FFF3A1" cx={201} cy={146} opacity={.88} r={2.4}><BlurMask blur={2.8} style="normal" /></Circle>
          <Path color="#FFC43D" opacity={.55} path={IMPACT_WARM_CORE}><BlurMask blur={7.2} style="normal" /></Path>
          <Path color="#FFE58D" opacity={.62} path={IMPACT_WARM_CORE}><BlurMask blur={2.8} style="normal" /></Path>
          <Path color="#FFFFFF" path={IMPACT_WHITE_CORE} />
        </Group>
        {IMPACT_RAYS.map(([path, strokeWidth], index) => (
          <Path key={`impact-ray-${index}`} color={index % 3 === 0 ? '#FFE229' : index % 2 ? rightPalette.edge : leftPalette.edge} opacity={index % 2 ? .68 : .84} path={path} strokeCap="round" strokeWidth={strokeWidth} style="stroke" />
        ))}
        {IMPACT_FRAGMENTS.map(([path, color], index) => (
          <Path key={`impact-fragment-${index}`} color={color} opacity={index % 2 ? .34 : .52} path={path} />
        ))}
        {IMPACT_PARTICLES.map(([cx, cy, radius], index) => (
          <Circle key={`impact-particle-${index}`} color={index % 3 === 0 ? '#FFFFFF' : index % 2 ? withAlpha(rightAccent, .86) : withAlpha(leftAccent, .86)} cx={cx} cy={cy} opacity={index % 2 ? .7 : .5} r={radius}>
            {index % 4 === 0 ? <BlurMask blur={2.2} style="normal" /> : null}
          </Circle>
        ))}
      </FitBox>
    </Canvas>
  );
}

function PlateArtwork({ accent, facePath, innerPath, reflectionPath, side, winner }: {
  accent: string;
  facePath: string;
  innerPath: string;
  reflectionPath: string;
  side: 'left' | 'right';
  winner: boolean;
}) {
  const palette = buildMatchTerritoryPalette(accent);
  const outward = side === 'left' ? -1 : 1;
  const exposedEdge = side === 'left' ? LEFT_EXPOSED_EDGE : RIGHT_EXPOSED_EDGE;
  const edgeHighlights = side === 'left' ? LEFT_EDGE_HIGHLIGHTS : RIGHT_EDGE_HIGHLIGHTS;
  const oppositeEdge = side === 'left' ? LEFT_OPPOSITE_EDGE : RIGHT_OPPOSITE_EDGE;
  const faceGrain = side === 'left' ? LEFT_FACE_GRAIN : RIGHT_FACE_GRAIN;
  const faceColors = [palette.faceTop, palette.faceMiddle, '#010203'];

  return (
    <Group
      opacity={winner ? 1 : .96}
      transform={[{ translateX: outward * PLATE_OUTWARD_SHIFT }]}
    >
      <Group transform={[{ translateX: outward * 9 }, { translateY: 13 }]}> 
        <Path color={withAlpha(palette.local, .28)} path={facePath} strokeWidth={9} style="stroke"><BlurMask blur={13} style="normal" /></Path>
      </Group>
      <Group transform={[{ translateX: outward * 15 }, { translateY: 19 }]}>
        <Path color="#000000" opacity={.78} path={facePath}><BlurMask blur={15} style="normal" /></Path>
      </Group>
      {DEPTH_LAYERS.map((depth, index) => (
        <Group key={`${side}-depth-${depth}`} transform={[{ translateX: outward * depth * .72 }, { translateY: depth }]}>
          <Path color={side === 'left' ? DEPTH_COLORS[index] : RIGHT_DEPTH_COLORS[index]} path={facePath} />
        </Group>
      ))}
      <Group transform={[{ translateX: outward * 10.08 }, { translateY: 14 }]}> 
        <Path color={withAlpha(palette.local, .19)} path={facePath} strokeWidth={.8} style="stroke" />
      </Group>
      <Group transform={[{ translateX: outward * 2.2 }, { translateY: 3.2 }]}>
        <Path color="#000103" path={facePath} />
        <Path color="#000000" path={facePath} strokeWidth={2.4} style="stroke" />
      </Group>
      <Path color="#071019" path={facePath}>
        <LinearGradient colors={faceColors} end={side === 'left' ? vec(190, 174) : vec(226, 170)} positions={[0, .42, 1]} start={side === 'left' ? vec(72, 59) : vec(332, 59)} />
      </Path>
      <Path color="rgba(0,0,0,.44)" path={facePath}>
        <RadialGradient c={side === 'left' ? vec(155, 94) : vec(250, 94)} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,.08)', 'rgba(0,0,0,.62)']} positions={[0, .55, 1]} r={104} />
      </Path>
      <Group blendMode="screen">
        <Path color={withAlpha(palette.local, winner ? .17 : .12)} path={facePath} strokeWidth={13} style="stroke"><BlurMask blur={18} style="normal" /></Path>
        <Path color={withAlpha(palette.local, winner ? .35 : .25)} path={facePath} strokeWidth={6.4} style="stroke"><BlurMask blur={10} style="normal" /></Path>
        <Path color={withAlpha(palette.local, .78)} path={exposedEdge} strokeCap="round" strokeJoin="round" strokeWidth={9.5} style="stroke"><BlurMask blur={15} style="normal" /></Path>
      </Group>
      <Path color={withAlpha(palette.local, winner ? .55 : .42)} path={facePath} strokeWidth={winner ? 1.35 : 1.05} style="stroke" />
      <Path color={withAlpha(palette.edge, .09)} path={reflectionPath} />
      <Path color="rgba(0,0,0,.7)" path={oppositeEdge} strokeCap="round" strokeJoin="round" strokeWidth={4.5} style="stroke"><BlurMask blur={2.4} style="normal" /></Path>
      <Path color="#000000" path={innerPath} strokeWidth={2.4} style="stroke" />
      <Path color={withAlpha(palette.local, .07)} path={innerPath} strokeWidth={.55} style="stroke" />
      {faceGrain.map(([cx, cy], index) => (
        <Circle key={`${side}-face-grain-${index}`} color={index % 2 ? '#FFFFFF' : palette.local} cx={cx} cy={cy} opacity={index % 3 === 0 ? .045 : .025} r={index % 2 ? .42 : .3} />
      ))}
      {edgeHighlights.map((path, index) => (
        <Group key={`${side}-edge-highlight-${index}`}>
          <Path color={withAlpha(palette.edge, index % 2 ? .48 : .68)} path={path} strokeCap="round" strokeJoin="round" strokeWidth={index % 2 ? .85 : 1.05} style="stroke" />
          <Path color={withAlpha(palette.local, index % 2 ? .86 : 1)} path={path} strokeCap="round" strokeJoin="round" strokeWidth={.55} style="stroke" />
        </Group>
      ))}
    </Group>
  );
}
