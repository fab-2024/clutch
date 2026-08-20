import type { Session } from '@supabase/supabase-js';

export type ClutchProfile = {
  id: string;
  pseudo: string;
  email: string | null;
  equipe_favorite_id: string | null;
  jeux_suivis: string[];
};

export type AuthContextValue = {
  session: Session | null;
  profile: ClutchProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};
