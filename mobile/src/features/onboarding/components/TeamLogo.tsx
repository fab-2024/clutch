import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { RemoteImage } from '@/src/components/ui/RemoteImage';
import { fonts } from '@/src/theme';

import { resolveTeamLogoUri } from '../teamLogos';

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
  const [failure, setFailure] = useState<{ mode: 'svg' | 'tag'; source: string } | null>(null);
  const source = resolveTeamLogoUri(name, uri);
  const isSvg = source ? /\.svg(?:$|\?)/i.test(source) : false;
  const fallback = source && failure?.source === source ? failure.mode : 'none';
  const showImage = Boolean(source && fallback === 'none');
  const showSvgFallback = Boolean(source && fallback === 'svg');
  const markSize = Math.round(size * (contentScale ?? (frameless ? 0.86 : 0.72)));
  const defaultTintColor = LIGHT_MONOCHROME_LOGOS.has(name) ? '#F6F8F3' : undefined;
  const tintColor = tintOverride === null ? undefined : (tintOverride ?? defaultTintColor);

  return (
    <View
      style={[
        styles.holder,
        { width: size, height: size, borderRadius: size * 0.3, borderColor: accent },
        showImage && !frameless && styles.imageHolder,
        frameless && styles.frameless,
      ]}
    >
      {showImage && source ? (
        <RemoteImage
          contentFit="contain"
          onError={() => setFailure({ mode: isSvg && Platform.OS !== 'web' ? 'svg' : 'tag', source })}
          placeholderColor="transparent"
          style={{ width: markSize, height: markSize }}
          tintColor={tintColor}
          uri={source}
        />
      ) : showSvgFallback && source ? (
        <SvgUri color={tintColor} fill={tintColor} height={markSize} onError={() => setFailure({ mode: 'tag', source })} uri={source} width={markSize} />
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
