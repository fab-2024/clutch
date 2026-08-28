/// <reference types="jest" />

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useQueuedAutosave } from '../useQueuedAutosave';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('useQueuedAutosave', () => {
  it('serializes writes and coalesces rapid changes to the latest value', async () => {
    const first = deferred<number>();
    const second = deferred<number>();
    const save = jest.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result } = await renderHook(() => useQueuedAutosave({
      initialValue: 0,
      save,
      signature: String,
    }));

    await act(async () => result.current.commit(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(1);

    await act(async () => {
      result.current.commit(2);
      result.current.commit(3);
    });
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => first.resolve(1));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenLastCalledWith(3);

    await act(async () => second.resolve(3));
    await waitFor(() => expect(result.current.status).toBe('saved'));
  });

  it('stops after a failure and exposes an explicit retry', async () => {
    const retryRef: { current?: () => void } = {};
    const save = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(1);
    const { result } = await renderHook(() => useQueuedAutosave({
      initialValue: 0,
      onError: (_caught, retry) => { retryRef.current = retry; },
      save,
      signature: String,
    }));

    await act(async () => result.current.commit(1));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => retryRef.current?.());
    await waitFor(() => expect(result.current.status).toBe('saved'));
    expect(save).toHaveBeenCalledTimes(2);
  });
});
