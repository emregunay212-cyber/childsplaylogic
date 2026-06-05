#!/usr/bin/env python3
"""
Zindan Okcusu — kapusonlu ranger sprite sheet isleyici.

Gemini ham sheet'i (SIYAH zeminli, 4 satir, satir basina degisken kare) alir;
zemini koselerden floodfill ile siler, satir bantlarini + her bantta kareleri
otomatik bulur, her kareyi ayak-merkez/alt hizalayarak tek-tip seffaf bir izgaraya
paketler -> assets/archer.png.

Tespit (bu sheet): row0=idle(4) row1=walk(8) row2=draw(6) row3=shoot/aim(8)
Kullanim: python games/zindan-okcusu/tools/build_archer_sprite.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw

SRC   = r'C:\Users\emreg\Downloads\2a7d4598-40d9-4d75-8cab-a002e15818df.png'
HERE  = os.path.dirname(os.path.abspath(__file__))
OUT   = os.path.normpath(os.path.join(HERE, '..', 'assets', 'archer.png'))
THRESH    = 44      # floodfill: bu kadar siyaha yakin -> zemin (yuksek=temiz sil, cok yuksek=karakteri yer)
VBLACK    = 40      # saf-siyah esigi: kapali (yay-ici) siyah cepleri de seffaf yapar
SCALE     = 0.45    # cikti olcek
PAD       = 10      # hucre ici yatay/dikey bosluk (orijinal px)
FOOT_FRAC = 0.18    # ayak bandi (alt %)
BOTTOM_PAD = 3
SENT = (255, 0, 255)

im = Image.open(SRC).convert('RGB')
W, H = im.size

# 1) zemini floodfill ile sentinel'e cevir (tum koseler + kenar ortalari)
fl = im.copy()
for seed in [(0, 0), (W-1, 0), (0, H-1), (W-1, H-1), (W//2, 0), (W//2, H-1), (0, H//2), (W-1, H//2)]:
    ImageDraw.floodfill(fl, seed, SENT, thresh=THRESH)

arr  = np.asarray(im, dtype=np.uint8)            # orijinal renk
flar = np.asarray(fl, dtype=np.uint8)
bg   = np.all(flar == np.array(SENT, np.uint8), axis=2) | (arr.max(axis=2) < VBLACK)  # zemin + yay-ici kapali siyah cepler
fg   = ~bg

# 2) satir bantlari (fg yogunlugu olan y araliklari)
rowc = fg.sum(axis=1)
thr_r = max(4, W // 400)
bands, inb, st = [], False, 0
for y in range(H):
    if rowc[y] > thr_r and not inb:
        inb, st = True, y
    elif rowc[y] <= thr_r and inb:
        inb = False
        bands.append((st, y))
if inb:
    bands.append((st, H))
bands = [b for b in bands if b[1] - b[0] > 25]

# 3) bant basina kareler (x bosluklarindan)
def frames_in(y0, y1):
    colc = fg[y0:y1].sum(axis=0)
    fr, inf, cs = [], False, 0
    for x in range(W):
        if colc[x] > 1 and not inf:
            inf, cs = True, x
        elif colc[x] <= 1 and inf:
            inf = False
            fr.append((cs, x))
    if inf:
        fr.append((cs, W))
    return [f for f in fr if f[1] - f[0] > 16]

def extract(x0, x1, y0, y1):
    sub = fg[y0:y1, x0:x1]
    ys, xs = np.where(sub)
    if len(xs) == 0:
        return None
    minx, maxx = xs.min(), xs.max()
    miny, maxy = ys.min(), ys.max()
    cw, ch = maxx - minx + 1, maxy - miny + 1
    crop_rgb = arr[y0 + miny:y0 + maxy + 1, x0 + minx:x0 + maxx + 1]
    crop_a = (sub[miny:maxy + 1, minx:maxx + 1] * 255).astype(np.uint8)
    rgba = np.dstack([crop_rgb, crop_a])
    img = Image.fromarray(rgba, 'RGBA')
    foot0 = max(0, ch - max(2, int(ch * FOOT_FRAC)))
    fxs = np.where(sub[miny + foot0:maxy + 1, minx:maxx + 1].any(axis=0))[0]
    ax = float(fxs.mean()) if len(fxs) else cw / 2.0
    return img, ax

rows = []
for (y0, y1) in bands:
    fr = frames_in(y0, y1)
    cells = [extract(a, b, y0, y1) for (a, b) in fr]
    cells = [c for c in cells if c]
    rows.append(cells)
    print('row y=%4d-%4d frames=%d sizes=%s' % (y0, y1, len(cells), [c[0].size for c in cells]))

# Gemini watermark (beyaz elmas logosu) son shoot satirinin son karesinde yayin uzerine
# binmis; maskeleme yayi bozdugu icin o kareyi tamamen at.
if len(rows) >= 4 and len(rows[-1]) >= 8:
    rows[-1] = rows[-1][:-1]
    print('NOT: son shoot karesi (Gemini logosu) cikarildi -> shoot satiri %d kare' % len(rows[-1]))

# 4) tek-tip hucre (ayak yatay merkez, dikey alt hiza)
maxhalf = max(max(ax, c.width - ax) for r in rows for (c, ax) in r)
maxh    = max(c.height for r in rows for (c, ax) in r)
cw = int(round((2 * maxhalf + PAD * 2) * SCALE))
ch = int(round((maxh + PAD * 2) * SCALE))
ncol = max(len(r) for r in rows)
nrow = len(rows)

sheet = Image.new('RGBA', (cw * ncol, ch * nrow), (0, 0, 0, 0))
for ri, r in enumerate(rows):
    for ci, (c, ax) in enumerate(r):
        fw = max(1, int(round(c.width * SCALE)))
        fh = max(1, int(round(c.height * SCALE)))
        c2 = c.resize((fw, fh), Image.LANCZOS)
        dx = ci * cw + int(round(cw / 2 - ax * SCALE))
        dx = max(ci * cw, min(dx, (ci + 1) * cw - fw))
        dy = ri * ch + (ch - fh - int(round(BOTTOM_PAD * SCALE)))
        sheet.alpha_composite(c2, (dx, dy))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
sheet.save(OUT)
print('\nKAYDEDILDI:', OUT)
print('sheet=%s  hucre cw=%d ch=%d  ncol=%d nrow=%d' % (sheet.size, cw, ch, ncol, nrow))
print('satir kare sayilari =', [len(r) for r in rows])
print('JS: SPR cw=%d ch=%d (rows: 0=idle 1=walk 2=draw 3=shoot)' % (cw, ch))
