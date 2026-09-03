import { act, render } from '@testing-library/react-native';
import type { NotificationResponse } from 'expo-notifications';

import NotificationBridge, { allowedNotificationPath } from '../components/NotificationBridge';

const mockResponseListener = jest.fn();
const mockGetLast = jest.fn();
const mockClearLast = jest.fn().mockResolvedValue(undefined);
const mockOpened = jest.fn();
const mockPush = jest.fn();
const mockTrack = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: (...args: unknown[]) => mockResponseListener(...args),
  getLastNotificationResponseAsync: (...args: unknown[]) => mockGetLast(...args),
  clearLastNotificationResponseAsync: (...args: unknown[]) => mockClearLast(...args),
}));
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('../api', () => ({ recordNotificationOpened: (...args: unknown[]) => mockOpened(...args) }));
jest.mock('../registration', () => ({ syncPushTokenIfGranted: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: (...args: unknown[]) => mockTrack(...args) }));

const eventId = '11111111-1111-4111-8111-111111111111';
const response = { notification: { request: { identifier: 'native-event-1', content: { data: { path: '/streak', notification_id: eventId } } } } } as unknown as NotificationResponse;

describe('product notification deep links', () => {
  let listener: (response: NotificationResponse) => void;
  const remove = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    mockResponseListener.mockImplementation((callback) => { listener = callback; return { remove }; });
    mockGetLast.mockResolvedValue(response);
    mockOpened.mockResolvedValue(true);
  });

  it.each(['/streak', '/showcase-activity', '/match/pandascore-123', '/result/match-42', '/duel/abcd', '/(tabs)/social'])('allows product route %s', (path) => {
    expect(allowedNotificationPath(path)).toBe(true);
  });
  it.each(['https://evil.test', '//evil.test', '/settings/profile', '/match/../settings', '/streak?user=other', '/showcase-activity?user=other', '/duel/x/../../', '/match/%2e%2e'])('rejects unsafe or unrelated route %s', (path) => {
    expect(allowedNotificationPath(path)).toBe(false);
  });

  it('opens once when native startup and the listener return the same notification', async () => {
    const screen = await render(<NotificationBridge userId="owner" />);
    await act(async () => listener(response));
    expect(mockOpened).toHaveBeenCalledTimes(1);
    expect(mockOpened).toHaveBeenCalledWith(eventId);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/streak');
    expect(mockClearLast).toHaveBeenCalled();
    await screen.unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('does not open or record an old notification owned by another account', async () => {
    mockOpened.mockResolvedValue(false);
    await render(<NotificationBridge userId="other-owner" />);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('drops a startup response arriving after sign-out', async () => {
    let resolve!: (value: NotificationResponse) => void;
    mockGetLast.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const screen = await render(<NotificationBridge userId="owner" />);
    await screen.rerender(<NotificationBridge />);
    await act(async () => resolve(response));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockOpened).not.toHaveBeenCalled();
  });
});
