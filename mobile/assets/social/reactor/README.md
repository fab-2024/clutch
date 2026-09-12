# Réacteur : cinq reconstructions de la planche du 12 septembre 2026

Les cinq `*-source.png` sont des reconstructions générées avec l’outil imagegen intégré, à partir de la planche fournie. Ce ne sont pas les fichiers originaux ni des extractions pixel pour pixel. Les prompts exacts figurent dans `generation-prompts.md`.

Chaque machine conserve sa propre silhouette : Module sur socle circulaire, Réacteur asymétrique avec deux ventilateurs à gauche, Cœur d’arène à trois réservoirs, Citadelle à cage blindée, Nexus à cinq réservoirs et armature arrière courbe. Les anciennes tours génériques et la couronne horizontale ont été retirées.

## Composition native et Web

Les PNG produits sont **opaques** : leur damier est peint. Ils ne doivent jamais être affichés directement dans le produit. `artwork.ts` contient les silhouettes, évidements, cavités et tracés de conduits mesurés sur chaque artboard de 1 000 unités. `ReactorMachine.tsx` les découpe par masques SVG au rendu. Les fichiers sources restent intacts ; aucun traitement raster externe n’a été utilisé.

Les cavités sont remplacées par le verre et le liquide calculés à l’exécution. Chaque réservoir possède son profil mesuré ; surface, volume et bulles utilisent le même niveau continu. Les reflets longitudinaux sont limités au verre. Les conduits sont des fenêtres sur les pixels originaux, progressivement révélées au raccordement ; les impulsions suivent leurs courbes.

Les pièces utilisent les mêmes coordonnées que la source, découpées en noyau, côtés, demi-socles et armature arrière du Nexus. Les côtés du Nexus contiennent chacun deux satellites. Le noyau est conservé logiquement et s’adapte localement au diamètre et à la position du prochain réservoir ; son habillage se raccorde par un court fondu local. Il ne s’agit pas d’un rig 3D avec pièces cachées reconstruites.

Les hauteurs visibles progressent de 445 à 875 unités sur un sol commun à y=902. Les images de la forme suivante sont prémontées, mais ne participent pas à l’animation avant leur propre évolution. Aucun zoom de scène ni boucle d’animation au repos.

## Son

`audio/mechanical-evolution.wav` est une création synthétisée de 3,9 s, reproductible via `mobile/scripts/generate-reactor-audio.py` (bibliothèque standard Python). Expo Audio respecte le mode silencieux et arrête la lecture à l’annulation, au départ de l’écran et en arrière-plan. Réduction des animations : 300 ms, sans déplacement, vibration ni son. Aucune permission microphone ou lecture en arrière-plan.

Voir `docs/reactor-mechanical-storyboard.md` pour les séquences et limites de l’aperçu.
