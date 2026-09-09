import { Redirect } from 'expo-router';

/** Retired offer: keep old deep links usable. */
export default function FounderPackScreen() {
  return <Redirect href="/shop" />;
}
