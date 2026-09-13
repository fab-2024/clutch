import { useId } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { ramp, REACTION_DURATION } from './motion';
import { OVERHEAT_DURATION } from './overheatMotion';
import { relicBackdropEnergy } from './relicBackdropMotion';

const chamberBackdrop = require('../../../../../assets/social/reactor/relic-chamber-backdrop.png');

type Props = {
  accent: string;
  mutation: SharedValue<number>;
  reaction: SharedValue<number>;
  reduced: boolean;
  teamLogo?: string | null;
  teamName: string;
  teamTag: string;
};

export function RelicChamberBackdrop({ accent, mutation, reaction, reduced, teamLogo, teamName, teamTag }: Props) {
  const activeStyle = useAnimatedStyle(() => ({
    opacity: relicBackdropEnergy(reaction.value, mutation.value, reduced),
  }));
  const markStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0, transform: [{ scale: .96 }] };
    const touch = Math.min(ramp(reaction.value, 20, 180), 1 - ramp(reaction.value, 1180, REACTION_DURATION));
    const evolution = Math.min(ramp(mutation.value, 0, 220), 1 - ramp(mutation.value, OVERHEAT_DURATION - 620, OVERHEAT_DURATION));
    const energy = Math.max(0, Math.min(1, Math.max(touch, evolution)));
    return { opacity: energy * .78, transform: [{ scale: .96 + energy * .04 }] };
  });
  const dormantStyle = useAnimatedStyle(() => ({
    opacity: relicBackdropEnergy(reaction.value, mutation.value, reduced) > 0 ? 0 : 1,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image resizeMode="cover" source={chamberBackdrop} style={styles.chamberPlate} />
      <LinearGradient
        colors={['rgba(0,0,0,.22)', 'transparent', 'rgba(0,0,0,.3)']}
        locations={[0, .38, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.dormantTeamMark, dormantStyle]}>
        <View style={styles.engravingShadow}>
          <TeamLogo accent="#000" contentScale={.9} frameless name={teamName} size={148} tag={teamTag} tintColor="#000" uri={teamLogo} />
        </View>
        <View style={styles.engravingFace}>
          <TeamLogo accent="#62696D" contentScale={.9} frameless name={teamName} size={148} tag={teamTag} tintColor="#62696D" uri={teamLogo} />
        </View>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, activeStyle]}>
        <ActiveArchitectureLight accent={accent} />
      </Animated.View>
      <Animated.View style={[styles.teamMark, markStyle]}>
        <TeamLogo accent={accent} contentScale={.9} frameless name={teamName} size={148} tag={teamTag} tintColor={accent} uri={teamLogo} />
      </Animated.View>

    </View>
  );
}

function ActiveArchitectureLight({ accent }: { accent: string }) {
  const key = useId().replace(/:/g, '');
  const id = `${key}-active-chamber`;

  return (
    <Svg height="100%" pointerEvents="none" preserveAspectRatio="none" style={StyleSheet.absoluteFill} viewBox="0 0 400 400" width="100%">
      <Defs>
        <RadialGradient cx="50%" cy="35%" id={`${id}-wall`} r="58%">
          <Stop offset="0" stopColor={accent} stopOpacity=".3" />
          <Stop offset=".5" stopColor={accent} stopOpacity=".08" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient cx="50%" cy="79%" id={`${id}-floor`} r="45%">
          <Stop offset="0" stopColor={accent} stopOpacity=".5" />
          <Stop offset=".45" stopColor={accent} stopOpacity=".13" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
        <SvgLinearGradient id={`${id}-seam`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity="0" />
          <Stop offset=".32" stopColor={accent} stopOpacity=".75" />
          <Stop offset=".72" stopColor={accent} stopOpacity=".34" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>
      <Rect fill={`url(#${id}-wall)`} height="316" width="346" x="27" />
      <Rect fill={`url(#${id}-floor)`} height="132" width="370" x="15" y="268" />
      <Path d="M42 85 L62 113 L68 253 L47 282 M358 85 L338 113 L332 253 L353 282" fill="none" opacity=".16" stroke={accent} strokeLinecap="round" strokeWidth="8" />
      <Path d="M42 85 L62 113 L68 253 L47 282" fill="none" opacity=".76" stroke={`url(#${id}-seam)`} strokeLinecap="round" strokeWidth="2" />
      <Path d="M358 85 L338 113 L332 253 L353 282" fill="none" opacity=".76" stroke={`url(#${id}-seam)`} strokeLinecap="round" strokeWidth="2" />
      <Path d="M75 300 C150 292 249 292 325 301" fill="none" opacity=".62" stroke={accent} strokeLinecap="round" strokeWidth="1.4" />
      <Path d="M122 317 C168 311 232 311 279 318" fill="none" opacity=".24" stroke={accent} strokeLinecap="round" strokeWidth=".8" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  chamberPlate: {
    position: 'absolute',
    inset: 0,
    height: '100%',
    width: '100%',
  },
  dormantTeamMark: {
    position: 'absolute',
    width: 148,
    height: 148,
    left: '50%',
    top: '3%',
    marginLeft: -74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engravingShadow: {
    position: 'absolute',
    top: 3,
    opacity: .82,
  },
  engravingFace: {
    position: 'absolute',
    top: 0,
    opacity: .34,
  },
  teamMark: {
    position: 'absolute',
    width: 148,
    height: 148,
    left: '50%',
    top: '3%',
    marginLeft: -74,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
