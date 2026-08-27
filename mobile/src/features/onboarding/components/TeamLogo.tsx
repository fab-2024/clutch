import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { fonts } from '@/src/theme';

import { TEAM_LOGOS } from '../teamLogos';

const LIGHT_MONOCHROME_LOGOS = new Set(['G2 Esports', 'Karmine Corp', 'SK Gaming']);

type TeamLogoProps = {
  accent: string;
  contentScale?: number;
  frameless?: boolean;
  name: string;
  size: number;
  tag: string;
  tintColor?: string | null;
  uri?: string | null;
};

export default function TeamLogo({ accent, contentScale, frameless = false, name, size, tag, tintColor: tintOverride, uri }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const source = uri || TEAM_LOGOS[name];
  const isSvg = source ? /\.svg(?:$|\?)/i.test(source) : false;
  const showImage = Boolean(source && !failed);
  const markSize = Math.round(size * (contentScale ?? (frameless ? 0.86 : 0.72)));
  const defaultTintColor = LIGHT_MONOCHROME_LOGOS.has(name) ? '#F6F8F3' : undefined;
  const tintColor = tintOverride === null ? undefined : (tintOverride ?? defaultTintColor);

  useEffect(() => { setFailed(false); }, [source]);

  return (
    <View
      style={[
        styles.holder,
        { width: size, height: size, borderRadius: size * 0.3, borderColor: accent },
        showImage && !frameless && styles.imageHolder,
        frameless && styles.frameless,
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
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.tag, { color: accent }, frameless && { fontSize: Math.max(11, Math.round(size * .23)) }]}
        >
          {tag}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1116' },
  imageHolder: { backgroundColor: '#05070A', boxShadow: 'inset 0 0 18px rgba(255,255,255,.035)' },
  frameless: { borderWidth: 0, backgroundColor: 'transparent' },
  tag: { maxWidth: '78%', fontFamily: fonts.bold, fontSize: 11 },
});
