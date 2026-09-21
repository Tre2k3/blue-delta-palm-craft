#!/usr/bin/env python3
"""Stamp clean hair over the ghost face baked into K Blanco's curls."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path("/workspace")


def is_blonde(r, g, b, a=255):
    if a < 80:
        return False
    L = (r + g + b) / 3
    return L > 110 and r > 140 and g > 100 and (r - b) > 20


def is_ghost(r, g, b, a=255):
    """Sclera (neutral white) or pupil/shadow sitting in hair."""
    if a < 80:
        return False
    L = (r + g + b) / 3
    chroma = max(r, g, b) - min(r, g, b)
    if L > 158 and chroma < 48:
        return True
    if L < 105:
        return True
    # muddy brown eye leftover
    if 50 < L < 130 and r > g >= b - 8 and chroma < 55:
        return True
    return False


def stamp_hair(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    # Face sits around x 129-314, y 128-316 on the 420x780 plate.
    # Ghost is above the forehead, mostly viewer's right.
    y0, y1 = int(h * 0.10), int(h * 0.24)
    x0, x1 = int(w * 0.22), int(w * 0.82)
    # Source: left-side clean curls.
    src_x0, src_y0 = int(w * 0.28), int(h * 0.14)

    # First pass: copy blonde from a shifted left patch onto ghost pixels.
    out = im.copy()
    op = out.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if not is_ghost(r, g, b, a):
                continue
            # skip if this is the real forehead/skin
            if 145 < x < 300 and y > 155 and r > 90 and r > g + 10 and r > b + 15 and (r + g + b) / 3 < 170:
                continue
            sx = src_x0 + (x - x0) % 70
            sy = src_y0 + (y - y0) % 55
            if sx >= w or sy >= h:
                continue
            sr, sg, sb, sa = px[sx, sy]
            if not is_blonde(sr, sg, sb, sa):
                # search nearby blonde
                found = None
                for dy in range(-8, 9):
                    for dx in range(-8, 9):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            rr, gg, bb, aa = px[nx, ny]
                            if is_blonde(rr, gg, bb, aa):
                                found = (rr, gg, bb, 255)
                                break
                    if found:
                        break
                if not found:
                    continue
                sr, sg, sb, sa = found
            op[x, y] = (sr, sg, sb, 255)

    # Smooth the stamped region slightly so it doesn't look patched.
    region = out.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(0.6))
    # Only blur ghosted pixels, keep strand edges.
    rp = region.load()
    for yy in range(region.size[1]):
        for xx in range(region.size[0]):
            gx, gy = x0 + xx, y0 + yy
            r, g, b, a = px[gx, gy]
            if is_ghost(r, g, b, a):
                op[gx, gy] = rp[xx, yy]
    return out


def save(im, path: Path):
    if path.suffix.lower() == ".png":
        im.save(path, "PNG", optimize=True)
    else:
        im.save(path, "WEBP", lossless=True, exact=True)
    print("wrote", path)


for name in ("k-blanco-front.webp", "k-blanco.webp", "k-blanco-front.png", "k-blanco.png"):
    p = ROOT / "public/game/people" / name
    if not p.exists():
        continue
    out = stamp_hair(Image.open(p))
    save(out, p)
    out.crop((70, 60, 360, 300)).save(f"/tmp/{p.stem}-hair2.png")

print("done")
