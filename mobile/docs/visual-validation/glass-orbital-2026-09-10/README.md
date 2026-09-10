# Clear glass capsule and orbital depth

The Capsule Cristal uses `rank-crystal-capsule-glass.png` in the shop and room.
The built-in image generator replaced saturated blue metal with clear glass,
neutral highlights and silver/champagne fittings. `manifest.json` stores both
prompts and the source/output paths. `prepare.py` performs the previously
authorized chroma-key extraction, including partial alpha for glass reflections.
The final RGBA asset was inspected; its empty chamber remains transparent.

The Noyau Orbital retains its existing artwork. The central item rests on the
interior platform at source row 378, with its size and aspect ratio preserved.
Its near horizontal arc is rendered
again above the item, clipped from the original sprite in source coordinates.
The rear arcs remain behind the item; the foreground layer ignores pointer events
and does not add another accessibility announcement. This applies in both room
renderers. The source base contact measurement was also corrected to row 558.

Validation: 32 scene/layout/catalog tests passed. The in-app browser could not
attach its webview, so the complete live composition was not visually inspected.
