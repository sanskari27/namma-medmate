"""Builds the site icons from the MedMate icon artwork: the "MedMate" wordmark (white "Med", gold "Mate",
Outfit Bold) centred on a forest-green gradient square. Chosen by the founder on 16 October 2026 ("no MM").
Run from MedMate-Website/: python3 scripts/make-favicons.py [path-to-Outfit[wght].ttf]
Writes src/app/favicon.ico (16, 32, 48 px), src/app/icon.png (512), src/app/apple-icon.png (180),
public/icon-192.png and public/logo.png (manifest, schema.org logo) and brand/logo/medmate-icon-1024.png."""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = sys.argv[1] if len(sys.argv) > 1 else "brand/fonts/Outfit[wght].ttf"
LIGHT, DARK = (54, 105, 74), (21, 52, 34)  # top-left glow to bottom-right
GOLD, WHITE = (217, 166, 72), (255, 255, 255)


def artwork(size):
    # Gradient: lightest in the top-left corner, darkest towards the bottom-right
    small = 256
    bg = Image.new("RGB", (small, small))
    px = bg.load()
    for y in range(small):
        for x in range(small):
            t = min(1.0, ((x / small) ** 2 + (y / small) ** 2) ** 0.5 / 1.15) ** 0.7
            px[x, y] = tuple(round(LIGHT[i] + (DARK[i] - LIGHT[i]) * t) for i in range(3))
    im = bg.resize((size, size), Image.BICUBIC).convert("RGBA")
    d = ImageDraw.Draw(im)
    # Wordmark: about 84% of the width, capitals centred just above the middle
    f = ImageFont.truetype(FONT, 100)
    f.set_variation_by_axes([700])
    kern = -0.035  # same tightening between "Med" and "Mate" as the site's wordmark
    width = d.textlength("Med", font=f) + d.textlength("Mate", font=f) + kern * 100
    px_size = 100 * size * 0.837 / width
    f = ImageFont.truetype(FONT, px_size)
    f.set_variation_by_axes([700])
    w_med = d.textlength("Med", font=f) + kern * px_size
    w_all = w_med + d.textlength("Mate", font=f)
    x = (size - w_all) / 2
    top = f.getbbox("M", anchor="ls")[1]  # negative: cap height above the baseline
    base = size * 0.494 - top / 2
    d.text((x, base), "Med", font=f, fill=WHITE, anchor="ls")
    d.text((x + w_med, base), "Mate", font=f, fill=GOLD, anchor="ls")
    return im


master = artwork(1024)
master.convert("RGB").save("brand/logo/medmate-icon-1024.png", optimize=True)
scaled = lambda s: master.resize((s, s), Image.LANCZOS)
frames = [scaled(s) for s in (16, 32, 48)]
frames[2].save("src/app/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=frames[:2])
scaled(512).convert("RGB").save("src/app/icon.png", optimize=True)
scaled(180).convert("RGB").save("src/app/apple-icon.png", optimize=True)
scaled(192).convert("RGB").save("public/icon-192.png", optimize=True)
scaled(512).convert("RGB").save("public/logo.png", optimize=True)
print("ok")
