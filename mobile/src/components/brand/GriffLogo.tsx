import { Image, type ImageStyle, type StyleProp } from 'react-native';

type GriffMarkProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

type GriffLockupProps = {
  width?: number;
  style?: StyleProp<ImageStyle>;
};

const MARK_SOURCE = require('../../../assets/brand/griff-mark.png');
const LOCKUP_SOURCE = require('../../../assets/brand/griff-lockup.png');

export function GriffMark({ size = 40, style }: GriffMarkProps) {
  return (
    <Image
      accessibilityLabel="Logo GRIFF"
      accessibilityRole="image"
      resizeMode="contain"
      source={MARK_SOURCE}
      style={[{ width: size, height: size }, style]}
    />
  );
}

export function GriffLockup({ width = 116, style }: GriffLockupProps) {
  return (
    <Image
      accessibilityLabel="GRIFF"
      accessibilityRole="image"
      resizeMode="contain"
      source={LOCKUP_SOURCE}
      style={[{ width, height: width / (960 / 280) }, style]}
    />
  );
}
