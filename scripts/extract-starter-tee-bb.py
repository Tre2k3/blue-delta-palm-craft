#!/usr/bin/env python3
"""Starter-tee basketball plates. Shared scale + foot baseline. Border flood only."""
from pathlib import Path
from PIL import Image

SRC = Path("/tmp/starter_bb")
OUT = Path("/workspace/public/game/benji/basketball/starter_tee")
CANVAS = (420, 780)
PAD = 18
# Source files already share a canvas and foot line (feet y=643 on 455x691).
FILES = {
    "ready": SRC / "starter_tee_ready.png",
    "drive": SRC / "starter_tee_drive.png",
    "shot-front": SRC / "starter_tee_shot_front.png",
    "shot-back": SRC / "starter_tee_shot_back.png",
}
FEET_Y = 643
HEAD_Y = 48  # ready hat top — shared body scale


def flood_border(im: Image.Image, thresh: int = 18) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    vis = bytearray(w * h)
    stack = []

    def is_bg(r, g, b, a):
        if a < 12:
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


def place(im: Image.Image) -> Image.Image:
    cw, ch = CANVAS
    scale = (ch - PAD * 2) / (FEET_Y - HEAD_Y)
    nw = max(1, int(im.width * scale))
    nh = max(1, int(im.height * scale))
    scaled = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    dest_feet = ch - PAD
    x = (cw - nw) // 2
    y = dest_feet - int(FEET_Y * scale)
    # Allow horizontal clip; keep shared scale.
    canvas.paste(scaled, (x, y), scaled)
    return canvas


OUT.mkdir(parents=True, exist_ok=True)
for name, src in FILES.items():
    im = flood_border(Image.open(src))
    out = place(im)
    dest = OUT / f"{name}.png"
    out.save(dest, "PNG", optimize=True)
    bb = out.getbbox()
    print(name, dest.stat().st_size, "bbox", bb, "hfill", round((bb[3] - bb[1]) / 780, 2) if bb else 0)
print("done")
