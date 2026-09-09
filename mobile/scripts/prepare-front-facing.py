"""Extract approved green-screen renders without warping the collectible.

User-authorized image postprocessing: alpha extraction, color decontamination,
uniform resizing and placement only. Original artwork is never overwritten.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs/visual-validation/front-facing/manifest.json'
OUTPUT = ROOT / 'assets/shop/front-facing'


def extract(source: Image.Image) -> Image.Image:
    rgb = np.asarray(source.convert('RGB'), dtype=np.float32)
    red, green, blue = (rgb[:, :, i] for i in range(3))
    # A saturated green backing is deliberately absent from the subjects.
    # Preserve lime/olive artwork; only key green-dominant backing/edge pixels.
    excess = green - np.maximum(red, blue)
    amount = np.clip((excess - 65) / 165, 0, 1)
    pure_backing = (green > 190) & (red < 45) & (blue < 45) & (excess > 170)
    candidate = binary_dilation(pure_backing, iterations=3) & (green > 115) & (red < 115) & (blue < 115)
    amount = np.where(candidate, amount, 0)
    amount = np.where(pure_backing, 1, amount)
    alpha = 1 - amount
    # Remove the green contribution from antialiased boundary pixels.
    key = np.array([0, 255, 0], dtype=np.float32)
    clean = np.clip((rgb - amount[:, :, None] * key) / np.maximum(alpha[:, :, None], .01), 0, 255)
    edge = binary_dilation(alpha < .99, iterations=2) & (alpha > 0)
    clean[:, :, 1] = np.where(edge, np.minimum(clean[:, :, 1], np.maximum(clean[:, :, 0], clean[:, :, 2])), clean[:, :, 1])
    rgba = np.dstack((clean, alpha * 255)).astype(np.uint8)
    rgba[alpha <= .01] = 0
    return Image.fromarray(rgba)


def normalize(render: Image.Image, original: Image.Image) -> Image.Image:
    original = original.convert('RGBA')
    bounds = original.getchannel('A').point(lambda value: 255 if value > 24 else 0).getbbox()
    crop_bounds = render.getchannel('A').point(lambda value: 255 if value > 24 else 0).getbbox()
    if not bounds or not crop_bounds:
        raise ValueError('Empty artwork')
    crop = render.crop(crop_bounds)
    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    scale = min(width / crop.width, height / crop.height)
    crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    result = Image.new('RGBA', original.size)
    left = round((bounds[0] + bounds[2] - crop.width) / 2)
    result.alpha_composite(crop, (left, bounds[3] - crop.height))
    return result


def main():
    entries = json.loads(MANIFEST.read_text())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        if not entry.get('generated'):
            continue
        generated = Image.open(entry['generated'])
        normalized = normalize(extract(generated), Image.open(entry['source']))
        destination = OUTPUT / (entry['id'] + '.png')
        normalized.save(destination, compress_level=6)
        entry['output'] = str(destination.relative_to(ROOT))
        entry['status'] = 'prepared'
        print(entry['id'], normalized.size)
    MANIFEST.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
