import { useLocalSearchParams } from 'expo-router';
import ForgeDemoScreen from '@/src/features/social/faction/reactor/ForgeDemoScreen';
import ReactorFilmScreen from '@/src/features/social/faction/reactor/ReactorFilmScreen';
import { PreviewRoute } from '@/src/components/dev/PreviewRoute';
import ReactorLabScreen from '@/src/features/social/faction/reactor/ReactorLabScreen';

export default function ReactorLabRoute() {
  const { film, forge } = useLocalSearchParams<{ film?: string; forge?: string }>();
  return <PreviewRoute>{forge === '1' ? <ForgeDemoScreen /> : film === '1' ? <ReactorFilmScreen /> : <ReactorLabScreen />}</PreviewRoute>;
}
