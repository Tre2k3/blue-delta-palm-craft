#!/usr/bin/env python3
"""Re-punch 901 Day basketball poses from the approved full-body attachments.

The previous RGB dark-flood ate Benji's hat/head (dark skin against leftover
black fringe). These originals already have alpha — only erase border-connected
transparency and true near-black fringe. Never key skin, hat, or jersey.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path("/workspace")
OUT = ROOT / "public/game/benji/basketball/blue_901_day"
H = 896
PAD = 20
# Near-black leftover fringe only. Dark skin sits around (50,30,25) — leave it.
BLACK_MAX = 16

SOURCES = {
    "ready": ROOT / "attachments/benji_s_sackreligious_defensive_stance.png",
    "drive": ROOT / "attachments/dynamic_blue_jersey_runner_sticker.png",
    "shot-front": ROOT / "attachments/benji_s_901_day_jump_shot.png",
    "shot-back": ROOT / "attachments/benji_s_midair_basketball_follow_through.png",
}


def flood_fringe(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    vis = bytearray(w * h)
    stack: list[tuple[int, int]] = []

    def is_fringe(r: int, g: int, b: int, a: int) -> bool:
        if a < 24:
            return True
        return max(r, g, b) < BLACK_MAX

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h:
            return
        i = y * w + x
        if vis[i]:
            return
        r, g, b, a = px[x, y]
        if not is_fringe(r, g, b, a):
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


def color_bleed(im: Image.Image, radius: int = 2) -> Image.Image:
    w, h = im.size
    src = im.load()
    out = im.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] > 8:
                continue
            sr = sg = sb = n = 0
            for dy in range(-radius, radius + 1):
                yy = y + dy
                if yy < 0 or yy >= h:
                    continue
                for dx in range(-radius, radius + 1):
                    xx = x + dx
                    if xx < 0 or xx >= w:
                        continue
                    r, g, b, a = src[xx, yy]
                    if a < 180:
                        continue
                    sr += r
                    sg += g
                    sb += b
                    n += 1
            if n:
                dst[x, y] = (sr // n, sg // n, sb // n, 0)
    return out


def opaque_bbox(im: Image.Image, thresh: int = 16):
    w, h = im.size
    px = im.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] <= thresh:
                continue
            if x < minx:
                minx = x
            if y < miny:
                miny = y
            if x > maxx:
                maxx = x
            if y > maxy:
                maxy = y
    if maxx < minx:
        return None
    return (minx, miny, maxx + 1, maxy + 1)


def place_pack(crops: dict[str, Image.Image]) -> dict[str, Image.Image]:
    max_h = max(c.height for c in crops.values()) or 1
    scale = (H - PAD * 2) / max_h
    placed = {}
    for name, cut in crops.items():
        nw = max(1, int(round(cut.width * scale)))
        nh = max(1, int(round(cut.height * scale)))
        resized = cut.resize((nw, nh), Image.Resampling.LANCZOS)
        cw = nw + PAD * 2
        canvas = Image.new("RGBA", (cw, H), (0, 0, 0, 0))
        x = (cw - nw) // 2
        y = H - nh - PAD
        canvas.paste(resized, (x, y), resized)
        placed[name] = color_bleed(canvas, 2)
    return placed


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    crops = {}
    for name, src in SOURCES.items():
        if not src.exists():
            raise SystemExit(f"missing {src}")
        cleaned = flood_fringe(Image.open(src))
        box = opaque_bbox(cleaned)
        if not box:
            raise SystemExit(f"empty after flood: {name}")
        cut = cleaned.crop(box)
        crops[name] = cut
        print(f"  source {name}: {src.name} crop={cut.size} top-fill y0={box[1]}")

    packed = place_pack(crops)
    for name, im in packed.items():
        dest = OUT / f"{name}.png"
        im.save(dest, "PNG", optimize=True)
        box = opaque_bbox(im)
        hfill = (box[3] - box[1]) / H if box else 0
        print(f"  wrote {dest.relative_to(ROOT)} {im.size} hfill={hfill:.3f} bbox={box}")


if __name__ == "__main__":
    main()
