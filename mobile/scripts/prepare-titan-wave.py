"""Rebuild Titan Wave RGBA layers (Pillow). Originals are never modified."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/shop/effects/titan-wave'
im = Image.open(OUT / 'rest-master.png').convert('RGB').resize((768, 512), Image.Resampling.LANCZOS)
# The generated rest master contains a baked grey checkerboard. Its neutral,
# bright pixels are outside the warm/dark basalt silhouette. Limit extraction
# to the observed pedestal bounding box; keep the edge antialiased.
alpha = Image.new('L', im.size)
for y in range(168, 425):
    for x in range(116, 654):
        r,g,b = im.getpixel((x,y))
        warm = r - b
        if warm > 18 or max(r,g,b) < 130:
            alpha.putpixel((x,y), 255)
alpha = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.35))
rest=im.convert('RGBA'); rest.putalpha(alpha); rest.save(OUT/'rest.png')
cracks=Image.new('RGBA',im.size)
for y in range(512):
    for x in range(768):
        r,g,b=im.getpixel((x,y)); a=alpha.getpixel((x,y))
        # Extract warm fissures and bevels from the rest artwork itself, not a
        # second explosion. Exact pixel registration is retained.
        strength=max(0,min(1,(r-max(g,b)-18)/55))*max(0,min(1,(r-95)/85))
        cracks.putpixel((x,y),(255,117,22,round(a*strength)))
cracks.save(OUT/'fissures.png')
source=Image.open(ROOT/'assets/shop/packs/sang-des-titans/items/titan-wave-effect.png').convert('RGBA')
polygons=[[(214,69),(242,42),(260,51),(286,116),(270,143),(234,120)],
          [(616,177),(657,136),(684,148),(671,210),(630,243),(613,222)],
          [(180,143),(190,129),(209,139),(216,160),(203,180),(189,167)],
          [(574,119),(589,110),(599,118),(590,136),(578,144),(573,133)]]
for index,points in enumerate(polygons):
    mask=Image.new('L',source.size);ImageDraw.Draw(mask).polygon(points,fill=255)
    from PIL import ImageChops
    rock=source.copy();rock.putalpha(ImageChops.multiply(source.getchannel('A'),mask))
    rock=rock.crop(mask.getbbox());rock.save(OUT/f'rock-{index+1}.png')
print('Prepared rest, fissures and four rocks as RGBA layers.')
