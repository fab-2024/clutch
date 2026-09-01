import type { Session } from '@supabase/supabase-js';

export type ClutchProfile = {
  id: string;
  avatar_id?: string | null;
  pseudo: string;
  email: string | null;
  est_admin: boolean;
  equipe_favorite_id: string | null;
  jeux_suivis: string[];
  profil_public: boolean;
};

export type AuthStatus = 'loading' | 'signed_out' | 'ready' | 'profile_missing' | 'error';

export type AuthFailure = {
  scope: 'session' | 'profile';
  message: string;
};

export type AuthContextValue = {
  session: Session | null;
  profile: ClutchProfile | null;
  status: AuthStatus;
  error: AuthFailure | null;
  loading: boolean;
  refreshProfile: () => Promise<ClutchProfile | null>;
  retry: () => Promise<void>;
};
