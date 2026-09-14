import { Redirect, useLocalSearchParams } from 'expo-router';

import OnboardingScreen from './OnboardingScreen';

export default function OnboardingPreviewScreen() {
  const params = useLocalSearchParams<{ step?: string | string[] }>();
  const requestedStep = Array.isArray(params.step) ? params.step[0] : params.step;
  if (!__DEV__) return <Redirect href="/" />;
  return <OnboardingScreen preview previewStep={requestedStep ? Number(requestedStep) : undefined} />;
}
