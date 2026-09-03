import { DailyBonusError, type DailyBonusReceipt } from '../dailyBonus';
import { createDailyBonusSession } from '../dailyBonusSession';

const receipt: DailyBonusReceipt = {
  userId: 'player-a', awarded: true, amount: 10, balance: 310, movementId: 'bonus-1',
  rewardDay: '2026-09-03', timeZone: 'Europe/Paris', awardedAt: '2026-09-03T21:59:50Z',
  serverNow: '2026-09-03T21:59:50Z', nextAvailableAt: '2026-09-03T22:00:00Z',
};

describe('daily bonus foreground session', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('has one in-flight claim, waits for server midnight, and never runs in the background', async () => {
    let resolve!: (value: DailyBonusReceipt) => void;
    const claim = jest.fn().mockImplementation(() => new Promise<DailyBonusReceipt>((done) => { resolve = done; }));
    const onReceipt = jest.fn();
    const session = createDailyBonusSession({ claim, onReceipt, monotonicNow: () => 0 });
    session.retry();
    expect(claim).not.toHaveBeenCalled();
    session.setActive(true);
    session.setActive(true);
    session.retry();
    expect(claim).toHaveBeenCalledTimes(1);
    resolve(receipt);
    await Promise.resolve();
    expect(onReceipt).toHaveBeenCalledWith(receipt);
    await jest.advanceTimersByTimeAsync(9_999);
    expect(claim).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(claim).toHaveBeenCalledTimes(2);
    session.setActive(false);
    resolve({ ...receipt, awarded: false, amount: 0 });
    await Promise.resolve();
    expect(onReceipt).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(86_400_000);
    expect(claim).toHaveBeenCalledTimes(2);
    session.setActive(true);
    expect(claim).toHaveBeenCalledTimes(3);
    session.dispose();
  });

  it('retries transient failures with a capped backoff and clears timers on logout', async () => {
    const claim = jest.fn().mockRejectedValue(new DailyBonusError('network', true));
    const session = createDailyBonusSession({ claim, onReceipt: jest.fn() });
    session.setActive(true);
    await Promise.resolve();
    for (const [index, delay] of [1_000, 5_000, 15_000, 60_000, 300_000, 300_000].entries()) {
      await jest.advanceTimersByTimeAsync(delay - 1);
      expect(claim).toHaveBeenCalledTimes(index + 1);
      await jest.advanceTimersByTimeAsync(1);
      expect(claim).toHaveBeenCalledTimes(index + 2);
    }
    session.dispose();
    expect(jest.getTimerCount()).toBe(0);
    session.setActive(true);
    session.retry();
    expect(claim).toHaveBeenCalledTimes(7);
  });

  it('lets reconnection retry early without leaving a duplicate timer', async () => {
    const claim = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(receipt);
    const onReceipt = jest.fn();
    const session = createDailyBonusSession({ claim, onReceipt, monotonicNow: () => 0 });
    session.setActive(true);
    await Promise.resolve();
    session.retry();
    await Promise.resolve();
    expect(claim).toHaveBeenCalledTimes(2);
    expect(onReceipt).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(claim).toHaveBeenCalledTimes(2);
    session.dispose();
  });

  it('does not retry denied claims or deliver a previous account’s delayed response', async () => {
    const claim = jest.fn().mockRejectedValue(new DailyBonusError('42501', false));
    const session = createDailyBonusSession({ claim, onReceipt: jest.fn() });
    session.setActive(true);
    await Promise.resolve();
    expect(jest.getTimerCount()).toBe(0);
    session.dispose();
    let resolve!: (value: DailyBonusReceipt) => void;
    const onReceipt = jest.fn();
    const oldSession = createDailyBonusSession({
      claim: () => new Promise((done) => { resolve = done; }), onReceipt,
    });
    oldSession.setActive(true);
    oldSession.dispose();
    resolve(receipt);
    await Promise.resolve();
    expect(onReceipt).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
