import { PlaceholderScreen } from '@/src/components/ui/PlaceholderScreen';
import { layout } from '@/src/theme';

export default function RoomComingSoonScreen() {
  return (
    <PlaceholderScreen
      bottomInset={layout.tabBarContentInset}
      eyebrow="ROOM // BIENTÔT"
      title="Le prochain espace se prépare."
      description="La Room reste en retrait pendant que nous finalisons la boucle Matchs, Calls et progression. Elle arrivera dans une prochaine étape."
    />
  );
}
