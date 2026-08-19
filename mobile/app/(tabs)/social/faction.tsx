import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CommunityScreen from '../community';

export default function SocialFactionScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, marginTop: -insets.top }}>
      <CommunityScreen />
    </View>
  );
}
