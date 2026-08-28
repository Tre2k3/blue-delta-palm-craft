#!/usr/bin/env node
/**
 * Crop approved wrap sheets, Sackrow court, and K Blanco character map
 * into engine-ready textures. Run: node scripts/apply-brand-art.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
// Use Python/PIL — already verified in this sandbox.
const py = `
from PIL import Image, ImageFilter, ImageOps
from pathlib import Path
import os

ROOT = Path("/workspace")
ATT = ROOT / "attachments"
OUT_WRAP = ROOT / "public/game/wraps"
OUT_PEOPLE = ROOT / "public/game/people"
OUT_FACE = ROOT / "public/game/facades"
OUT_WRAP.mkdir(parents=True, exist_ok=True)
OUT_PEOPLE.mkdir(parents=True, exist_ok=True)
OUT_FACE.mkdir(parents=True, exist_ok=True)

def save(im, path, size=None):
    im = im.convert("RGBA")
    if size:
        im = im.resize(size, Image.Resampling.LANCZOS)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG", optimize=True)
    print("wrote", path, im.size)

def crop(im, box):
    x0,y0,x1,y1 = box
    x0=max(0,int(x0)); y0=max(0,int(y0))
    x1=min(im.width,int(x1)); y1=min(im.height,int(y1))
    return im.crop((x0,y0,x1,y1))

def flood_alpha(im, thresh=38):
    """Make near-edge studio black/grey transparent without eating dark clothes."""
    im = im.convert("RGBA")
    px = im.load()
    w,h = im.size
    # sample edge background
    samples = []
    for x in range(0,w,max(1,w//40)):
        samples.append(px[x,0][:3]); samples.append(px[x,h-1][:3])
    for y in range(0,h,max(1,h//40)):
        samples.append(px[0,y][:3]); samples.append(px[w-1,y][:3])
    br = sum(s[0] for s in samples)/len(samples)
    bg = sum(s[1] for s in samples)/len(samples)
    bb = sum(s[2] for s in samples)/len(samples)
    # flood from edges
    stack = []
    vis = bytearray(w*h)
    def push(x,y):
        i=y*w+x
        if vis[i]: return
        r,g,b,a = px[x,y]
        if a==0: return
        dist = abs(r-br)+abs(g-bg)+abs(b-bb)
        # gold frames / labels also go
        gold = r>140 and g>110 and b<90 and r>g
        dark = r<48 and g<48 and b<48
        if dist < thresh*3 or gold or (dark and (x<6 or y<6 or x>w-7 or y>h-7)):
            vis[i]=1
            stack.append((x,y))
    for x in range(w):
        push(x,0); push(x,h-1)
    for y in range(h):
        push(0,y); push(w-1,y)
    while stack:
        x,y = stack.pop()
        px[x,y] = (0,0,0,0)
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<w and 0<=ny<h:
                i=ny*w+nx
                if vis[i]: continue
                r,g,b,a = px[nx,ny]
                dist = abs(r-br)+abs(g-bg)+abs(b-bb)
                gold = r>150 and g>115 and b<100 and r>g and g>b
                if dist < thresh*3 or gold:
                    vis[i]=1
                    stack.append((nx,ny))
    return im

def tight(im, pad=8):
    bbox = im.getbbox()
    if not bbox: return im
    x0,y0,x1,y1 = bbox
    x0=max(0,x0-pad); y0=max(0,y0-pad)
    x1=min(im.width,x1+pad); y1=min(im.height,y1+pad)
    return im.crop((x0,y0,x1,y1))

# --- wraps ---
KLOTHING = {
    "left":  (18, 42, 990, 348),
    "right": (18, 372, 1000, 668),
    "front": (1010, 36, 1440, 340),
    "rear":  (1010, 400, 1440, 680),
    "hood":  (16, 688, 470, 1055),
    "roof":  (470, 688, 1050, 1055),
}
SACKROW = {
    "left":  (16, 18, 980, 345),
    "right": (16, 350, 960, 675),
    "hood":  (980, 16, 1440, 400),
    "roof":  (940, 395, 1440, 675),
    "front": (70, 678, 700, 930),
    "rear":  (760, 678, 1370, 930),
}

WRAPS = {
    "klothing-coupe": ("ChatGPT Image Aug 20, 2026, 10_19_44 PM (4).png", KLOTHING),
    "klothing-suv":   ("ChatGPT Image Aug 20, 2026, 10_19_44 PM (3).png", KLOTHING),
    "klothing-sedan": ("ChatGPT Image Aug 20, 2026, 10_19_43 PM (2).png", KLOTHING),
    "klothing-van":   ("ChatGPT Image Aug 20, 2026, 10_19_43 PM (1).png", KLOTHING),
    "sackrow-van":    ("ChatGPT Image Aug 20, 2026, 10_18_39 PM (3).png", SACKROW),
    "sackrow-suv":    ("ChatGPT Image Aug 20, 2026, 10_18_38 PM (2).png", SACKROW),
    "sackrow-sedan":  ("ChatGPT Image Aug 20, 2026, 10_18_38 PM (1).png", SACKROW),
}

for pack, (fname, boxes) in WRAPS.items():
    src = Image.open(ATT / fname).convert("RGB")
    dest = OUT_WRAP / pack
    dest.mkdir(parents=True, exist_ok=True)
    for name, box in boxes.items():
        panel = crop(src, box)
        # keep as RGB wrapped art (no alpha needed on car bodies)
        save(panel.convert("RGBA"), dest / f"{name}.png")
    # alias side from left for convenience
    save(Image.open(dest/"left.png"), dest/"side.png")

# --- court ---
court = Image.open(ATT / "ChatGPT Image Aug 20, 2026, 10_10_59 PM.png").convert("RGB")
# trim studio black, keep gold chain frame
court = crop(court, (36, 48, 1414, 1036))
court.save(OUT_FACE / "court-floor.jpg", "JPEG", quality=92, optimize=True)
print("wrote court-floor.jpg", court.size)

# --- K Blanco from character map ---
sheet = Image.open(ATT / "kblanco-character-ref.png").convert("RGBA")
# Top row turnaround on the left half of the sheet
views = {
    "front": (40, 120, 250, 400),
    "back":  (250, 120, 460, 400),
    "left":  (460, 120, 680, 400),
    "right": (680, 120, 900, 400),
}
# Bottom row poses
poses = {
    "idle":      (40, 430, 250, 860),
    "talking":   (250, 430, 470, 860),
    "welcoming": (470, 430, 690, 860),
    "hips":      (690, 430, 910, 860),
}
portrait_box = (920, 120, 1435, 840)

def extract_char(box, out, size=(420, 780)):
    cut = crop(sheet, box)
    cut = flood_alpha(cut, thresh=42)
    cut = tight(cut, pad=10)
    save(cut, out, size)

for name, box in views.items():
    extract_char(box, OUT_PEOPLE / f"k-blanco-{name}.png")
for name, box in poses.items():
    extract_char(box, OUT_PEOPLE / f"k-blanco-{name}.png", size=(400, 760))

# main in-game sprite = talking pose (gesture, reads as K Blanco)
extract_char(poses["talking"], OUT_PEOPLE / "k-blanco.png", size=(440, 820))

port = flood_alpha(crop(sheet, portrait_box), thresh=36)
port = tight(port, pad=6)
# keep a portrait crop for the dialogue box
save(port, ROOT / "public/game/k-blanco-portrait.png", (512, 640))

print("done")
`
const r = spawnSync("python3", ["-c", py], { stdio: "inherit" });
process.exit(r.status ?? 1);
