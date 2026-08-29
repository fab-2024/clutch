import { Image, type ImageContentFit, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { colors } from '@/src/theme';

type RemoteImageProps = Omit<
  ImageProps,
  'cachePolicy' | 'contentFit' | 'onDisplay' | 'onError' | 'source' | 'style' | 'transition'
> & {
  contentFit?: ImageContentFit;
  onDisplay?: () => void;
  onError?: () => void;
  placeholderColor?: string;
  style: StyleProp<ViewStyle>;
  transitionDuration?: number;
  uri: string;
};

export function RemoteImage({
  contentFit = 'cover',
  onDisplay,
  onError,
  placeholderColor = colors.surfaceLow,
  style,
  transitionDuration = 140,
  uri,
  ...imageProps
}: RemoteImageProps) {
  const reduceMotion = useReducedMotion();
  const [displayedUri, setDisplayedUri] = useState<string | null>(null);
  const displayed = displayedUri === uri;

  return (
    <View style={[styles.frame, { backgroundColor: placeholderColor }, style]}>
      <Image
        {...imageProps}
        cachePolicy="memory-disk"
        contentFit={contentFit}
        onDisplay={() => {
          setDisplayedUri(uri);
          onDisplay?.();
        }}
        onError={onError}
        recyclingKey={uri}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        transition={reduceMotion ? 0 : transitionDuration}
      />
      {!displayed ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: placeholderColor }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  placeholder: {
    opacity: 0.34,
  },
});
