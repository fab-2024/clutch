import * as Linking from 'expo-linking';

function createAuthRedirect(path: string) {
  const configuredOrigin = process.env.EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim().replace(/\/$/, '');
  if (configuredOrigin) return `${configuredOrigin}/${path}`;
  return Linking.createURL(path);
}

export function accountConfirmationRedirect() {
  return createAuthRedirect('auth/callback');
}

export function passwordRecoveryRedirect() {
  return createAuthRedirect('auth/update-password');
}
