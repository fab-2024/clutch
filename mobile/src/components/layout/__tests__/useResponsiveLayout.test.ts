/// <reference types="jest" />

import { responsiveLayoutFor } from '../useResponsiveLayout';

describe('responsiveLayoutFor', () => {
  it.each([
    [320, 568, { isCompactWidth: true, isLandscape: false, isShortLandscape: false }],
    [390, 844, { isCompactWidth: false, isLandscape: false, isShortLandscape: false }],
    [568, 320, { isCompactWidth: false, isLandscape: true, isShortLandscape: true }],
    [844, 390, { isCompactWidth: false, isLandscape: true, isShortLandscape: true }],
    [768, 768, { isCompactWidth: false, isLandscape: false, isShortLandscape: false }],
  ])('classifies a %d × %d viewport', (width, height, expected) => {
    expect(responsiveLayoutFor(width, height)).toEqual(expected);
  });
});
