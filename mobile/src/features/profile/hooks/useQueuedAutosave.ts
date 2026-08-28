import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'error' | 'idle' | 'saved' | 'saving';

type QueuedAutosaveOptions<TValue, TResult> = {
  initialValue: TValue;
  onError?: (caught: unknown, retry: () => void) => void;
  onSaved?: (result: TResult, savedValue: TValue) => void;
  save: (value: TValue) => Promise<TResult>;
  signature: (value: TValue) => string;
};

type QueuedAutosaveController<TValue> = {
  commit: (value: TValue) => void;
  reset: (value: TValue) => void;
  retry: () => void;
  status: AutosaveStatus;
};

export function useQueuedAutosave<TValue, TResult>({
  initialValue,
  onError,
  onSaved,
  save,
  signature,
}: QueuedAutosaveOptions<TValue, TResult>): QueuedAutosaveController<TValue> {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const rerunRequestedRef = useRef(false);
  const latestValueRef = useRef(initialValue);
  const committedSignatureRef = useRef(signature(initialValue));
  const failedSignatureRef = useRef<string | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);
  const saveRef = useRef(save);
  const signatureRef = useRef(signature);
  const onErrorRef = useRef(onError);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    saveRef.current = save;
    signatureRef.current = signature;
    onErrorRef.current = onError;
    onSavedRef.current = onSaved;
  }, [onError, onSaved, save, signature]);

  const retry = useCallback(() => {
    failedSignatureRef.current = null;
    if (mountedRef.current) setStatus('saving');
    void flushRef.current();
  }, []);

  const flush = useCallback(async () => {
    if (runningRef.current) {
      rerunRequestedRef.current = true;
      return;
    }

    const value = latestValueRef.current;
    const valueSignature = signatureRef.current(value);
    if (valueSignature === committedSignatureRef.current) {
      if (mountedRef.current) setStatus('saved');
      return;
    }
    if (valueSignature === failedSignatureRef.current) {
      if (mountedRef.current) setStatus('error');
      return;
    }

    runningRef.current = true;
    rerunRequestedRef.current = false;
    if (mountedRef.current) setStatus('saving');

    try {
      const result = await saveRef.current(value);
      committedSignatureRef.current = valueSignature;
      failedSignatureRef.current = null;
      if (mountedRef.current) onSavedRef.current?.(result, value);
    } catch (caught) {
      failedSignatureRef.current = valueSignature;
      if (mountedRef.current) onErrorRef.current?.(caught, retry);
    } finally {
      runningRef.current = false;
      const latestSignature = signatureRef.current(latestValueRef.current);
      const failed = latestSignature === failedSignatureRef.current;
      const needsAnotherPass = latestSignature !== committedSignatureRef.current && !failed;
      const shouldRerun = rerunRequestedRef.current || needsAnotherPass;
      rerunRequestedRef.current = false;

      if (mountedRef.current) {
        setStatus(failed ? 'error' : needsAnotherPass ? 'saving' : 'saved');
      }
      if (shouldRerun && needsAnotherPass) void flushRef.current();
    }
  }, [retry]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const commit = useCallback((value: TValue) => {
    latestValueRef.current = value;
    failedSignatureRef.current = null;
    const unchanged = signatureRef.current(value) === committedSignatureRef.current;
    if (mountedRef.current) setStatus(unchanged && !runningRef.current ? 'saved' : 'saving');
    void flushRef.current();
  }, []);

  const reset = useCallback((value: TValue) => {
    latestValueRef.current = value;
    committedSignatureRef.current = signatureRef.current(value);
    failedSignatureRef.current = null;
    rerunRequestedRef.current = false;
    if (mountedRef.current) setStatus('idle');
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  return { commit, reset, retry, status };
}
