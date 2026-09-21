#!/usr/bin/env python3
"""Sanitize Benji action sprites for every outfit.

Pipeline:
  source cell or PNG
  → edge-connected background flood (never global black key)
  → keep principal connected character, drop leaked neighbor fragments
  → trim transparent excess
  → shared-scale pack onto 512×896 RGBA canvas, feet bottom-aligned
  → reject if background still touches two or more edges
"""
from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path("/workspace")
OUT_BB = ROOT / "public/game/benji/basketball"
SRC_BB = Path("/tmp/benji_bball")
SRC_STARTER = Path("/tmp/starter_bb")
CANVAS = (512, 896)
PAD = 18
BG_THRESH = 26

BBALL_SHEETS = {
    "tour_red": SRC_BB / "streetwear_character_action_sheet.png",
    "tour_white": SRC_BB / "four_pose_streetwear_character_sheet.png",
    "tour_black": SRC_BB / "streetwear_basketball_character_sheet.png",
    "jersey_black_fresh": SRC_BB / "sackreligious_basketball_character_sheet.png",
    "jersey_white_224": SRC_BB / "four_pose_basketball_character_sheet.png",
}
STARTER_FILES = {
    "ready": SRC_STARTER / "starter_tee_ready.png",
    "drive": SRC_STARTER / "starter_tee_drive.png",
    "shot-front": SRC_STARTER / "starter_tee_shot_front.png",
    "shot-back": SRC_STARTER / "starter_tee_shot_back.png",
}
CELLS = {
    "ready": (0.0, 0.0, 0.5, 0.5),
    "drive": (0.5, 0.0, 1.0, 0.5),
    "shot-front": (0.0, 0.5, 0.5, 1.0),
    "shot-back": (0.5, 0.5, 1.0, 1.0),
}


def flood_border(im: Image.Image, thresh: int = BG_THRESH) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    vis = bytearray(w * h)
    stack: list[tuple[int, int]] = []

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        if a < 10:
            return True
        return r < thresh and g < thresh and b < thresh

    def push(x: int, y: int) -> None:
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


def components(im: Image.Image, min_area: int = 40):
    w, h = im.size
    px = im.load()
    vis = bytearray(w * h)
    found = []
    for y0 in range(h):
        row = y0 * w
        for x0 in range(w):
            i0 = row + x0
            if vis[i0] or px[x0, y0][3] < 16:
                continue
            q = deque([(x0, y0)])
            vis[i0] = 1
            pts = 0
            minx = maxx = x0
            miny = maxy = y0
            while q:
                x, y = q.popleft()
                pts += 1
                if x < minx:
                    minx = x
                if x > maxx:
                    maxx = x
                if y < miny:
                    miny = y
                if y > maxy:
                    maxy = y
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    ni = ny * w + nx
                    if vis[ni] or px[nx, ny][3] < 16:
                        continue
                    vis[ni] = 1
                    q.append((nx, ny))
            if pts >= min_area:
                found.append({"area": pts, "bbox": (minx, miny, maxx + 1, maxy + 1)})
    found.sort(key=lambda c: c["area"], reverse=True)
    return found


def keep_principal(im: Image.Image, comps) -> tuple[Image.Image, list]:
    """Keep the largest character plus nearby fragments. Drop leaked neighbor cells."""
    if not comps:
        return im, []
    main = comps[0]
    mx0, my0, mx1, my1 = main["bbox"]
    mh = my1 - my0
    dropped = []
    for c in comps[1:]:
        x0, y0, x1, y1 = c["bbox"]
        cx = (x0 + x1) / 2
        cy = (y0 + y1) / 2
        far_below = y0 > my1 + max(8, mh * 0.04)
        near = (mx0 - 28) <= cx <= (mx1 + 28) and (my0 - 28) <= cy <= (my1 + 28)
        if far_below:
            dropped.append(c)
        elif near:
            continue
        elif c["area"] < max(120, main["area"] * 0.04):
            dropped.append(c)
    if not dropped:
        return im, dropped
    out = im.copy()
    px = out.load()
    src = im.load()
    w, h = out.size
    vis = bytearray(w * h)
    for c in dropped:
        x0, y0, x1, y1 = c["bbox"]
        seed = None
        for y in range(y0, y1):
            for x in range(x0, x1):
                if src[x, y][3] >= 16:
                    seed = (x, y)
                    break
            if seed:
                break
        if not seed:
            continue
        q = deque([seed])
        vis[seed[1] * w + seed[0]] = 1
        while q:
            x, y = q.popleft()
            px[x, y] = (0, 0, 0, 0)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    continue
                ni = ny * w + nx
                if vis[ni] or src[nx, ny][3] < 16:
                    continue
                vis[ni] = 1
                q.append((nx, ny))
    return out, dropped


def split_cell(sheet: Image.Image, frac, inset: int = 8) -> Image.Image:
    w, h = sheet.size
    x0 = int(frac[0] * w) + inset
    y0 = int(frac[1] * h) + inset
    x1 = int(frac[2] * w) - inset
    y1 = int(frac[3] * h) - inset
    return sheet.crop((x0, y0, x1, y1))


