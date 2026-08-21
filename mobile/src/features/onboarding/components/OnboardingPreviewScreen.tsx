import { Redirect } from 'expo-router';

import OnboardingScreen from './OnboardingScreen';

export default function OnboardingPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <OnboardingScreen />;
}
