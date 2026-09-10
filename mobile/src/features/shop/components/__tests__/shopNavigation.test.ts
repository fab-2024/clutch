import { router } from 'expo-router';
import { returnToCollection } from '../../shopNavigation';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() } }));

describe('shop return navigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([false, true])('returns to the previous screen when history exists (preview: %s)', (preview) => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    returnToCollection(preview);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([
    [false, '/(tabs)/collection'],
    [true, '/store-preview'],
  ] as const)('opens Collection when entered directly (preview: %s)', (preview, destination) => {
    jest.mocked(router.canGoBack).mockReturnValue(false);
    returnToCollection(preview);
    expect(router.replace).toHaveBeenCalledWith(destination);
    expect(router.back).not.toHaveBeenCalled();
  });
});
