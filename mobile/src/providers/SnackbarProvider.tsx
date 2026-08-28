import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SnackbarHost,
  type SnackbarItem,
  type SnackbarOptions,
} from '@/src/components/overlays/Snackbar';

type SnackbarContextValue = {
  dismissSnackbar: (id?: string) => void;
  showSnackbar: (options: SnackbarOptions) => string;
};

const DEFAULT_DURATION = 4_500;
const ACTION_DURATION = 7_000;
const MIN_DURATION = 2_500;
const MAX_DURATION = 12_000;

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({ children }: PropsWithChildren) {
  const [item, setItem] = useState<SnackbarItem | null>(null);
  const sequenceRef = useRef(0);

  const dismissSnackbar = useCallback((id?: string) => {
    setItem((current) => (!id || current?.id === id ? null : current));
  }, []);

  const showSnackbar = useCallback((options: SnackbarOptions) => {
    const id = `snackbar-${++sequenceRef.current}`;
    const message = options.message.trim();
    if (!message) return id;
    const fallbackDuration = options.action ? ACTION_DURATION : DEFAULT_DURATION;
    const duration = Math.min(
      MAX_DURATION,
      Math.max(MIN_DURATION, options.duration ?? fallbackDuration),
    );
    setItem({
      ...options,
      duration,
      id,
      message,
      tone: options.tone ?? 'info',
    });
    return id;
  }, []);

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => dismissSnackbar(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [dismissSnackbar, item]);

  const value = useMemo<SnackbarContextValue>(
    () => ({ dismissSnackbar, showSnackbar }),
    [dismissSnackbar, showSnackbar],
  );

  return (
    <SnackbarContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <SnackbarHost item={item} onDismiss={dismissSnackbar} />
      </View>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) throw new Error('useSnackbar doit être utilisé dans SnackbarProvider.');
  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
