import { StyleSheet } from 'react-native';

import { colors, fonts, typography } from '@/src/theme';

export const relicStyles = StyleSheet.create({
  stage: {
    position: 'relative', height: 350, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', outlineWidth: 0, backgroundColor: '#000000',
  },
  stageFocused: { outlineWidth: 1, outlineStyle: 'solid', outlineColor: 'rgba(205,151,65,.48)' },
  stagePressed: { transform: [{ scale: .994 }] },
  backgroundAura: {
    position: 'absolute', width: 270, height: 270, borderRadius: 135,
    backgroundColor: 'rgba(28,89,99,.035)', boxShadow: '0 0 70px rgba(38,134,151,.055)',
  },
  mutationAura: {
    position: 'absolute', zIndex: 1, width: 210, height: 210, borderRadius: 105,
    backgroundColor: 'rgba(224,163,49,.26)', boxShadow: '0 0 70px rgba(224,163,49,.5)',
  },
  image: { zIndex: 3, width: 310, height: 334 },
  coreGlow: {
    position: 'absolute', zIndex: 5, left: '50%', width: 48, height: 48,
    marginLeft: -24, borderRadius: 24, backgroundColor: 'rgba(225,153,41,.44)',
    boxShadow: '0 0 24px rgba(240,170,48,.64)',
  },
  coreSpark: {
    position: 'absolute', left: 14, top: 13, width: 17, height: 17, borderRadius: 9,
    backgroundColor: 'rgba(255,221,106,.62)', boxShadow: '0 0 12px rgba(255,218,94,.72)',
  },
  liquidWave: {
    position: 'absolute', zIndex: 6, left: '50%', width: 112, height: 32,
    marginLeft: -56, borderRadius: 56, borderWidth: 1.5, borderColor: 'rgba(218,165,72,.58)',
  },
  veinField: { position: 'absolute', zIndex: 6, left: '50%', width: 110, height: 120, marginLeft: -55 },
  vein: {
    position: 'absolute', left: '50%', bottom: 18, width: 1.5, height: 83,
    backgroundColor: 'rgba(242,171,52,.62)', boxShadow: '0 0 6px rgba(245,180,59,.68)',
    transformOrigin: 'bottom',
  },
  bubble: {
    position: 'absolute', zIndex: 7, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255,227,174,.72)', backgroundColor: 'rgba(225,169,82,.1)',
    boxShadow: 'inset -2px -2px 4px rgba(28,9,2,.55), 0 0 8px rgba(223,154,49,.36)',
  },
  bubbleHighlight: {
    position: 'absolute', width: '31%', height: '31%', left: '16%', top: '13%',
    borderRadius: 99, backgroundColor: 'rgba(255,255,237,.84)',
  },
  bubbleDepth: {
    position: 'absolute', width: '45%', height: '45%', right: '7%', bottom: '7%',
    borderRadius: 99, backgroundColor: 'rgba(49,14,3,.3)',
  },
  particle: {
    position: 'absolute', zIndex: 8, left: '50%', borderRadius: 99,
    backgroundColor: colors.volt, boxShadow: '0 0 8px rgba(232,255,61,.7)',
  },
  vapor: {
    position: 'absolute', zIndex: 6, left: '50%', width: 72, height: 18,
    marginLeft: -36, borderRadius: 36, borderTopWidth: 1.5, borderTopColor: 'rgba(158,202,205,.42)',
  },
  arc: {
    position: 'absolute', zIndex: 7, left: '50%', width: 130, height: 74,
    marginLeft: -65, borderRadius: 65, borderTopWidth: 1.5, borderTopColor: 'rgba(225,255,78,.6)',
    boxShadow: '0 0 7px rgba(225,255,78,.28)',
  },
  crackField: { position: 'absolute', zIndex: 9, left: '50%', width: 155, height: 165, marginLeft: -77.5 },
  crack: {
    position: 'absolute', width: 1.2, height: 64, backgroundColor: 'rgba(212,245,187,.72)',
    boxShadow: '0 0 5px rgba(222,255,176,.5)',
  },
  vignette: { position: 'absolute', zIndex: 10, width: '100%', height: '100%' },
  hint: {
    position: 'absolute', zIndex: 12, minHeight: 27, bottom: 2, paddingHorizontal: 10,
    borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(5,7,8,.9)', borderWidth: 1, borderColor: '#4A3922',
  },
  hintDisabled: { opacity: .52 },
  hintDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D39A3F', boxShadow: '0 0 7px rgba(255,194,65,.5)' },
  hintText: { ...typography.label, color: '#C6A274', letterSpacing: .35 },
  reveal: {
    position: 'absolute', zIndex: 15, top: 18, minWidth: 176, paddingHorizontal: 17,
    paddingVertical: 10, borderRadius: 18, alignItems: 'center',
    backgroundColor: 'rgba(6,9,9,.92)', borderWidth: 1, borderColor: '#79602B',
    boxShadow: '0 0 30px rgba(211,154,55,.18)',
  },
  revealEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  revealName: { marginTop: 3, color: '#F5F1E8', fontFamily: fonts.display, fontSize: 24, lineHeight: 27 },
  revealReward: { ...typography.label, marginTop: 4, color: '#DAB979' },
});
