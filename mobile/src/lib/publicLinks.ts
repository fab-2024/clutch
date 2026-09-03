import { publicAppOrigin } from '@/src/config/release';

export const INVITATION_CODE = /^[0-9a-f]{32}$/;
export const SHARED_MILESTONES = [3, 7, 14, 30, 50, 100] as const;

export function invitationCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (INVITATION_CODE.test(input.toLowerCase())) return input.toLowerCase();
  try {
    const url = new URL(input);
    if (!publicAppOrigin || url.origin !== publicAppOrigin || url.search || url.hash) return null;
    const code = url.pathname.match(/^\/i\/([0-9a-f]{32})$/)?.[1];
    return code ?? null;
  } catch { return null; }
}

export function publicPseudo(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 1 || value.length > 48 || value !== value.trim()) return null;
  if (/[\u0000-\u001f\u007f/\\?#%]/.test(value) || value === '.' || value === '..') return null;
  return value;
}

export function showcasePath(pseudo: string) {
  return publicPseudo(pseudo) ? `/v/${encodeURIComponent(pseudo)}` : null;
}

export function milestonePath(pseudo: string, milestone: number) {
  return publicPseudo(pseudo) && SHARED_MILESTONES.some((value) => value === milestone)
    ? `/s/${encodeURIComponent(pseudo)}/${milestone}` : null;
}
