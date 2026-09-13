import { fireEvent, render } from '@testing-library/react-native';
import CurrentCollectionShop from '../CurrentCollectionShop';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('lucide-react-native/icons/layers', () => ({ __esModule: true, default: 'Layers' }));
jest.mock('lucide-react-native/icons/x', () => ({ __esModule: true, default: 'X' }));

it('shows all new figurines and opens their progression details', async () => {
  const screen = await render(<CurrentCollectionShop category="objects" />);
  expect(screen.getAllByTestId(/^figurine-universe-/)).toHaveLength(5);
  expect(screen.queryAllByTestId(/^identity-shop-/)).toHaveLength(0);
  await fireEvent.press(screen.getByTestId('figurine-universe-conclave'));
  expect(screen.getAllByTestId(/^figurine-shop-/)).toHaveLength(4);
  expect(screen.getByText(/Forme 2 : 10 calls réglés/)).toBeTruthy();
  expect(screen.getByText(/ACQUISITIONS BIENTÔT DISPONIBLES/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Fermer'));
  expect(screen.queryByTestId('figurine-shop-brumousse')).toBeNull();
});

it('offers twelve complete profile packs without an old frame shelf', async () => {
  const screen = await render(<CurrentCollectionShop category="packs" />);
  expect(screen.getAllByTestId(/^identity-shop-/)).toHaveLength(12);
  expect(screen.queryByText('Circuit Zéro')).toBeNull();
  await fireEvent.press(screen.getByTestId('identity-shop-ivoire'));
  expect(screen.getByText('CONTENU DU PACK')).toBeTruthy();
  expect(screen.getByText('Cadre')).toBeTruthy();
  expect(screen.getByText('Fond')).toBeTruthy();
  expect(screen.getByText('Signature')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Fermer'));
  expect(screen.queryByText('CONTENU DU PACK')).toBeNull();
});