def corners_clear(im: Image.Image) -> bool:
    w, h = im.size
    px = im.load()
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if px[x, y][3] > 8:
            return False
    return True


def bg_touches_edges(im: Image.Image, thresh: int = BG_THRESH) -> int:
    """How many outer edges have an opaque near-black run."""
    w, h = im.size
    px = im.load()

    def dark(x, y):
        r, g, b, a = px[x, y]
        return a > 8 and r < thresh and g < thresh and b < thresh

    edges = 0
    if any(dark(x, 0) for x in range(w)):
        edges += 1
    if any(dark(x, h - 1) for x in range(w)):
        edges += 1
    if any(dark(0, y) for y in range(h)):
        edges += 1
    if any(dark(w - 1, y) for y in range(h)):
        edges += 1
    return edges


def clean_pose(im: Image.Image) -> tuple[Image.Image, dict]:
    flooded = flood_border(im)
    comps = components(flooded)
    cleaned, dropped = keep_principal(flooded, comps)
    info = {
        "components": [{"area": c["area"], "bbox": c["bbox"]} for c in comps[:8]],
        "dropped": [{"area": c["area"], "bbox": c["bbox"]} for c in dropped],
    }
    return cleaned, info


def place_pack(poses: dict[str, Image.Image]) -> dict[str, Image.Image]:
    """Same scale for every pose in the pack. Feet on a shared baseline. No independent fill."""
    crops = {}
    for name, im in poses.items():
        bb = im.getbbox()
        if not bb:
            crops[name] = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
            continue
        crops[name] = im.crop(bb)
    max_h = max(c.height for c in crops.values()) or 1
    max_w = max(c.width for c in crops.values()) or 1
    ready = crops.get("ready") or next(iter(crops.values()))
    cw, ch = CANVAS
    fit = min((ch - PAD * 2) / max_h, (cw - PAD * 2) / max_w)
    # Standing ready may use most of the canvas; never upscale a pack past fit.
    # Target ~90% canvas for the tallest pose so standing stays near canonical height.
    scale = min(fit, 1.0) if max_h >= (ch - PAD * 2) else fit
    placed = {}
    for name, cut in crops.items():
        nw = max(1, int(cut.width * scale))
        nh = max(1, int(cut.height * scale))
        resized = cut.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        x = (cw - nw) // 2
        y = ch - nh - PAD
        canvas.paste(resized, (x, y), resized)
        placed[name] = canvas
    return placed


def process_pack(outfit: str, poses: dict[str, Image.Image], report: list) -> None:
    cleaned = {}
    for name, im in poses.items():
        pic, info = clean_pose(im)
        cleaned[name] = pic
        report.append({"outfit": outfit, "pose": name, "stage": "clean", **info})
    placed = place_pack(cleaned)
    dest_dir = OUT_BB / outfit
    dest_dir.mkdir(parents=True, exist_ok=True)
    for name, im in placed.items():
        path = dest_dir / f"{name}.png"
        # Final flood in case resize introduced dark fringe at the canvas edge.
        im = flood_border(im, thresh=18)
        if not corners_clear(im):
            report.append({"outfit": outfit, "pose": name, "FAIL": "opaque corner"})
        edges = bg_touches_edges(im)
        if edges >= 2:
            report.append({"outfit": outfit, "pose": name, "FAIL": f"background touches {edges} edges"})
        im.save(path, "PNG", optimize=True)
        bb = im.getbbox()
        report.append({
            "outfit": outfit,
            "pose": name,
            "stage": "write",
            "path": str(path.relative_to(ROOT)),
            "size": list(im.size),
            "bbox": list(bb) if bb else None,
            "hfill": round((bb[3] - bb[1]) / CANVAS[1], 3) if bb else 0,
        })
        print(f"  {outfit}/{name}.png  hfill={(bb[3]-bb[1])/CANVAS[1]:.2f}  dropped_ok")


def main() -> int:
    report = []
    print("== starter_tee (individual approved poses) ==")
    starter = {name: Image.open(path) for name, path in STARTER_FILES.items() if path.exists()}
    if len(starter) == 4:
        process_pack("starter_tee", starter, report)
    else:
        print(" missing starter files", starter.keys())

    for outfit, sheet_path in BBALL_SHEETS.items():
        print(f"== {outfit} from {sheet_path.name} ==")
        if not sheet_path.exists():
            print("  SKIP missing sheet")
            continue
        sheet = Image.open(sheet_path).convert("RGBA")
        poses = {name: split_cell(sheet, frac) for name, frac in CELLS.items()}
        process_pack(outfit, poses, report)

    out_json = ROOT / "scripts" / "benji-action-process-report.json"
    out_json.write_text(json.dumps(report, indent=2))
    fails = [r for r in report if r.get("FAIL")]
    print(f"\n{len(fails)} FAIL(s). report -> {out_json}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
