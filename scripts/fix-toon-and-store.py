#!/usr/bin/env python3
"""Flood-cut toon people, solid Benji, boutique photos. No studio plates."""
from pathlib import Path
from PIL import Image
import shutil

ROOT = Path("/workspace")
ATT = ROOT / "attachments"
MAPS = ROOT / "assets/sackreligious_game_asset_pack/04_CHARACTER_MAPS"
PEOPLE = ROOT / "public/game/people"
STORE = ROOT / "public/game/store"
BENJI = ROOT / "public/game"
STORE.mkdir(parents=True, exist_ok=True)
PEOPLE.mkdir(parents=True, exist_ok=True)


def save_png(im, path, size=None):
    im = im.convert("RGBA")
    if size:
        im = im.resize(size, Image.Resampling.LANCZOS)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG", optimize=True)
    print("png", path.name, im.size)


def save_jpg(im, path, max_side=1600, q=84):
    im = im.convert("RGB")
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "JPEG", quality=q, optimize=True)
    print("jpg", path.name, im.size)


def flood_alpha(im, thresh=42, near_white=False):
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

    def is_bg(r, g, b):
        dist = abs(r - br) + abs(g - bg) + abs(b - bb)
        gold = r > 145 and g > 110 and b < 110 and r > b
        if near_white:
            luma = (r + g + b) / 3
            if luma > 210 and abs(r - g) < 28 and abs(g - b) < 28:
                return True
            # green/grey studio
            if g > 90 and abs(r - g) < 45 and abs(g - b) < 45 and luma > 130:
                return True
        dark = r < 42 and g < 42 and b < 42
        return dist < thresh * 3 or gold or dark

    def push(x, y):
        i = y * w + x
        if vis[i]:
            return
        r, g, b, a = px[x, y]
        if a == 0:
            return
        if is_bg(r, g, b):
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
                if is_bg(r, g, b):
                    vis[i] = 1
                    stack.append((nx, ny))
    return im


def tight(im, pad=6):
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


# --- boutique photos ---
store_src = {
    "main-floor.jpg": ATT / "sr_store_main_floor.png",
    "checkout.jpg": ATT / "sr_store_checkout_area.png",
    "entry.jpg": ATT / "sr_store_front_entry.png",
    "exit.jpg": ATT / "sr_store_back_exit.png",
    "merch-wall.jpg": ATT / "sackreligious-moneybag-logo-merch-wall-display.png",
    "featured.jpg": ATT / "sackreligious-benji-featured-products-display.png",
    "counter.jpg": ATT / "sackreligious-benji-checkout-counter-scene.png",
    "welcome.jpg": ATT / "sackreligious-benji-store-entrance-welcome-scene.jpeg",
}
for name, src in store_src.items():
    if src.exists():
        save_jpg(Image.open(src), STORE / name)

# --- Benji idle from approved toon turnaround (no green plate) ---
benji_map = {
    "benji-front.png": ATT / "character_front_smile.png",
    "benji-back.png": ATT / "character_back_view.png",
    "benji-left.png": ATT / "character_left_view.png",
    "benji-right.png": ATT / "character_three_quarter_view.png",
}
for name, src in benji_map.items():
    cut = flood_alpha(Image.open(src), thresh=40, near_white=True)
    cut = tight(cut, pad=8)
    save_png(cut, BENJI / name, (512, 896))
    # also replace *-norm so fallback isn't the ghost plate
    save_png(cut, BENJI / name.replace(".png", "-norm.png"), (360, 640))

# Walk / jump: knock the white card off
walk_dir = BENJI / "benji"
if walk_dir.exists():
    for p in sorted(walk_dir.glob("*.png")):
        cut = flood_alpha(Image.open(p), thresh=38, near_white=True)
        cut = tight(cut, pad=6)
        save_png(cut, p, (360, 640))

# --- K Blanco: tight idle + welcoming as the in-store sprite ---
sheet = Image.open(ATT / "kblanco-character-ref.png").convert("RGBA")
idle = flood_alpha(sheet.crop((48, 448, 232, 812)), thresh=40)
idle = tight(idle, pad=4)
save_png(idle, PEOPLE / "k-blanco.png", (380, 760))
save_png(idle, PEOPLE / "k-blanco-idle.png", (380, 760))
welcome = flood_alpha(sheet.crop((470, 448, 668, 812)), thresh=40)
welcome = tight(welcome, pad=4)
save_png(welcome, PEOPLE / "k-blanco-welcoming.png", (380, 760))
hips = flood_alpha(sheet.crop((690, 448, 890, 812)), thresh=40)
hips = tight(hips, pad=4)
save_png(hips, PEOPLE / "k-blanco-hips.png", (380, 760))
port = flood_alpha(sheet.crop((980, 150, 1400, 790)), thresh=36)
port = tight(port, pad=4)
save_png(port, BENJI / "k-blanco-portrait.png", (480, 620))


def extract_figures(src, dest_names, min_h=110):
    """Edge-flood a character map, then take the tallest person-shaped blobs."""
    im = flood_alpha(Image.open(src), thresh=38, near_white=False)
    w, h = im.size
    alpha = im.split()[3].load()
    vis = bytearray(w * h)
    blobs = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
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
                for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if vis[j]:
                            continue
                        if alpha[nx, ny] < 40:
                            continue
                        vis[j] = 1
                        stack.append((nx, ny))
            bw, bh = maxx - minx, maxy - miny
            if bh < min_h or bw < 40:
                continue
            aspect = bw / max(1, bh)
            if aspect < 0.22 or aspect > 0.78:
                continue
            if bw * bh > 0.35 * w * h:
                continue
            blobs.append((bh * bw, minx, miny, maxx, maxy))
    blobs.sort(reverse=True)
    # prefer left-to-right, top-to-bottom among the biggest
    blobs = blobs[: max(12, len(dest_names) + 4)]
    blobs.sort(key=lambda b: (b[2] // 80, b[1]))
    out = []
    for i, name in enumerate(dest_names):
        if i >= len(blobs):
            break
        _, x0, y0, x1, y1 = blobs[i]
        pad = 8
        cut = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))
        cut = tight(cut, pad=4)
        save_png(cut, PEOPLE / name, (360, 700))
        out.append(name)
    return out


street = MAPS / "07_memphis_street_NPC_character_map.png"
court = MAPS / "06_901_court_character_map.png"
crowd = MAPS / "09_crowd_ambient_character_map.png"
kids = MAPS / "04_neighborhood_kids_character_map.png"
crew = MAPS / "05_boutique_crew_character_map.png"

extract_figures(street, ["fan.png", "local.png", "supporter.png", "host.png", "street-1.png", "street-2.png"])
extract_figures(court, ["court-og.png", "dj.png", "baller-1.png", "baller-2.png", "sideline.png"])
extract_figures(crowd, ["crowd-1.png", "crowd-2.png", "crowd-3.png"])
if kids.exists():
    extract_figures(kids, ["kid-1.png", "kid-2.png"])
if crew.exists():
    extract_figures(crew, ["clerk.png", "stylist.png"])

print("done")
