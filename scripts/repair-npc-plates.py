#!/usr/bin/env python3
"""Repair already-cut NPC plates: fill interior holes, drop neighbour-panel slices, write webp."""
from pathlib import Path
from PIL import Image

ROOT = Path("/workspace")
PEOPLE = ROOT / "public/game/people"


def fill_interior_holes(im: Image.Image) -> Image.Image:
    """Transparent pixels connected to the border stay; interior holes get neighbour colour."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    border = bytearray(w * h)
    stack = []

    def push(x, y):
        if x < 0 or y < 0 or x >= w or y >= h:
            return
        i = y * w + x
        if border[i]:
            return
        if px[x, y][3] >= 40:
            return
        border[i] = 1
        stack.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while stack:
        x, y = stack.pop()
        push(x - 1, y)
        push(x + 1, y)
        push(x, y - 1)
        push(x, y + 1)

    changed = 1
    guard = 0
    while changed and guard < 24:
        changed = 0
        guard += 1
        for y in range(h):
            for x in range(w):
                i = y * w + x
                if border[i] or px[x, y][3] >= 40:
                    continue
                sr = sg = sb = n = 0
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    r, g, b, a = px[nx, ny]
                    if a < 80:
                        continue
                    sr += r
                    sg += g
                    sb += b
                    n += 1
                if n < 2:
                    continue
                px[x, y] = ((sr // n), (sg // n), (sb // n), 255)
                changed += 1
    return im


def main_blob(im: Image.Image):
    """Keep the largest person-shaped blob; drop neighbour-panel leftovers."""
    im = im.convert("RGBA")
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
            count = 0
            while stack:
                cx, cy = stack.pop()
                count += 1
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
                    if alpha[nx, ny] < 40:
                        continue
                    stack.append((nx, ny))
            bw, bh = maxx - minx + 1, maxy - miny + 1
            aspect = bw / max(1, bh)
            if bh < h * 0.45 or aspect > 0.72:
                continue
            score = count * bh
            if best is None or score > best[0]:
                best = (score, minx, miny, maxx, maxy)
    if not best:
        return im
    _, x0, y0, x1, y1 = best
    pad = 6
    cut = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad + 1), min(h, y1 + pad + 1)))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # ground the figure (feet near bottom)
    dx = (w - cut.width) // 2
    dy = h - cut.height - 4
    out.paste(cut, (dx, max(0, dy)), cut)
    return out


def save_webp(im, path):
    im.save(path, "WEBP", lossless=True, exact=True)
    print("webp", path.name, im.size)


# people plates
for png in sorted(PEOPLE.glob("*.png")):
    webp = png.with_suffix(".webp")
    im = fill_interior_holes(Image.open(png))
    im = main_blob(im)
    save_webp(im, webp)

port = ROOT / "public/game/k-blanco-portrait.png"
if port.exists():
    im = fill_interior_holes(Image.open(port))
    save_webp(im, ROOT / "public/game/k-blanco-portrait.webp")

print("done")
