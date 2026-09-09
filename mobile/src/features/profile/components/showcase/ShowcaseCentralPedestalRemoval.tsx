import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Image as SvgImage, Mask, Polygon } from 'react-native-svg';

import { showcaseCentralPedestalBackdrop } from '@/src/features/shop/showcaseCentralPedestalCatalog';

type Props = {
  roomId: string;
  imageLayout: { width: number; height: number; left: number; top: number };
};

export default function ShowcaseCentralPedestalRemoval({ roomId, imageLayout }: Props) {
  const maskId = `central-pedestal-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const backdrop = showcaseCentralPedestalBackdrop(roomId);
  if (!backdrop) return null;

  return (
    <Svg
      accessible={false}
      pointerEvents="none"
      preserveAspectRatio="none"
      style={[styles.layer, imageLayout]}
      testID="showcase-central-pedestal-removal"
      viewBox="0 0 100 100"
    >
      <Defs>
        <Mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          {[1.6, 1.2, 0.8, 0.4].map((strokeWidth) => (
            <Polygon key={strokeWidth} points={backdrop.outline} fill="none" stroke="white" strokeWidth={strokeWidth} strokeLinejoin="round" opacity={0.2} />
          ))}
          <Polygon points={backdrop.outline} fill="white" />
        </Mask>
      </Defs>
      <SvgImage href={backdrop.floor} width="100" height="100" preserveAspectRatio="none" mask={`url(#${maskId})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({ layer: { position: 'absolute' } });
