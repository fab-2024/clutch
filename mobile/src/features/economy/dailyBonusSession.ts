import { DailyBonusError, nextBonusDelay, type DailyBonusReceipt } from './dailyBonus';

const RETRY_DELAYS = [1_000, 5_000, 15_000, 60_000, 300_000] as const;

export function createDailyBonusSession({
  claim,
  onReceipt,
  monotonicNow = () => performance.now(),
}: {
  claim: () => Promise<DailyBonusReceipt>;
  onReceipt: (receipt: DailyBonusReceipt) => void;
  monotonicNow?: () => number;
}) {
  let active = false;
  let disposed = false;
  let inFlight = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearTimer() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function schedule(delay: number) {
    clearTimer();
    if (active && !disposed) timer = setTimeout(() => { void attempt(); }, delay);
  }

  async function attempt() {
    if (!active || disposed || inFlight) return;
    clearTimer();
    inFlight = true;
    const startedAt = monotonicNow();
    try {
      const receipt = await claim();
      if (disposed || !active) return;
      failures = 0;
      onReceipt(receipt);
      schedule(nextBonusDelay(receipt, Math.max(0, monotonicNow() - startedAt)));
    } catch (error) {
      if (disposed || !active || (error instanceof DailyBonusError && !error.retryable)) return;
      schedule(RETRY_DELAYS[Math.min(failures++, RETRY_DELAYS.length - 1)]);
    } finally {
      inFlight = false;
    }
  }

  return {
    setActive(next: boolean) {
      if (disposed || active === next) return;
      active = next;
      clearTimer();
      // Always ask the server on a foreground transition: travelling or changing
      // the phone's clock cannot postpone the next legitimate daily check.
      if (active) void attempt();
    },
    retry() {
      if (active && !disposed) void attempt();
    },
    dispose() {
      disposed = true;
      active = false;
      clearTimer();
    },
  };
}
