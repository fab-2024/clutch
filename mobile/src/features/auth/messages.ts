export function authErrorMessage(caught: unknown, fallback: string) {
  if (!(caught instanceof Error)) return fallback;
  const message = caught.message.toLowerCase();

  if (message.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('email not confirmed')) return 'Confirme d’abord ton adresse email.';
  if (message.includes('user already registered')) return 'Un compte existe déjà avec cet email.';
  if (message.includes('password should be at least') || message.includes('weak password')) {
    return 'Choisis un mot de passe d’au moins 8 caractères.';
  }
  if (message.includes('new password should be different')) {
    return 'Choisis un mot de passe différent de l’ancien.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Trop de tentatives. Réessaie dans quelques minutes.';
  }
  if (
    message.includes('code verifier')
    || message.includes('auth code')
    || message.includes('expired')
    || message.includes('otp')
  ) {
    return 'Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Connexion réseau indisponible. Vérifie ta connexion puis réessaie.';
  }
  return fallback;
}
