import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import { withAlpha } from '../matchPresentation';
import type { MatchConfrontationCanvasProps } from './MatchConfrontationCanvas.types';
import { buildMatchTerritoryPalette } from './matchConfrontationPalette';

const SKIA_WEB_OPTIONS = { locateFile: () => '/canvaskit.wasm' };
const loadCanvas = () => import('./MatchConfrontationCanvasSkia');
const LEFT_FACE_PATH = 'M84 59 L158 76 Q168 78 170 88 L183 162 Q185 171 175 172 L101 175 Q91 175 89 165 L77 70 Q75 59 84 59 Z';
const RIGHT_FACE_PATH = 'M248 76 L315 59 Q325 58 323 69 L317 162 Q316 172 306 172 L241 169 Q231 169 233 158 L239 87 Q240 79 248 76 Z';
const TORN_OPENING_PATH = 'M199 -12 L191 18 L188 36 L195 55 L206 74 L203 94 L192 113 L184 132 L196 146 L200 158 L207 173 L202 192 L191 208 L185 230 L194 250 L200 292 L207 292 L202 250 L192 230 L198 208 L210 192 L215 173 L208 158 L202 145 L190 132 L199 116 L211 96 L214 77 L202 58 L194 39 L197 19 L204 -12 Z';
const LEFT_TEAR_EDGE = 'M199 -12 L191 18 L188 36 L195 55 L206 74 L203 94 L192 113 L184 132 L196 146 L200 158 L207 173 L202 192 L191 208 L185 230 L194 250 L200 292';
const RIGHT_TEAR_EDGE = 'M204 -12 L197 19 L194 39 L202 58 L214 77 L211 96 L199 116 L190 132 L202 145 L208 158 L215 173 L210 192 L198 208 L192 230 L202 250 L207 292';

export default function MatchConfrontationCanvasWeb(props: MatchConfrontationCanvasProps) {
  return (
    <WithSkiaWeb
      componentProps={props}
      fallback={<MatchConfrontationFallback {...props} />}
      getComponent={loadCanvas}
      opts={SKIA_WEB_OPTIONS}
    />
  );
}

function MatchConfrontationFallback({ height, leftAccent, rightAccent, width }: MatchConfrontationCanvasProps) {
  const leftPalette = buildMatchTerritoryPalette(leftAccent);
  const rightPalette = buildMatchTerritoryPalette(rightAccent);
  return (
    <View pointerEvents="none" style={{ height, width }}>
      <View style={styles.territories}>
        <LinearGradient
          colors={[leftPalette.outer, leftPalette.middle, leftPalette.nearFracture]}
          end={{ x: 1, y: .56 }}
          start={{ x: 0, y: .5 }}
          style={styles.territory}
        />
        <LinearGradient
          colors={[rightPalette.nearFracture, rightPalette.middle, rightPalette.outer]}
          end={{ x: 1, y: .5 }}
          start={{ x: 0, y: .56 }}
          style={styles.territory}
        />
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,.64)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.72)']}
        end={{ x: .5, y: 1 }}
        start={{ x: .5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg height="100%" preserveAspectRatio="none" style={StyleSheet.absoluteFill} viewBox="0 0 400 280" width="100%">
        <Defs>
          <SvgLinearGradient id="fallback-left-face" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={leftPalette.faceTop} />
            <Stop offset=".5" stopColor={leftPalette.faceMiddle} />
            <Stop offset="1" stopColor="#010305" />
          </SvgLinearGradient>
          <SvgLinearGradient id="fallback-right-face" x1="1" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={rightPalette.faceTop} />
            <Stop offset=".5" stopColor={rightPalette.faceMiddle} />
            <Stop offset="1" stopColor="#010203" />
          </SvgLinearGradient>
        </Defs>
        <Path d={TORN_OPENING_PATH} fill="#000104" />
        <Path d={LEFT_TEAR_EDGE} fill="none" stroke={leftPalette.edge} strokeOpacity=".7" strokeWidth="2.4" />
        <Path d={RIGHT_TEAR_EDGE} fill="none" stroke={rightPalette.edge} strokeOpacity=".74" strokeWidth="2.4" />
        <Path d={LEFT_FACE_PATH} fill="#010204" transform="translate(-15 12)" />
        <Path d={LEFT_FACE_PATH} fill={leftPalette.outer} stroke={withAlpha(leftPalette.local, .48)} transform="translate(-11 7)" />
        <Path d={LEFT_FACE_PATH} fill="url(#fallback-left-face)" stroke={leftPalette.local} strokeWidth="1.6" transform="translate(-7 0)" />
        <Path d={RIGHT_FACE_PATH} fill="#050201" transform="translate(15 12)" />
        <Path d={RIGHT_FACE_PATH} fill={rightPalette.outer} stroke={withAlpha(rightPalette.local, .48)} transform="translate(11 7)" />
        <Path d={RIGHT_FACE_PATH} fill="url(#fallback-right-face)" stroke={rightPalette.local} strokeWidth="1.6" transform="translate(7 0)" />
        <Circle cx="201" cy="146" fill="rgba(255,216,90,.28)" r="18" />
        <Path d="M190 148 Q194 139 200 141 Q205 134 210 142 Q218 145 211 151 Q211 159 202 156 Q195 162 193 153 Q184 151 190 148 Z" fill="#FFF9E8" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  territories: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
    backgroundColor: '#03070B',
  },
  territory: {
    height: '100%',
    width: '50%',
  },
});
