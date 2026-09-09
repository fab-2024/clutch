import { useId } from 'react';
import { View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from 'react-native-svg';

// The extracted overlays also made metal/stone translucent. Restore their density
// at render time while keeping empty pixels transparent and preserving soft glow.
const MATERIAL_ALPHA = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 6 -0.08';

export default function ShowcaseRankDisplayArtwork({ source, name, style, testID, restoreOpacity = true }: {
  source: ImageSourcePropType;
  name: string;
  style?: StyleProp<ViewStyle>;
  testID: string;
  restoreOpacity?: boolean;
}) {
  const filterId = `display-material-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <View accessibilityLabel={`Écrin de rang ${name}`} accessible pointerEvents="none" style={style} testID={testID}>
      <Svg width="100%" height="100%" accessible={false}>
        <Defs>
          <Filter id={filterId} x="0" y="0" width="100%" height="100%">
            <FeColorMatrix type="matrix" values={MATERIAL_ALPHA} />
            <FeColorMatrix type="saturate" values="1.15" />
          </Filter>
        </Defs>
        <SvgImage href={source} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" filter={restoreOpacity ? `url(#${filterId})` : undefined} />
      </Svg>
    </View>
  );
}
