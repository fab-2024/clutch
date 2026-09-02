# Cercle Obsidienne — empty editor scene

Tool: built-in `image_gen.imagegen`, edit mode.

Source: `presenter-circle-obsidian.png` (preserved for the shop preview).
Output: `presenter-circle-obsidian-empty-v2.png`, 1844 × 853.

The editor uses the full image and calibrated pedestal coordinates. The original
preview's navigation, customization controls and display objects are not baked
into this new scene. Actual equipment and add buttons are rendered by React.

## Prompt

```text
Use case: precise-object-edit
Asset type: production background for an interactive React Native showroom, no UI baked in.
Input image 1: EDIT TARGET, the existing Cercle Obsidienne showroom.
Primary request: turn this exact image into the truly EMPTY version of the same showroom. Remove every display object: the jersey and hanger, trophy cup, giant central bronze crest, ring wreath, Rookie du Call title sign, small ring, hanging wall emblems/banners, and the two translucent diamond plus signs. Remove ALL letters, numbers, logos and UI, including the top navigation strip and bottom customization strip. Fill those two strips naturally with the continuation of the SAME ceiling at top and the SAME polished floor at bottom. Remove text from pedestal plaques, leaving blank plaques. Keep ALL EIGHT circular black pedestals: three small on the left, large stepped central pedestal, four small on the right. Their tops must be completely EMPTY, with no object-shaped placeholders, outlines, poles, mounts, trophies, fake objects or UI indicators.
Invariants: preserve the exact camera angle, panoramic 2.16:1 composition, pedestal positions and relative sizes from the input; keep the center pedestal centered and all side plinths completely visible. Preserve the room architecture, black marble pillars, ribbed alcoves, thin bronze trims, cyan ceiling rings and plinth edge lights, physically realistic shadows and reflections. Do not redesign the room.
Framing: same entire 1844x853 composition. Only reconstruct the obscured background where content was removed. No cropping of the sides or pedestals. The center plinth surface remains around x50%, y59%; side plinth surfaces around y61–65%.
Constraints: environment and empty pedestals ONLY. Absolutely NO TEXT, no logos, no interface, no plus signs, no banner panels, no furniture added, no objects on any pedestal, no watermark. Professional seamless retouching, no blur patches or black rectangular masks.
```
