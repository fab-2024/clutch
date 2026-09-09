"""Remove generated checkerboard with user-authorized image postprocessing.

Preserves opaque stone and uses one uniform scale to restore the existing seat.
Usage: python3 mobile/scripts/prepare-volcanic-display.py generated.png
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, label

root = Path(__file__).resolve().parents[1]
source = Image.open(sys.argv[1]).convert('RGB')
rgb = np.asarray(source).astype(np.int16)
# Checkerboard is neutral and bright; stone is dark and lava is orange.
candidate = (rgb.min(axis=2) > 155) & (rgb.max(axis=2) - rgb.min(axis=2) < 48)
components, _ = label(candidate)
counts = np.bincount(components.ravel())
background = candidate & (counts[components] > 80)
# Remove the light fringe before resampling; opaque interior is never alpha-keyed.
background = binary_dilation(background, iterations=1)
rgba = np.dstack((rgb.astype(np.uint8), np.where(background, 0, 255).astype(np.uint8)))
rgba[background] = 0
cutout = Image.fromarray(rgba)
scale = 491 / 845
cutout = cutout.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
result = Image.new('RGBA', (1024, 628))
result.alpha_composite(cutout, (round(508.5 - 799.5 * scale), round(550 - 900 * scale)))
target = root / 'assets/shop/atelier/ranks/overlays/rank-volcanic-forge-opaque.png'
result.save(target)
print(target)
