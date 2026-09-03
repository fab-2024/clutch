import { Platform, Share } from 'react-native';

import { GrowthError } from './growthErrors';

export type ShareOutcome = 'shared' | 'copied' | 'dismissed';

/** A successful share means a handoff to the OS, never confirmed delivery. */
export async function sharePublicLink(title: string, message: string, url: string): Promise<ShareOutcome> {
  if (!/^https:\/\//.test(url)) throw new GrowthError('public_origin_missing');
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title, text: message, url }); return 'shared'; }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return 'dismissed';
        throw new GrowthError('share_unavailable');
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(`${message}\n${url}`); return 'copied'; }
      catch { throw new GrowthError('share_unavailable'); }
    }
    throw new GrowthError('share_unavailable');
  }
  try {
    const result = await Share.share(Platform.OS === 'ios' ? { title, message, url } : { title, message: `${message}\n${url}` });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch { throw new GrowthError('share_unavailable'); }
}
