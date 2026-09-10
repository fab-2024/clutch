"""User-authorized background removal, preserving white glass reflections."""
import json
from pathlib import Path
import numpy as np
from PIL import Image

directory = Path(__file__).resolve().parent
entry = json.loads((directory / 'manifest.json').read_text())
rgb = np.asarray(Image.open(entry['source']).convert('RGB'), dtype=np.float32)
red, green, blue = (rgb[:, :, i] for i in range(3))
excess = np.minimum(red, blue) - green
# Partial alpha retains the glass highlights without retaining their pink backing.
amount = np.where(excess > 16, np.clip(excess / 255, 0, 1), 0)
amount[(excess > 180) & (green < 50)] = 1
alpha = 1 - amount
clean = np.clip((rgb - amount[:, :, None] * [255, 0, 255]) / np.maximum(alpha[:, :, None], .01), 0, 255)
rgba = np.dstack((clean, alpha * 255)).astype(np.uint8)
rgba[alpha <= .01] = 0
cutout = Image.fromarray(rgba)
cutout.thumbnail((1024, 709), Image.Resampling.LANCZOS)
result = Image.new('RGBA', (1024, 709))
result.alpha_composite(cutout, ((1024 - cutout.width) // 2, (709 - cutout.height) // 2))
target = directory.parents[2] / entry['output']
result.save(target)
print(target)
