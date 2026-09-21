#!/usr/bin/env python3
"""Extract individualized Benji outfit plates. No global black key."""
from pathlib import Path
from PIL import Image

ROOT = Path("/workspace")
SRC = Path("/tmp/benji_outfits")
OUT = ROOT / "public/game/benji/outfits"
CANVAS = (420, 780)
PAD = 14

TOUR = {
    "tour_white": SRC / "ChatGPT Image Aug 31, 2026, 01_05_21 AM (1).png",
    "tour_black": SRC / "ChatGPT Image Aug 31, 2026, 01_05_21 AM (2).png",
    "tour_red": SRC / "ChatGPT Image Aug 31, 2026, 01_05_22 AM (3).png",
}
# 2×2: TL face, TR back, BL faces screen-right, BR faces screen-left
TOUR_CELLS = {
    "front": (0.0, 0.0, 0.5, 0.5),
    "back": (0.5, 0.0, 1.0, 0.5),
    "right": (0.0, 0.5, 0.5, 1.0),
    "left": (0.5, 0.5, 1.0, 1.0),
}
JERSEY = {
    "jersey_white_224": SRC / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (1).png",
    "jersey_blue_fresh": SRC / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (2).png",
    "jersey_black_fresh": SRC / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (3).png",
}


def flood_border(im: Image.Image, thresh: int = 22) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    vis = bytearray(w * h)
    stack = []

    def is_bg(r, g, b, a):
        if a < 10:
            return True
        return r < thresh and g < thresh and b < thresh

    def push(x, y):
        if x < 0 or y < 0 or x >= w or y >= h:
            return
        i = y * w + x
        if vis[i]:
            return
        r, g, b, a = px[x, y]
        if not is_bg(r, g, b, a):
            return
        vis[i] = 1
        stack.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while stack:
        x, y = stack.pop()
        px[x, y] = (0, 0, 0, 0)
        push(x - 1, y)
        push(x + 1, y)
        push(x, y - 1)
        push(x, y + 1)
    return im


def largest_blob(im: Image.Image) -> Image.Image:
    w, h = im.size
    alpha = im.split()[3].load()
    vis = bytearray(w * h)
    best = None
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if vis[i] or alpha[x, y] < 40:
                continue
            stack = [(x, y)]
            vis[i] = 1
            minx = maxx = x
            miny = maxy = y
            n = 0
            while stack:
                cx, cy = stack.pop()
                n += 1
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    j = ny * w + nx
                    if vis[j]:
                        continue
                    vis[j] = 1
                    if alpha[nx, ny] >= 40:
                        stack.append((nx, ny))
            if best is None or n > best[0]:
                best = (n, minx, miny, maxx, maxy)
    if not best:
        return im
    _, x0, y0, x1, y1 = best
    return im.crop((max(0, x0 - 6), max(0, y0 - 6), min(w, x1 + 7), min(h, y1 + 7)))


def ground(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    cut = im.crop(bbox)
    cw, ch = CANVAS
    scale = min((cw - PAD * 2) / cut.width, (ch - PAD * 2) / cut.height)
    nw = max(1, int(cut.width * scale))
    nh = max(1, int(cut.height * scale))
    cut = cut.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    x = (cw - nw) // 2
    y = ch - nh - PAD
    canvas.paste(cut, (x, max(0, y)), cut)
    return canvas


def save(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG", optimize=True)
    print("wrote", path.relative_to(ROOT), im.size)


def extract_cell(im: Image.Image, uv) -> Image.Image:
    w, h = im.size
    u0, v0, u1, v1 = uv
    cell = im.crop((int(u0 * w) + 6, int(v0 * h) + 6, int(u1 * w) - 6, int(v1 * h) - 6))
    if cell.split()[3].getextrema()[1] < 12:
        cell = flood_border(cell)
    return ground(largest_blob(cell))


print("TOUR 4-VIEW")
for outfit, src in TOUR.items():
    im = Image.open(src).convert("RGBA")
    dest = OUT / outfit
    for view, uv in TOUR_CELLS.items():
        save(extract_cell(im, uv), dest / f"{view}.png")

print("JERSEY — pick the standing-person cell, not merch")
for outfit, src in JERSEY.items():
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    best = None
    for uv in ((0, 0, 0.5, 0.5), (0.5, 0, 1, 0.5), (0, 0.5, 0.5, 1), (0.5, 0.5, 1, 1)):
        cell = im.crop((int(uv[0] * w) + 4, int(uv[1] * h) + 4, int(uv[2] * w) - 4, int(uv[3] * h) - 4))
        if cell.split()[3].getextrema()[1] < 12:
            cell = flood_border(cell)
        blob = largest_blob(cell)
        bb = blob.getbbox()
        if not bb:
            continue
        bw, bh = bb[2] - bb[0], bb[3] - bb[1]
        if bh < 80 or bh < bw * 1.15:
            continue
        score = bh * (bh / max(bw, 1))
        if best is None or score > best[0]:
            best = (score, blob)
    plate = ground(best[1] if best else largest_blob(flood_border(im)))
    dest = OUT / outfit
    for view in ("front", "back", "left", "right"):
        save(plate, dest / f"{view}.png")

print("done")
