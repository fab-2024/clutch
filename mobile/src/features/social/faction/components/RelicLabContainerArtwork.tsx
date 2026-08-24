import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

export default function RelicLabContainerArtwork({ source }: {
  source: ImageSourcePropType;
}) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={source}
      style={styles.asset}
    />
  );
}

const styles = StyleSheet.create({
  asset: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
