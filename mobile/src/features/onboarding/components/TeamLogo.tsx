import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { fonts } from '@/src/theme';

import { TEAM_LOGOS } from '../teamLogos';

const LIGHT_MONOCHROME_LOGOS = new Set(['G2 Esports', 'Karmine Corp', 'SK Gaming']);

type TeamLogoProps = {
  accent: string;
  name: string;
  size: number;
  tag: string;
  uri?: string | null;
};

export default function TeamLogo({ accent, name, size, tag, uri }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const source = uri || TEAM_LOGOS[name];
  const isSvg = source ? /\.svg(?:$|\?)/i.test(source) : false;
  const showImage = Boolean(source && !failed);
  const markSize = Math.round(size * 0.72);
  const tintColor = LIGHT_MONOCHROME_LOGOS.has(name) ? '#F6F8F3' : undefined;

  return (
    <View
      style={[
        styles.holder,
        { width: size, height: size, borderRadius: size * 0.3, borderColor: accent },
        showImage && styles.imageHolder,
      ]}
    >
      {showImage && isSvg && Platform.OS !== 'web' ? (
        <SvgUri color={tintColor} fill={tintColor} height={markSize} onError={() => setFailed(true)} uri={source} width={markSize} />
      ) : showImage ? (
        <Image
          onError={() => setFailed(true)}
          resizeMode="contain"
          source={{ uri: source }}
          style={{ width: markSize, height: markSize }}
          tintColor={tintColor}
        />
      ) : (
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.tag, { color: accent }]}>{tag}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1116' },
  imageHolder: { backgroundColor: '#05070A', boxShadow: 'inset 0 0 18px rgba(255,255,255,.035)' },
  tag: { maxWidth: '78%', fontFamily: fonts.bold, fontSize: 11 },
});
