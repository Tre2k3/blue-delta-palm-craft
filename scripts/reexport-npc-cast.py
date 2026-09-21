#!/usr/bin/env python3
"""Re-cut NPC / K Blanco plates. No gold keying. Blobs, not overlapping rects."""
from pathlib import Path
from PIL import Image

ROOT = Path("/workspace")
MAPS = ROOT / "assets/sackreligious_game_asset_pack/04_CHARACTER_MAPS"
ATT = ROOT / "attachments"
OUT = ROOT / "public/game/people"
GAME = ROOT / "public/game"
OUT.mkdir(parents=True, exist_ok=True)


def flood_alpha(im, thresh=40):
    """Key only background colour connected to the border. Never gold. Never interior dark."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    samples = []
    step = max(1, w // 50)
    for x in range(0, w, step):
        samples.append(px[x, 0][:3])
        samples.append(px[x, h - 1][:3])
    for y in range(0, h, step):
        samples.append(px[0, y][:3])
        samples.append(px[w - 1, y][:3])
    br = sum(s[0] for s in samples) / len(samples)
    bg = sum(s[1] for s in samples) / len(samples)
    bb = sum(s[2] for s in samples) / len(samples)
    stack = []
    vis = bytearray(w * h)
    limit = thresh * 3

    def is_bg(r, g, b, x, y):
        dist = abs(r - br) + abs(g - bg) + abs(b - bb)
        if dist < limit:
            return True
        luma = (r + g + b) / 3
        # studio paper / grey card, only near the frame edge
        edge = x < 4 or y < 4 or x > w - 5 or y > h - 5
        if edge and luma > 200 and abs(r - g) < 24 and abs(g - b) < 24:
            return True
        return False

    def push(x, y):
        i = y * w + x
        if vis[i]:
            return
        r, g, b, a = px[x, y]
        if a == 0:
            vis[i] = 1
            return
        if is_bg(r, g, b, x, y):
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
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if vis[i]:
                    continue
                r, g, b, a = px[nx, ny]
                if a == 0 or is_bg(r, g, b, nx, ny):
                    vis[i] = 1
                    if a:
                        stack.append((nx, ny))
    return im


def tight(im, pad=6):
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def blobs(im, min_h=90):
    w, h = im.size
    alpha = im.split()[3].load()
    vis = bytearray(w * h)
    found = []
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
                if cx < minx:
                    minx = cx
                if cx > maxx:
                    maxx = cx
                if cy < miny:
                    miny = cy
                if cy > maxy:
                    maxy = cy
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
            if bh < min_h or bw < 36:
                continue
            aspect = bw / max(1, bh)
            # one person, not two glued together, not a landscape strip
            if aspect < 0.18 or aspect > 0.62:
                continue
            if bw * bh > 0.4 * w * h:
                continue
            if count < 800:
                continue
            found.append((bh * bw, minx, miny, maxx, maxy, count))
    found.sort(reverse=True)
    found = found[:18]
    found.sort(key=lambda b: (b[2] // 70, b[1]))
    return found


def save_plate(im, path, size):
    im = tight(im, pad=8)
    im = im.resize(size, Image.Resampling.LANCZOS)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", lossless=True, exact=True)
    print("webp", path.name, im.size, "opaque", sum(1 for a in im.split()[3].getdata() if a > 40))


def extract(src, names, size=(400, 760)):
    if not src.exists():
        print("missing", src)
        return []
    cut = flood_alpha(Image.open(src), thresh=38)
    found = blobs(cut)
    written = []
    for i, name in enumerate(names):
        if i >= len(found):
            print("short", src.name, "need", name)
            break
        _, x0, y0, x1, y1, _ = found[i]
        pad = 10
        piece = cut.crop((max(0, x0 - pad), max(0, y0 - pad), min(cut.width, x1 + pad), min(cut.height, y1 + pad)))
        save_plate(piece, OUT / name, size)
        written.append(name)
    print("from", src.name, "->", written)
    return written


# Street / court / crowd
extract(MAPS / "07_memphis_street_NPC_character_map.png", [
    "fan.webp", "local.webp", "supporter.webp", "host.webp",
    "walker-00.webp", "walker-01.webp", "walker-02.webp", "walker-03.webp",
])
extract(MAPS / "06_901_court_character_map.png", [
    "court-og.webp", "dj.webp", "baller-1.webp", "walker-04.webp", "walker-05.webp",
])
extract(MAPS / "09_crowd_ambient_character_map.png", [
    "walker-06.webp", "walker-07.webp",
])

# K Blanco: equal columns, not overlapping magic rects
sheet_path = ATT / "kblanco-character-ref.png"
if not sheet_path.exists():
    sheet_path = MAPS / "03_K_Blanco_character_map.png"
sheet = Image.open(sheet_path).convert("RGBA")
sw, sh = sheet.size
# two rows, four columns — inset so we never take the neighbour
cols, rows = 4, 2
# measured from the 1448x1086 sheet: figures live in these bands
row_y = [(70, 430), (430, 900)]
for ri, (y0, y1) in enumerate(row_y):
    for ci in range(cols):
        x0 = int(ci * sw / cols) + 18
        x1 = int((ci + 1) * sw / cols) - 18
        cell = flood_alpha(sheet.crop((x0, y0, x1, y1)), thresh=36)
        cell = tight(cell, pad=6)
        if cell.getbbox() is None:
            continue
        name = {
            (0, 0): "k-blanco-front.webp",
            (0, 1): None,
            (0, 2): None,
            (0, 3): None,
            (1, 0): "k-blanco.webp",
            (1, 1): None,
            (1, 2): None,
            (1, 3): None,
        }.get((ri, ci))
        if name:
            save_plate(cell, OUT / name, (420, 780) if "front" in name or name == "k-blanco.webp" else (400, 760))

# portrait from right-side full figure if present
port = flood_alpha(sheet.crop((int(sw * 0.62), 90, sw - 20, sh - 80)), thresh=36)
port = tight(port, pad=4)
if port.getbbox():
    save_plate(port, GAME / "k-blanco-portrait.webp", (480, 620))

print("done")
