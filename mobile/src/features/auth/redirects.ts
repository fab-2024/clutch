import * as Linking from 'expo-linking';

function createAuthRedirect(path: string) {
  const configuredOrigin = process.env.EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim().replace(/\/$/, '');
  if (configuredOrigin) return `${configuredOrigin}/${path}`;
  return Linking.createURL(path);
}

export function accountConfirmationRedirect(next?: string | null) {
  const redirect = createAuthRedirect('auth/callback');
  if (!next) return redirect;
  return `${redirect}${redirect.includes('?') ? '&' : '?'}next=${encodeURIComponent(next)}`;
}

export function passwordRecoveryRedirect() {
  return createAuthRedirect('auth/update-password');
}
