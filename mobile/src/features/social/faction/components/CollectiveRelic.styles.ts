import { StyleSheet } from 'react-native';

export const COMPACT_RELIC_SCALE = 1.16;

export const relicStyles = StyleSheet.create({
  stage: {
    position: 'relative',
    zIndex: 2,
    height: 365,
    marginTop: -58,
    marginHorizontal: -10,
    marginBottom: -3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#010308',
    outlineWidth: 0,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
  },
  stageCompact: {
    height: 330,
    marginTop: -30,
    marginHorizontal: -22,
    marginBottom: -5,
    transform: [{ scale: COMPACT_RELIC_SCALE }],
  },
  vesselSlot: {
    position: 'absolute',
    zIndex: 1,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
