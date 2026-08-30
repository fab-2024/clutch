/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { COMMUNITY_FORMS } from '@/src/features/social/faction/constants';
import type { FactionProgress } from '@/src/features/social/faction/types';
import { accessibility } from '@/src/theme';

import FactionEvolutionRail from '../FactionEvolutionRail';

jest.mock('@/src/features/onboarding/components/TeamLogo', () => {
  const { View } = require('react-native');
  return View;
});

describe('FactionEvolutionRail accessibility', () => {
  it('keeps every form readable without shrinking labels to fit', async () => {
    const current = COMMUNITY_FORMS.find((form) => form.level === 2)!;
    const screen = await render(
      <FactionEvolutionRail
        progress={{ awakened: false, current, level: 2 } as FactionProgress}
      />,
    );

    COMMUNITY_FORMS.filter((form) => form.level >= 1 && form.level <= 5).forEach((form) => {
      const label = screen.getByText(form.name.toUpperCase());
      expect(label.props.adjustsFontSizeToFit).toBeUndefined();
      expect(label.props.numberOfLines).toBe(2);
      expect(StyleSheet.flatten(label.props.style).fontSize).toBeGreaterThanOrEqual(
        accessibility.minimumFunctionalFontSize,
      );
    });

    expect(screen.getByLabelText(`${current.name}, forme actuelle`)).toBeTruthy();
  });

  it('keeps the comfortable five-step rail on one labelled line', async () => {
    const current = COMMUNITY_FORMS.find((form) => form.level === 1)!;
    const screen = await render(
      <FactionEvolutionRail
        comfortable
        progress={{ awakened: false, current, level: 1 } as FactionProgress}
      />,
    );

    COMMUNITY_FORMS.filter((form) => form.level >= 1 && form.level <= 5).forEach((form) => {
      const label = screen.getByText(form.name.toUpperCase());
      expect(label.props.adjustsFontSizeToFit).toBeUndefined();
      expect(label.props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(label.props.style).fontSize).toBeGreaterThanOrEqual(
        accessibility.minimumFunctionalFontSize,
      );
    });

    expect(screen.getByLabelText('Ampoule, forme actuelle')).toBeTruthy();
    expect(screen.getByLabelText('Bonbonne, forme verrouillée')).toBeTruthy();
  });
});
