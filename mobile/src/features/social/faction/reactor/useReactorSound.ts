import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

const SOURCE = require('../../../../../assets/social/reactor/audio/mechanical-evolution.wav');

export function useReactorSound(source: number = SOURCE) {
  const player = useAudioPlayer(source, { downloadFirst: true });
  const epoch = useRef(0);
  useEffect(() => {
    player.volume = .45;
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    return () => { epoch.current += 1; };
  }, [player]);
  const stop = useCallback(() => { epoch.current += 1; try { player.pause(); } catch { /* The native player may already be released during unmount. */ } }, [player]);
  const play = useCallback(async () => {
    const request = ++epoch.current;
    if (!player.isLoaded) return;
    try {
      await player.seekTo(0);
      if (request === epoch.current) player.play();
    } catch { /* An unavailable audio route must not block the visual sequence. */ }
  }, [player]);
  return { play, stop };
}
