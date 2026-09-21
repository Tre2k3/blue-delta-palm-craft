#!/usr/bin/env python3
"""Cut approved Benji basketball sheets. Border-connected key only — never global black."""
from pathlib import Path
from PIL import Image

ROOT = Path("/workspace")
SRC_BB = Path("/tmp/benji_bball")
SRC_FIT = Path("/tmp/benji_outfits")
OUT_BB = ROOT / "public/game/benji/basketball"
OUT_PREV = ROOT / "public/game/apparel/previews"
CANVAS = (420, 780)
PAD = 14

# Visual audit (filenames are ChatGPT noise). Duplicate imagegen == streetwear_character_action_sheet.
BBALL_SHEETS = {
    "tour_red": SRC_BB / "streetwear_character_action_sheet.png",
    "tour_white": SRC_BB / "four_pose_streetwear_character_sheet.png",
    "tour_black": SRC_BB / "streetwear_basketball_character_sheet.png",
    "jersey_black_fresh": SRC_BB / "sackreligious_basketball_character_sheet.png",
    "jersey_white_224": SRC_BB / "four_pose_basketball_character_sheet.png",
}

OUTFIT_STILLS = {
    "jersey_white_224": SRC_FIT / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (1).png",
    "jersey_blue_fresh": SRC_FIT / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (2).png",
    "jersey_black_fresh": SRC_FIT / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (3).png",
    "tour_white": SRC_FIT / "ChatGPT Image Aug 31, 2026, 01_05_21 AM (1).png",
    "tour_black": SRC_FIT / "ChatGPT Image Aug 31, 2026, 01_05_21 AM (2).png",
    "tour_red": SRC_FIT / "ChatGPT Image Aug 31, 2026, 01_05_22 AM (3).png",
}

CELLS = {
    "ready": (0.0, 0.0, 0.5, 0.5),
    "drive": (0.5, 0.0, 1.0, 0.5),
    "shot-front": (0.0, 0.5, 0.5, 1.0),
    "shot-back": (0.5, 0.5, 1.0, 1.0),
}


def flood_border(im: Image.Image, thresh: int = 28) -> Image.Image:
    """Erase only background connected to the image border. Keep interior black."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    vis = bytearray(w * h)
    stack = []

    def is_bg(r, g, b, a):
        if a < 8:
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


def feather(im: Image.Image) -> Image.Image:
    """1px alpha feather on the silhouette edge only."""
    w, h = im.size
    px = im.load()
    alpha = [px[x, y][3] for y in range(h) for x in range(w)]
    out = im.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            a = alpha[y * w + x]
            if a == 0:
                continue
            edge = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h or alpha[ny * w + nx] == 0:
                    edge = True
                    break
            if edge and a > 180:
                r, g, b, _ = px[x, y]
                op[x, y] = (r, g, b, 200)
    return out


def ground(im: Image.Image, size=CANVAS) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return Image.new("RGBA", size, (0, 0, 0, 0))
    cut = im.crop(bbox)
    cw, ch = size
    # Fit inside canvas with padding, keep aspect, feet on baseline.
    max_w = cw - PAD * 2
    max_h = ch - PAD * 2
    scale = min(max_w / cut.width, max_h / cut.height)
    nw = max(1, int(cut.width * scale))
    nh = max(1, int(cut.height * scale))
    cut = cut.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (cw - nw) // 2
    y = ch - nh - PAD
    canvas.paste(cut, (x, max(0, y)), cut)
    return canvas


def save(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG", optimize=True)
    print("wrote", path.relative_to(ROOT), im.size)


def extract_sheet(src: Path, dest: Path):
    keyed = flood_border(Image.open(src))
    keyed = feather(keyed)
    w, h = keyed.size
    for name, (u0, v0, u1, v1) in CELLS.items():
        cell = keyed.crop((int(u0 * w) + 4, int(v0 * h) + 4, int(u1 * w) - 4, int(v1 * h) - 4))
        save(ground(cell), dest / f"{name}.png")


def extract_preview(src: Path, dest: Path, four_view: bool):
    im = Image.open(src).convert("RGBA")
    if four_view:
        # 2×2 turnaround — front is top-left.
        w, h = im.size
        im = im.crop((8, 8, w // 2 - 8, h // 2 - 8))
    if im.split()[3].getextrema()[1] < 8:
        im = flood_border(im)
    # keep the largest opaque blob (drop merch around jersey stills)
    w, h = im.size
    alpha = im.split()[3].load()
    vis = bytearray(w * h)
    best = None
    px = im.load()
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
        save(ground(im), dest)
        return
    _, x0, y0, x1, y1 = best
    cut = im.crop((max(0, x0 - 8), max(0, y0 - 8), min(w, x1 + 9), min(h, y1 + 9)))
    save(ground(cut, (420, 780)), dest)


print("BASKETBALL SHEETS")
for outfit, src in BBALL_SHEETS.items():
    print(" ", outfit, "<=", src.name)
    extract_sheet(src, OUT_BB / outfit)

print("PREVIEWS")
for outfit, src in OUTFIT_STILLS.items():
    four = outfit.startswith("tour_")
    extract_preview(src, OUT_PREV / f"{outfit}.png", four_view=four)

print("done")
