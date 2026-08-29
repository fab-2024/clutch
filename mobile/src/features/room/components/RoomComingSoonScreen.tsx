import { PlaceholderScreen } from '@/src/components/ui/PlaceholderScreen';
import { layout } from '@/src/theme';

export default function RoomComingSoonScreen() {
  return (
    <PlaceholderScreen
      bottomInset={layout.tabBarContentInset}
      eyebrow="ROOM // EN PAUSE"
      title="La Room est en pause."
      description="Nous concentrons l’expérience sur la boucle Matchs, Calls et progression."
    />
  );
}
