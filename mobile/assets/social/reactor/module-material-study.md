# Module 1 — étude de matière

Illustration fixe produite avec imagegen intégré, pour revoir le verre et l’élixir ensemble avant intégration au rendu animé. Seul le Module 1 est concerné. Le fichier `module-material-study.png` ne remplace pas le rendu dynamique et son niveau est peint dans l’illustration.

## Prompt exact

Use case: precise-object-edit. Edit target: the supplied Module 1 reactor image. Create a finished photoreal game-art visual of THIS EXACT small machine. Preserve the single cylinder, two thin blue side pipes, dark machined top cap, low circular pedestal, small silver emblem, bolts, framing and camera angle. Replace the painted checkerboard everywhere with a dark charcoal studio environment and subtle dark floor. Most importantly, render the glass and BLUE ELIXIR as a single physically convincing optical material. Fill the cylinder to 63 percent of its internal height. The elixir is rich deep cobalt blue, saturated electric-blue light refracted through its edges and lower glass, darker translucent body, subtle uneven internal light scattering, very fine sparse suspended microbubbles. It must have depth like real dense liquid in a thick cylindrical glass vessel. A natural thin curved meniscus wets the inside glass walls. Transparent EMPTY upper part must show the dim background through curved glass with strong realistic vertical studio reflections continuing naturally across the liquid level, optically refracted within the liquid. Front glass reflections and thickness remain visibly in FRONT of liquid; bottom curved glass and metal collar occlude the liquid naturally. Real caustics gently illuminate lower collar, no excessive bloom. NO opaque rounded rectangle inside the tank, NO flat UI gradient, NO overlay panel, NO diagram, NO graduations, NO extra tanks, NO labels/text, NO checkerboard. Premium cinematic dark industrial product render; keep metal dark, do not turn it silver. Single complete Module only, square image. This is a close faithful material correction, not a new machine design.

## Intégration animée — Module 1 seulement

L’illustration est désormais consommée par `ModuleElixir.tsx`. Des fenêtres SVG sur la même source conservent le verre clair, le corps du liquide, le ménisque et la caustique basse. Le niveau reste calculé continuellement ; les zones de matière sont adaptées en hauteur au rendu, sans repeindre un rectangle opaque. Les reflets et le grain photographiques sont ainsi conservés. Cette technique reste une composition 2,5D, pas une simulation physique de réfraction.

Dans `/reactor-lab-preview?moduleOnly=1&supporters=63`, le cadrage est rapproché, le toucher joue la réaction et « Remplir la cuve » monte à 99 supporters sans déclencher le Module 2. « Réinitialiser » revient à 63. Les rendus des formes 2 à 5 restent inchangés. Contrôle natif du repos, du toucher, du remplissage et du reset ; 30 tests ciblés, architecture et typage passent.

## Allègement de l’aperçu isolé

`FocusedModule.tsx` sépare le châssis fixe et le liquide dans deux racines SVG. Le châssis utilise une seule photographie masquée, sans découpage mécanique ni préchargement de la forme suivante. Les mises à jour du liquide ne traversent plus le SVG du châssis. Cette optimisation concerne uniquement `moduleOnly` ; le moteur des transformations reste inchangé. Toucher, remplissage et réinitialisation ont été exercés sur simulateur, avec contrôle des images enregistrées. Aucun débit d’images par seconde n’a été mesuré.


## Extension aux formes 2 à 5

La matière photographique validée du Module est réutilisée par `VesselElixir.tsx`, avec une transformation propre à chaque cavité mesurée dans `artwork.ts` : une pour le Réacteur, trois pour le Cœur d’arène, une pour la Citadelle et cinq pour le Nexus. Les fenêtres de verre clair, liquide, ménisque et caustique remplacent le remplissage vectoriel. Les silhouettes et les colliers métalliques restent issus des illustrations de chaque machine. Cette adaptation 2,5D partage une texture optique ; elle ne simule pas la réfraction physique propre à chaque angle de vue.

Le moteur au repos et au toucher utilise une photographie fixe dans un SVG séparé, le liquide dynamique et un petit SVG pour les impulsions des conduits. Les pièces mécaniques ne sont montées que durant la transformation des deux formes concernées ; aucune troisième forme invisible n’est préchargée.

Calques et déclencheurs : châssis/photo au repos ; verre clair et matière avec niveau continu ; ménisque et quatre bulles par cuve animés au toucher (450–1450 ms) et à la mise sous pression (780–1460 ms) ; conduits actifs au toucher (180–650 ms). La chronologie mécanique de 3,9 s est conservée. Réduction des animations : pas de vague, de bulles ni d’impulsion.


Validation de l’extension : repos et toucher à 63 % sur les quatre formes ; remplissage et mutations Réacteur → Cœur d’arène → Citadelle → Nexus exercés sur simulateur. Le raccord final du Nexus a été corrigé en conservant son rendu léger monté pendant la mutation, puis revérifié sur l’enregistrement `/private/tmp/nexus-handoff.mp4` (5–7 s). Typage, architecture et 30 tests ciblés passent. Les logs natifs consultés contiennent des messages CoreAudio/CoreMedia du lecteur audio ; aucune mesure FPS ni validation du son ne fait partie de cette passe visuelle. Aperçu laissé au repos à 8 150 supporters.
