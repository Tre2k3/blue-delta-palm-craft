#!/usr/bin/env python3
"""Extract FULL-BODY idle plates from merch stills.

These jersey stills are 2×2: hanger / shoes / Benji / hanger.
Benji is the bottom-left cell on every sheet (verified).
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path("/workspace")
SRC = Path("/tmp/benji_outfits")
OUT = ROOT / "public/game/benji/outfits"
CANVAS = (512, 896)
PAD = 18
VIEWS = ("front", "back", "left", "right")

JERSEY_SHEETS = {
    "jersey_white_224": SRC / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (1).png",
    "jersey_blue_fresh": SRC / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (2).png",
    "jersey_black_fresh": SRC / "ChatGPT Image Aug 31, 2026, 01_04_03 AM (3).png",
}


def flood_border(im: Image.Image, thresh: int = 24) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    vis = bytearray(w * h)
    stack: list[tuple[int, int]] = []

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


def bl_cell(im: Image.Image, inset: int = 10) -> Image.Image:
    w, h = im.size
    return im.crop((inset, h // 2 + inset, w // 2 - inset, h - inset))


def place(im: Image.Image) -> Image.Image:
    bb = im.getbbox()
    if not bb:
        return Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    cut = im.crop(bb)
    cw, ch = CANVAS
    scale = min((cw - PAD * 2) / cut.width, (ch - PAD * 2) / cut.height)
    nw = max(1, int(cut.width * scale))
    nh = max(1, int(cut.height * scale))
    cut = cut.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.paste(cut, ((cw - nw) // 2, ch - nh - PAD), cut)
    return canvas


def main() -> None:
    for outfit, src in JERSEY_SHEETS.items():
        print(outfit, "<=", src.name)
        # Flood the full sheet first so Benji is interior and not eaten from a cell edge.
        sheet = flood_border(Image.open(src).convert("RGBA"))
        cell = bl_cell(sheet)
        full = place(cell)
        dest = OUT / outfit
        dest.mkdir(parents=True, exist_ok=True)
        for view in VIEWS:
            full.save(dest / f"{view}.png", "PNG", optimize=True)
        bb = full.getbbox()
        hfill = (bb[3] - bb[1]) / CANVAS[1] if bb else 0
        print(f"  full-body hfill={hfill:.2f} bbox={bb}")


if __name__ == "__main__":
    main()
