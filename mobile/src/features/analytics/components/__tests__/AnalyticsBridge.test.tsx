import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { AnalyticsBridge } from '../AnalyticsBridge';

const mockTrack = jest.fn().mockResolvedValue({ accepted: true });
jest.mock('../../api', () => ({ trackAnalyticsEvent: (...args: unknown[]) => mockTrack(...args) }));

describe('app opening analytics', () => {
  let changeState: (state: AppStateStatus) => void;
  const initialState = AppState.currentState;
  const remove = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    AppState.currentState = 'active';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      changeState = listener;
      return { remove };
    });
  });
  afterEach(() => { jest.restoreAllMocks(); AppState.currentState = initialState; });

  it('tracks each real foreground transition, not duplicate active notifications', async () => {
    const screen = await render(<AnalyticsBridge userId="analytics-player-a" />);
    expect(mockTrack).toHaveBeenCalledWith({ type: 'app_opened' });
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({ type: 'application_active' }));
    await act(async () => { changeState('active'); changeState('background'); changeState('active'); });
    expect(mockTrack.mock.calls.filter(([event]) => event.type === 'app_opened')).toHaveLength(2);
    expect(mockTrack.mock.calls.filter(([event]) => event.type === 'application_active')).toHaveLength(1);
    await screen.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('waits for the foreground when launched in the background', async () => {
    AppState.currentState = 'background';
    await render(<AnalyticsBridge userId="analytics-player-b" />);
    expect(mockTrack).not.toHaveBeenCalled();
    await act(async () => changeState('active'));
    expect(mockTrack).toHaveBeenCalledWith({ type: 'app_opened' });
  });
});
