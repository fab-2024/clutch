/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import ShowcasePhysicalObject, {
  SHOWCASE_COLLECTIBLE_ASSETS,
  type ShowcasePhysicalObjectKind,
} from '../showcase/ShowcasePhysicalObject';

const KINDS: readonly ShowcasePhysicalObjectKind[] = ['frame', 'title', 'core', 'banner', 'badge'];

describe('ShowcasePhysicalObject', () => {
  it('selects the dedicated transparent asset for every collectible kind', async () => {
    const screen = await render(
      <View>
        {KINDS.map((kind) => (
          <ShowcasePhysicalObject
            key={kind}
            model={{ accent: '#31D7E2', id: kind, kind, name: `Objet ${kind}` }}
            showName={kind === 'title'}
            size={40}
          />
        ))}
      </View>,
    );

    for (const kind of KINDS) {
      expect(screen.getByTestId(`showcase-object-image-${kind}`).props.source).toBe(SHOWCASE_COLLECTIBLE_ASSETS[kind]);
      expect(screen.getByLabelText(`${kindLabel(kind)} Objet ${kind}`)).toBeTruthy();
    }
    expect(screen.getByText('OBJET TITLE')).toBeTruthy();
  });

  it('renders a collectible-specific image when the catalog provides one', async () => {
    const image = { uri: 'fnatic-logo-3d' };
    const screen = await render(
      <ShowcasePhysicalObject
        model={{ accent: '#FF5900', id: 'fnatic-logo-3d', image, kind: 'core', name: 'Logo 3D Fnatic' }}
        size={40}
      />,
    );

    expect(screen.getByTestId('showcase-object-image-core').props.source).toBe(image);
  });
});

function kindLabel(kind: ShowcasePhysicalObjectKind) {
  if (kind === 'frame') return 'Cadre';
  if (kind === 'title') return 'Titre';
  if (kind === 'core') return 'Noyau';
  if (kind === 'banner') return 'Bannière';
  return 'Badge';
}
