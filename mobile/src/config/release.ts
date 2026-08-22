const HTTPS_ORIGIN = /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const publicAppOrigin = normalizeOrigin(process.env.EXPO_PUBLIC_APP_ORIGIN);
export const supportEmail = normalizeEmail(process.env.EXPO_PUBLIC_SUPPORT_EMAIL);
export const legalEntity = process.env.EXPO_PUBLIC_LEGAL_ENTITY?.trim() || 'Clutch';

export function publicAppUrl(path = '/') {
  if (!publicAppOrigin) return null;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${publicAppOrigin}${normalizedPath}`;
}

export function supportMailto(subject: string, body?: string) {
  if (!supportEmail) return null;
  const query = new URLSearchParams({ subject, ...(body ? { body } : {}) });
  return `mailto:${supportEmail}?${query.toString()}`;
}

function normalizeOrigin(value?: string) {
  const origin = value?.trim().replace(/\/$/, '') ?? '';
  return HTTPS_ORIGIN.test(origin) ? origin : null;
}

function normalizeEmail(value?: string) {
  const email = value?.trim().toLowerCase() ?? '';
  return EMAIL.test(email) ? email : null;
}
