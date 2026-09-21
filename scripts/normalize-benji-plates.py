#!/usr/bin/env python3
"""Height-normalize every Benji outfit and basketball plate onto a 420x780 canvas."""
from pathlib import Path
from PIL import Image

ROOT = Path("/workspace/public/game/benji")
CANVAS = (420, 780)
PAD = 16


def normalize(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    cut = im.crop(bbox)
    cw, ch = CANVAS
    target_h = ch - PAD * 2
    scale = target_h / max(cut.height, 1)
    nw = max(1, int(cut.width * scale))
    nh = max(1, int(cut.height * scale))
    cut = cut.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    x = (cw - nw) // 2
    y = ch - nh - PAD
    if x < 0:
        cut = cut.crop((-x, 0, -x + cw, nh))
        x = 0
    if y < 0:
        cut = cut.crop((0, -y, cut.width, -y + ch))
        y = 0
    canvas.paste(cut, (x, y), cut)
    return canvas


count = 0
for folder in (ROOT / "outfits", ROOT / "basketball"):
    for p in sorted(folder.rglob("*.png")):
        before = Image.open(p)
        after = normalize(before)
        after.save(p, "PNG", optimize=True)
        bb = after.getbbox()
        hfill = (bb[3] - bb[1]) / CANVAS[1] if bb else 0
        print(f"{p.relative_to(ROOT)}  hfill={hfill:.2f}")
        count += 1
print("normalized", count)
