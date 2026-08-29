import type { StyleProp, ViewStyle } from 'react-native';

import {
  StateView,
  type StateAction,
  type StateViewProps,
} from './StateView';

export type FeatureStateDomain = 'circle' | 'hub' | 'matches' | 'profile' | 'rank' | 'social';
export type FeatureStateVariant = Extract<StateViewProps['variant'], 'empty' | 'error' | 'loading'>;

type FeatureStateCopy = {
  description: string;
  title: string;
};

export const FEATURE_STATE_COPY: Record<FeatureStateDomain, Record<FeatureStateVariant, FeatureStateCopy>> = {
  hub: {
    loading: {
      title: 'Chargement du Hub',
      description: 'Ton prochain Call et ta progression arrivent.',
    },
    error: {
      title: 'Impossible de charger le Hub',
      description: 'Tes matchs et ta progression n’ont pas pu être actualisés.',
    },
    empty: {
      title: 'Aucun match à venir',
      description: 'Les prochains matchs de tes jeux suivis apparaîtront ici.',
    },
  },
  matches: {
    loading: {
      title: 'Chargement des matchs',
      description: 'Le calendrier et tes Calls arrivent.',
    },
    error: {
      title: 'Impossible de charger les matchs',
      description: 'Le calendrier n’a pas pu être actualisé.',
    },
    empty: {
      title: 'Aucun match pour cette sélection',
      description: 'Change de date, de jeu ou de filtre.',
    },
  },
  social: {
    loading: {
      title: 'Chargement de ta faction',
      description: 'La Relique et le classement arrivent.',
    },
    error: {
      title: 'Impossible de charger ta faction',
      description: 'La Relique et le classement n’ont pas pu être actualisés.',
    },
    empty: {
      title: 'Aucune faction active',
      description: 'Les équipes apparaîtront ici dès leur activation.',
    },
  },
  circle: {
    loading: {
      title: 'Chargement du Cercle',
      description: 'Tes amis, demandes et rivalités arrivent.',
    },
    error: {
      title: 'Impossible de charger le Cercle',
      description: 'Tes amis et leur activité n’ont pas pu être actualisés.',
    },
    empty: {
      title: 'Ton Cercle est vide',
      description: 'Recherche un joueur pour lancer ta première rivalité.',
    },
  },
  rank: {
    loading: {
      title: 'Chargement de ta saison',
      description: 'Ton rang et tes derniers mouvements arrivent.',
    },
    error: {
      title: 'Impossible de charger ta saison',
      description: 'Ton rang et ta progression n’ont pas pu être actualisés.',
    },
    empty: {
      title: 'Aucun classement disponible',
      description: 'Les premiers joueurs apparaîtront après leur prochain verdict.',
    },
  },
  profile: {
    loading: {
      title: 'Chargement de ton profil',
      description: 'Ta Vitrine et ta collection arrivent.',
    },
    error: {
      title: 'Impossible de charger ton profil',
      description: 'Ta Vitrine et ta progression n’ont pas pu être actualisées.',
    },
    empty: {
      title: 'Ton profil n’est pas encore prêt',
      description: 'Termine ton premier Call pour commencer à le remplir.',
    },
  },
};

const RETRY_HINT: Record<FeatureStateDomain, string> = {
  hub: 'Relance le chargement du Hub',
  matches: 'Relance le chargement des matchs',
  social: 'Relance le chargement de ta faction',
  circle: 'Relance le chargement du Cercle',
  rank: 'Relance le chargement de ta saison',
  profile: 'Relance le chargement de ton profil',
};

type Props = {
  action?: StateAction;
  compact?: boolean;
  description?: string;
  domain: FeatureStateDomain;
  onRetry?: () => void;
  presentation?: StateViewProps['presentation'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  title?: string;
  variant: FeatureStateVariant;
};

export function FeatureStateView({
  action,
  compact,
  description,
  domain,
  onRetry,
  presentation,
  style,
  testID,
  title,
  variant,
}: Props) {
  const copy = FEATURE_STATE_COPY[domain][variant];
  const resolvedAction = action ?? (variant === 'error' && onRetry
    ? {
        accessibilityHint: RETRY_HINT[domain],
        label: 'RÉESSAYER',
        onPress: onRetry,
      }
    : undefined);

  return (
    <StateView
      action={resolvedAction}
      compact={compact}
      description={description ?? copy.description}
      presentation={presentation}
      style={style}
      testID={testID}
      title={title ?? copy.title}
      variant={variant}
    />
  );
}
