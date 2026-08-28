import { useWindowDimensions } from 'react-native';

import { layout } from '@/src/theme';

export type ResponsiveLayout = {
  isCompactWidth: boolean;
  isLandscape: boolean;
  isShortLandscape: boolean;
};

export function responsiveLayoutFor(width: number, height: number): ResponsiveLayout {
  const isLandscape = width > height;

  return {
    isCompactWidth: width < layout.compactWidthBreakpoint,
    isLandscape,
    isShortLandscape: isLandscape && height < layout.shortLandscapeMaxHeight,
  };
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { height, width } = useWindowDimensions();
  return responsiveLayoutFor(width, height);
}
