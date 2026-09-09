"""User-authorized chroma-key extraction; never remove dark material opacity."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

root = Path(__file__).resolve().parents[1]
manifest = root / 'docs/visual-validation/restored-displays-2026-09-09/manifest.json'
entries = json.loads(manifest.read_text())
for entry in entries:
    source = Image.open(entry['source']).convert('RGB')
    rgb = np.asarray(source, dtype=np.float32)
    red, green, blue = (rgb[:, :, i] for i in range(3))
    excess = np.minimum(red, blue) - green
    backing = (excess > 180) & (green < 50)
    edge = binary_dilation(backing, iterations=2)
    amount = np.where(edge, np.clip(excess / 255, 0, 1), 0)
    amount[backing] = 1
    alpha = 1 - amount
    clean = np.clip((rgb - amount[:, :, None] * [255, 0, 255]) / np.maximum(alpha[:, :, None], .01), 0, 255)
    rgba = np.dstack((clean, alpha * 255)).astype(np.uint8)
    rgba[alpha <= .01] = 0
    cutout = Image.fromarray(rgba)
    directory = root / 'assets/shop/atelier/ranks/overlays'
    size = Image.open(directory / f"rank-{entry['name']}-overlay.png").size
    scale = min(size[0] / source.width, size[1] / source.height)
    cutout = cutout.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    result = Image.new('RGBA', size)
    result.alpha_composite(cutout, ((size[0] - cutout.width) // 2, (size[1] - cutout.height) // 2))
    target = directory / f"rank-{entry['name']}-opaque.png"
    result.save(target)
    entry['output'] = str(target.relative_to(root))
    print(entry['name'], result.size)
manifest.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n')
