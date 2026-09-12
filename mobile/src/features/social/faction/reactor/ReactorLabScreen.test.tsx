import { fireEvent, render } from '@testing-library/react-native';
import ReactorLabScreen from './ReactorLabScreen';

const mockMount = jest.fn();
let mockParams: Record<string, string> = {};
beforeEach(() => { mockParams = {}; });
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams }));
jest.mock('@/src/components/layout/Screen', () => ({ Screen: require('react-native').View }));
jest.mock('./ReactorScene', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ReactorScene: React.forwardRef(function Scene(props: { onEvolutionComplete: () => void }, ref: unknown) {
    React.useEffect(() => { mockMount(); }, []);
    React.useImperativeHandle(ref, () => ({ react: () => undefined, evolve: props.onEvolutionComplete }));
    return React.createElement(View, { testID: 'persistent-scene' });
  }) };
});

it('keeps the native scene mounted across all four evolutions but recreates it for an explicit reset', async () => {
  const screen = await render(<ReactorLabScreen />);
  const initialMounts = mockMount.mock.calls.length;
  for (const name of ['Réacteur', 'Cœur d’arène', 'Citadelle', 'Nexus']) {
    await fireEvent.press(screen.getByRole('button', { name: 'PRÉPARER LA MUTATION' }));
    await fireEvent.press(screen.getByTestId('reactor-lab-stage'));
    expect(screen.getByText(`Votre faction a évolué : ${name}.`)).toBeTruthy();
    expect(mockMount).toHaveBeenCalledTimes(initialMounts);
  }
  await fireEvent.press(screen.getByRole('button', { name: 'RÉINITIALISER' }));
  expect(mockMount).toHaveBeenCalledTimes(initialMounts + 1);
  expect(screen.getByText('LE MODULE')).toBeTruthy();
});

it('keeps the material study on Module 1 after filling and touching it', async () => {
  mockParams = { moduleOnly: '1', supporters: '7500' };
  const screen = await render(<ReactorLabScreen />);
  expect(screen.getByText('LE MODULE')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'REMPLIR LA CUVE' }));
  await fireEvent.press(screen.getByTestId('reactor-lab-stage'));
  expect(screen.getByText('LE MODULE')).toBeTruthy();
  expect(screen.queryByText('Votre faction a évolué : Réacteur.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'RÉINITIALISER' }));
  expect(screen.getByRole('button', { name: 'REMPLIR LA CUVE' })).toBeTruthy();
});
