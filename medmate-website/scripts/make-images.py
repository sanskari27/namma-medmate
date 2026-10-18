"""Builds the social share image (public/og.png). The icons (favicon, logo.png, apple-icon.png) come from make-favicons.py.
Run: python3 scripts/make-images.py [path-to-Outfit[wght].ttf] [home-screenshot]
Outfit is the brand font (Google Fonts, OFL); a copy is in brand/fonts/."""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT = sys.argv[1] if len(sys.argv) > 1 else "brand/fonts/Outfit[wght].ttf"
SHOT = sys.argv[2] if len(sys.argv) > 2 else "public/screens/home.webp"
FOREST, GREEN700, GOLD, WHITE, MINT200, INK = (27, 61, 41), (37, 107, 70), (217, 166, 72), (255, 255, 255), (217, 240, 225), (20, 32, 26)

def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([weight])
    return f

def gradient(w, h, top, bottom):
    im = Image.new("RGB", (w, h), top)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return im

def wordmark(d, x, y, size, med=WHITE):
    f = font(size, 700)
    d.text((x, y), "Med", font=f, fill=med)
    w = d.textlength("Med", font=f) - size * 0.035
    d.text((x + w, y), "Mate", font=f, fill=GOLD)

# Social card 1200 x 630
W, H = 1200, 630
og = gradient(W, H, FOREST, GREEN700)
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([700, 60, 1260, 560], fill=GOLD + (60,))
og = Image.alpha_composite(og.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(90)))
d = ImageDraw.Draw(og)
wordmark(d, 72, 64, 64)
d.text((72, 150), "CARE · DELIVERED IN MINUTES", font=font(20, 600), fill=MINT200)
y = 214
for line, col in (("Medicines from", WHITE), ("pharmacies near you,", WHITE), ("delivered in minutes.", GOLD)):
    d.text((72, y), line, font=font(58, 700), fill=col)
    y += 68
chips = ["Licensed pharmacies", "Free doctor call", "Live tracking"]
layer = Image.new("RGBA", og.size, (0, 0, 0, 0))
ld = ImageDraw.Draw(layer)
x, spots = 72, []
for c in chips:
    f = font(22, 600)
    w = d.textlength(c, font=f) + 36
    ld.rounded_rectangle([x, 470, x + w, 516], radius=23, fill=(255, 255, 255, 30), outline=(255, 255, 255, 70))
    spots.append((x + 18, c))
    x += w + 12
og = Image.alpha_composite(og, layer)
d = ImageDraw.Draw(og)
for x, c in spots:
    d.text((x, 493), c, font=font(22, 600), fill=WHITE, anchor="lm")
d.text((72, 556), "Launching soon in Bengaluru", font=font(20, 600), fill=GOLD)

try:
    shot = Image.open(SHOT).convert("RGB")
    pw = 300
    ph = int(shot.height * pw / shot.width)
    shot = shot.resize((pw, ph), Image.LANCZOS)
    frame = Image.new("RGBA", (pw + 20, ph + 20), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle([0, 0, pw + 19, ph + 19], radius=46, fill=INK)
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=38, fill=255)
    frame.paste(shot, (10, 10), mask)
    shadow = Image.new("RGBA", og.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([830, 90, 830 + pw + 20, 90 + ph + 20], radius=46, fill=(0, 0, 0, 110))
    og = Image.alpha_composite(og, shadow.filter(ImageFilter.GaussianBlur(24)))
    og.alpha_composite(frame, (820, 70))
except FileNotFoundError:
    pass
og.convert("RGB").save("public/og.png", optimize=True)

print("ok")
