// The ranked-call API only invalidates a read. It never increments a client
// counter; a lost response is reconciled on foreground/focus by the server.
const listeners = new Set<() => void>();
export function notifyCallStreakChanged() { listeners.forEach((listener) => listener()); }
export function subscribeCallStreakChanges(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
