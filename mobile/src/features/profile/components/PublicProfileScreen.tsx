import { useLocalSearchParams } from 'expo-router';

import ProfileScreen from './ProfileScreen';

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ pseudo?: string | string[] }>();
  const pseudo = Array.isArray(params.pseudo) ? params.pseudo[0] : params.pseudo;

  return <ProfileScreen profilePseudo={pseudo} publicView />;
}
