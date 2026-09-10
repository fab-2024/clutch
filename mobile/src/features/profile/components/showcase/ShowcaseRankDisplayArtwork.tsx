import { useId } from 'react';
import { View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { ClipPath, Defs, FeColorMatrix, Filter, Image as SvgImage, Path } from 'react-native-svg';
import type { ShowcaseRankDisplayDefinition } from '@/src/features/shop/showcaseRankDisplayCatalog';

// The extracted overlays also made metal/stone translucent. Restore their density
// at render time while keeping empty pixels transparent and preserving soft glow.
const MATERIAL_ALPHA = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 6 -0.08';

export default function ShowcaseRankDisplayArtwork({ source, name, style, testID, restoreOpacity = true, foregroundClip }: {
  source: ImageSourcePropType;
  name: string;
  style?: StyleProp<ViewStyle>;
  testID: string;
  restoreOpacity?: boolean;
  foregroundClip?: ShowcaseRankDisplayDefinition['foregroundClip'];
}) {
  const filterId = `display-material-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <View accessibilityLabel={foregroundClip ? undefined : `Écrin de rang ${name}`} accessible={!foregroundClip} pointerEvents="none" style={style} testID={testID}>
      <Svg width="100%" height="100%" viewBox={foregroundClip?.viewBox} accessible={false}>
        <Defs>
          {foregroundClip ? <ClipPath id={`${filterId}-front`}><Path d={foregroundClip.path} /></ClipPath> : null}
          <Filter id={filterId} x="0" y="0" width="100%" height="100%">
            <FeColorMatrix type="matrix" values={MATERIAL_ALPHA} />
            <FeColorMatrix type="saturate" values="1.15" />
          </Filter>
        </Defs>
        <SvgImage href={source} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" clipPath={foregroundClip ? `url(#${filterId}-front)` : undefined} filter={restoreOpacity ? `url(#${filterId})` : undefined} />
      </Svg>
    </View>
  );
}
