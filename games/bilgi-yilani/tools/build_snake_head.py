#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bilgi Yılanı — AI yılan kafası (top-down) sprite çıkarıcı.

Gemini'nin magenta zeminli tek-kafa görselini alır:
  • magenta'yı feather'lı şeffaf yapar (renk-mesafesi)
  • en büyük bağ bileşenini (kafa) tutar; küçük ✦ parlamayı eler
  • tight kırpıp kareye ortalar -> assets/snake_head.png (yukarı bakar)
  • gövde rengini eşlemek için baskın yeşili (hex) raporlar
"""
import numpy as np
from PIL import Image
from pathlib import Path

SRC  = Path(r'C:\Users\emreg\Downloads\Gemini_Generated_Image_6kejnz6kejnz6kej.png')
HERE = Path(__file__).resolve().parent
OUT  = HERE.parent / 'assets' / 'snake_head.png'
PREV = HERE / '_snake_head_preview.png'
CELL, PAD_FRAC = 256, 0.05

im = Image.open(SRC).convert('RGB')
W, H = im.size
arr = np.asarray(im, dtype=np.float32)

corners = [arr[0:40, 0:40], arr[0:40, -40:], arr[-40:, 0:40], arr[-40:, -40:]]
bg = np.mean(np.concatenate([c.reshape(-1, 3) for c in corners], 0), 0)
dist = np.sqrt(((arr - bg) ** 2).sum(2))
D, FEATH = 70.0, 28.0
alpha = np.clip((dist - D) / FEATH, 0, 1)
fg = alpha > 0.5
print(f'bg rgb={bg.round(1)}  fg%={100*fg.mean():.1f}')

# en büyük bileşen (kafa): downscale + etiket yayılımı (scipy YOK)
SC = 4
hs, ws = H // SC, W // SC
small = fg[:hs * SC, :ws * SC].reshape(hs, SC, ws, SC).any(axis=(1, 3))
idx = np.arange(1, hs * ws + 1, dtype=np.int32).reshape(hs, ws)
lab = np.where(small, idx, 0)
while True:
    m = lab.copy()
    m[1:, :]  = np.maximum(m[1:, :],  lab[:-1, :])
    m[:-1, :] = np.maximum(m[:-1, :], lab[1:, :])
    m[:, 1:]  = np.maximum(m[:, 1:],  lab[:, :-1])
    m[:, :-1] = np.maximum(m[:, :-1], lab[:, 1:])
    m = np.where(small, m, 0)
    if np.array_equal(m, lab):
        break
    lab = m
ids, counts = np.unique(lab[lab > 0], return_counts=True)
L = ids[np.argmax(counts)]
print(f'bilesen={len(ids)}  en_buyuk_alan={counts.max()}  (digerleri elendi: {sorted(counts.tolist(), reverse=True)[1:]})')
ys, xs = np.where(lab == L)
b = [xs.min() * SC, ys.min() * SC, (xs.max() + 1) * SC, (ys.max() + 1) * SC]

rgba = np.dstack([arr, alpha * 255]).astype(np.uint8)
src = Image.fromarray(rgba, 'RGBA')
crop = src.crop(tuple(b))
a = np.asarray(crop)[:, :, 3]
yy, xx = np.where(a > 20)
crop = crop.crop((int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1))
w, h = crop.size
inner = int(CELL * (1 - 2 * PAD_FRAC))
s = inner / max(w, h)
nw, nh = max(1, round(w * s)), max(1, round(h * s))
crop = crop.resize((nw, nh), Image.LANCZOS)
cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
cell.alpha_composite(crop, ((CELL - nw) // 2, (CELL - nh) // 2))
OUT.parent.mkdir(parents=True, exist_ok=True)
cell.save(OUT)
cell.resize((CELL // 2, CELL // 2), Image.LANCZOS).save(PREV)

# baskın yeşil (gövde eşleme)
op = alpha > 0.8
gm = op & (arr[:, :, 1] > arr[:, :, 0] + 12) & (arr[:, :, 1] > arr[:, :, 2] + 12) & (arr[:, :, 1] > 90)
g = arr[gm].mean(0)
gd = (arr[gm] * 0.6).mean(0)  # kuyruk için ~%40 koyu
print(f'KAFA bbox={b} -> {w}x{h}')
print('GOVDE-yesil  bas~ #%02x%02x%02x   kuyruk~ #%02x%02x%02x' % (int(g[0]), int(g[1]), int(g[2]), int(gd[0]), int(gd[1]), int(gd[2])))
print('YAZILDI', OUT)
