/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import { SHOWCASE_RING_CATALOG } from '../catalog';
import ShowcaseRingArtifact from '../components/ShowcaseRingArtifact';
import { SHOWCASE_RING_FAMILIES } from '../types';

describe('ShowcaseRingArtifact', () => {
  it.each([48, 64, 96])('keeps every family readable in a %i px placement', async (size) => {
    const screen = await render(
      <View>
        {SHOWCASE_RING_FAMILIES.map((family) => {
          const definition = SHOWCASE_RING_CATALOG[family];
          const stage = definition.stages[2];
          return (
            <ShowcaseRingArtifact
              key={family}
              ring={{
                accent: definition.accent,
                asset: stage.assets.full,
                family,
                familyName: definition.name,
                name: stage.name,
                stage: stage.stage,
              }}
              size={size}
            />
          );
        })}
      </View>,
    );

    SHOWCASE_RING_FAMILIES.forEach((family) => {
      expect(screen.getByTestId(`showcase-ring-artifact-${family}`)).toHaveStyle({
        height: size,
        width: size,
      });
    });
  });
});
