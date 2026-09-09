# Forge Volcanique — restauration de la matière

Outil : imagegen intégré, puis détourage automatique autorisé par l’utilisateur dans cette conversation. Aucun filtre d’opacité n’est appliqué à ce nouvel écrin dans la vitrine.

Sortie : `mobile/assets/shop/atelier/ranks/overlays/rank-volcanic-forge-opaque.png` (1024 × 628, RGBA).

Le script `mobile/scripts/prepare-volcanic-display.py` retire le damier neutre généré, conserve la matière opaque et applique un redimensionnement uniforme autour du point d’appui existant. Les catalogues boutique et vitrine partagent cette sortie. L’ancien asset est conservé.

Source générée : `/Users/pierre-louis/.codex/generated_images/01a08550-8353-77c3-a81d-c922f22d0fb7/exec-84dee099-a42e-4d50-b165-f3e27794a02b.png`.

## Prompt

Precise material restoration of a transparent game sprite, not a new design. The reference is a badly extracted volcanic display stand whose dark material turned white/translucent. Reconstruct the SAME silhouette: symmetrical segmented open mechanical crown/halo behind a three-tier round pedestal, central circular hole open and empty, six outer angular petal armor plates, orange glowing seam lines. All plates and every base tier must be SOLID OPAQUE dark charcoal volcanic rock and black brushed metal, with readable dark grey surface texture and restrained ember-orange seams. No white, silver, glass, crystal or translucency on solid material. No object inside the ring. Keep exact frontal perspective, placement and dimensions: canvas1024x628, ring outer bounds x238..786 y30..390, central transparent opening centered(511,236) radius105, base x263..754 y385..550 with upper seating surface at y398 and floor contact y550. Preserve this spatial geometry so the image replaces an existing aligned sprite. True transparent alpha background including central hole and gaps; do not draw any checkerboard. No environment, no floor plane, no text, no broad glow, no particles, no neon haze. High quality detailed realistic fantasy game collectible stand.

## Vérification

PNG final inspecté visuellement. Alpha des échantillons de roche et du socle : 255 ; du centre et du fond extérieur : 0. Médiane de l’alpha des pixels solides : 255. Le rendu composé dans l’application n’a pas été capturé.
