#!/usr/bin/env python3
"""Reject broken Benji action sprites before they ship."""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path("/workspace/public/game/benji/basketball")
BG = 26


def fail(path: Path, msg: str, failures: list) -> None:
    line = f"FAIL {path.relative_to(ROOT.parent.parent)}  {msg}"
    print(line)
    failures.append(line)


def components(im: Image.Image):
    w, h = im.size
    px = im.load()
    vis = bytearray(w * h)
    found = []
    for y0 in range(h):
        for x0 in range(w):
            i0 = y0 * w + x0
            if vis[i0] or px[x0, y0][3] < 16:
                continue
            q = deque([(x0, y0)])
            vis[i0] = 1
            area = 0
            minx = maxx = x0
            miny = maxy = y0
            while q:
                x, y = q.popleft()
                area += 1
                minx = min(minx, x)
                maxx = max(maxx, x)
                miny = min(miny, y)
                maxy = max(maxy, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    ni = ny * w + nx
                    if vis[ni] or px[nx, ny][3] < 16:
                        continue
                    vis[ni] = 1
                    q.append((nx, ny))
            found.append((area, (minx, miny, maxx + 1, maxy + 1)))
    found.sort(reverse=True)
    return found


def bg_edge_count(im: Image.Image) -> int:
    w, h = im.size
    px = im.load()

    def dark(x, y):
        r, g, b, a = px[x, y]
        return a > 8 and r < BG and g < BG and b < BG

    n = 0
    if any(dark(x, 0) for x in range(0, w, 2)):
        n += 1
    if any(dark(x, h - 1) for x in range(0, w, 2)):
        n += 1
    if any(dark(0, y) for y in range(0, h, 2)):
        n += 1
    if any(dark(w - 1, y) for y in range(0, h, 2)):
        n += 1
    return n


def validate(path: Path, failures: list) -> None:
    im = Image.open(path)
    if im.mode != "RGBA":
        fail(path, f"mode {im.mode} (must be RGBA PNG)", failures)
        return
    w, h = im.size
    px = im.load()
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if px[x, y][3] > 8:
            fail(path, f"opaque corner {x},{y} a={px[x,y][3]}", failures)
            return
    edges = bg_edge_count(im)
    if edges >= 2:
        fail(path, f"connected opaque background detected, touches {edges} edges", failures)
        return
    bb = im.getbbox()
    if not bb:
        fail(path, "empty bounding box", failures)
        return
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    if bw < 40 or bh < 80:
        fail(path, f"bbox too small {bw}x{bh}", failures)
        return
    aspect = bh / max(bw, 1)
    # Wide stances / drives can be wider than they are tall.
    if aspect < 0.55 or aspect > 4.5:
        fail(path, f"implausible aspect {aspect:.2f}", failures)
        return
    comps = components(im)
    if not comps:
        fail(path, "no opaque component", failures)
        return
    main_area, main_bb = comps[0]
    leaked = []
    for area, cbb in comps[1:]:
        cx0, cy0, cx1, cy1 = cbb
        overlap_x = min(main_bb[2], cx1) - max(main_bb[0], cx0)
        # Shoes sit in the bottom band, aligned under the body, often with an
        # anti-aliased gap at the ankle. That is not a neighboring-cell leak.
        if overlap_x > 8 and cy1 > h * 0.72 and cy0 > main_bb[3] - 12:
            continue
        if cy0 > main_bb[3] + 48 and area > 120:
            leaked.append((area, cbb))
    if leaked:
        fail(path, f"disconnected component at {leaked[0][1]} area={leaked[0][0]}", failures)
        return
    print(f"PASS {path.relative_to(ROOT.parent.parent)}  {w}x{h} comps={len(comps)} hfill={(bb[3]-bb[1])/h:.2f}")


def main() -> int:
    failures: list[str] = []
    files = sorted(ROOT.rglob("*.png"))
    if not files:
        print("no basketball sprites")
        return 1
    for path in files:
        validate(path, failures)
    print(f"\n{len(files) - len(failures)} passed, {len(failures)} failed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
