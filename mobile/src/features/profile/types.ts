import type { SeasonalGradeState, SeasonalGradeSummary } from '@/src/features/ranking/grades';

export type ProfileRanking = {
  saison_id: string | null;
  saison_nom: string | null;
  frags: number;
  rang: number | null;
  pronostics_regles: number;
  pronostics_gagnes: number;
  pic_frags: number;
  placements_restants: number;
  provisoire: boolean;
  grade: SeasonalGradeState;
  percentile: number | null;
  joueurs_classes: number;
  meilleur_grade: SeasonalGradeSummary | null;
  meilleur_rang: number | null;
};

export type ProfileTeam = {
  id: string;
  nom: string;
  tag: string;
  jeu: string;
  logo: string | null;
  supporters: number;
  relique: string;
  relique_niveau: number;
};

export type RecentPrediction = {
  id: string;
  match_id: string;
  statut: 'gagne' | 'perdu';
  choix: 'a' | 'b';
  conviction: string | null;
  delta_frags: number | null;
  cree_le: string;
  regle_le: string | null;
  jeu: string;
  evenement: string;
  equipe_a: string;
  equipe_b: string;
  tag_a: string;
  tag_b: string;
  score_a: number | null;
  score_b: number | null;
};

export type BadgeRarity = 'commun' | 'rare' | 'epique' | 'legendaire' | 'mythique';

export type ProfileBadge = {
  key: string;
  name: string;
  family: string;
  rarity: BadgeRarity;
  secret?: boolean;
  obtained: boolean;
};

export type LevelState = {
  xp: number;
  level: number;
  title: string;
  prestige: 'starter' | 'explorateur' | 'analyste' | 'veteran' | 'icone' | 'legende';
  prestigeLabel: string;
  progress: number;
  remaining: number;
};

export type ProfileData = {
  pseudo: string;
  createdAt: string;
  profileTitle: string | null;
  founder: boolean;
  publicProfile: boolean;
  ranking: ProfileRanking;
  recap: Record<string, unknown>;
  currentStreak: number;
  favoriteTeam: ProfileTeam | null;
  bestGame: { jeu: string; pronostics: number; gagnes: number; precision_pct: number } | null;
  recent: RecentPrediction[];
  badges: ProfileBadge[];
  pinnedBadges: ProfileBadge[];
  arsenalBadges: ProfileBadge[];
  level: LevelState;
};

export type RawProfile = {
  pseudo?: string;
  cree_le?: string;
  titre_profil?: string | null;
  est_fondateur?: boolean;
  profil_public?: boolean;
  badge_vedette?: string | null;
  badges_exposes?: string[] | null;
  arsenal_exposes?: string[] | null;
  classement?: Partial<ProfileRanking> | null;
  recap?: Record<string, unknown> | null;
  serie_actuelle?: number | null;
  meilleur_jeu?: ProfileData['bestGame'];
  forme_recente?: RecentPrediction[] | null;
  equipe_favorite?: Partial<ProfileTeam> | null;
};

export type BadgeDefinition = Omit<ProfileBadge, 'obtained'> & {
  test?: (recap: Record<string, unknown>) => boolean;
  meta?: boolean;
};
