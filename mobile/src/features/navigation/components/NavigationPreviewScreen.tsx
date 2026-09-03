import { createBottomTabNavigator } from 'expo-router/js-tabs';
import { DarkTheme, NavigationContainer, NavigationIndependentTree } from 'expo-router/react-navigation';

import { PreviewRoute } from '@/src/components/dev/PreviewRoute';
import { mainTabs, useLiquidGlassTabOptions } from '@/src/components/navigation/LiquidGlassTabBar';
import HubPreviewScreen from '@/src/features/hub/components/HubPreviewScreen';
import MatchesPreviewScreen from '@/src/features/matches/components/MatchesPreviewScreen';
import RankPreviewScreen from '@/src/features/ranking/components/RankPreviewScreen';
import StoreHubPreviewScreen from '@/src/features/shop/components/StoreHubPreviewScreen';
import SocialHomePreviewScreen from '@/src/features/social/components/SocialHomePreviewScreen';

const PreviewTabs = createBottomTabNavigator();

function SocialPreview() {
  return <SocialHomePreviewScreen factionHeroVariant="v2" />;
}

const previewScreens = {
  index: HubPreviewScreen,
  matches: MatchesPreviewScreen,
  social: SocialPreview,
  rank: RankPreviewScreen,
  profile: StoreHubPreviewScreen,
};

export default function NavigationPreviewScreen() {
  const screenOptions = useLiquidGlassTabOptions();

  return (
    <PreviewRoute>
      <NavigationIndependentTree>
        <NavigationContainer theme={DarkTheme}>
          <PreviewTabs.Navigator screenOptions={screenOptions}>
            {mainTabs.map(({ name }) => (
              <PreviewTabs.Screen key={name} name={name} component={previewScreens[name]} />
            ))}
          </PreviewTabs.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
    </PreviewRoute>
  );
}
