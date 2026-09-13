import type { ImageSourcePropType } from 'react-native';

import type { IdentityPackId } from '@/src/features/profile/identity/catalog';

export const IDENTITY_PACK_HERO: Record<IdentityPackId, ImageSourcePropType> = {
  'clutch-original': require('../../../assets/shop/identity/heroes/clutch-original.png'),
  graphite: require('../../../assets/shop/identity/heroes/graphite.png'),
  tactique: require('../../../assets/shop/identity/heroes/tactique.png'),
  racing: require('../../../assets/shop/identity/heroes/racing.png'),
  tribune: require('../../../assets/shop/identity/heroes/tribune.png'),
  underground: require('../../../assets/shop/identity/heroes/underground.png'),
  'neon-nocturne': require('../../../assets/shop/identity/heroes/neon-nocturne.png'),
  ivoire: require('../../../assets/shop/identity/heroes/ivoire.png'),
  maillot: require('../../../assets/shop/identity/heroes/maillot.png'),
  editorial: require('../../../assets/shop/identity/heroes/editorial.png'),
  holographique: require('../../../assets/shop/identity/heroes/holographique.png'),
  'memoire-saison': require('../../../assets/shop/identity/heroes/memoire-saison.png'),
};
