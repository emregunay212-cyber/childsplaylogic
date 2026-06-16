#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bilgi Yılanı — yem meyve sprite-sheet üretici.

Gemini'nin ürettiği magenta zeminli 8-meyve ızgarasını alır:
  • magenta zemini renk-mesafesiyle feather'lı şeffaf yapar
  • 8 meyveyi numpy bağ-bileşeni (downscale + etiket yayılımı; scipy YOK) ile bulur
  • küçük lekeleri (Gemini ✦ parlaması) alandan eler → en büyük 8 blob
  • okuma sırasına dizer (2 satır × 4 sütun), her meyveyi kareye ortalar/ölçekler
Çıktı: assets/fruits.png  (256×256 × 8 = 2048×256 yatay şerit)
Sıra: apple, banana, grapes, orange, watermelon, strawberry, lemon, cherries
"""
import numpy as np
from PIL import Image
from pathlib import Path

SRC  = Path(r'C:\Users\emreg\Downloads\Gemini_Generated_Image_hcruthcruthcruth.png')
HERE = Path(__file__).resolve().parent
OUT  = HERE.parent / 'assets' / 'fruits.png'
PREV = HERE / '_fruits_preview.png'
CELL, NCELL, PAD_FRAC = 256, 8, 0.10

im = Image.open(SRC).convert('RGB')
W, H = im.size
arr = np.asarray(im, dtype=np.float32)

# --- magenta zemin referansı (4 köşe ortalaması) ---
corners = [arr[0:40, 0:40], arr[0:40, -40:], arr[-40:, 0:40], arr[-40:, -40:]]
bg = np.mean(np.concatenate([c.reshape(-1, 3) for c in corners], 0), 0)
dist = np.sqrt(((arr - bg) ** 2).sum(2))
D, FEATH = 70.0, 28.0
alpha = np.clip((dist - D) / FEATH, 0, 1)          # 0=zemin .. 1=meyve (feather'lı)
fg = alpha > 0.5
print(f'bg rgb={bg.round(1)}  fg%={100*fg.mean():.1f}')

# --- bağ bileşenleri: 1/4 küçült + etiket yayılımı (scipy'siz) ---
SC = 4
hs, ws = H // SC, W // SC
small = fg[:hs * SC, :ws * SC].reshape(hs, SC, ws, SC).any(axis=(1, 3))
idx = np.arange(1, hs * ws + 1, dtype=np.int32).reshape(hs, ws)
lab = np.where(small, idx, 0)
it = 0
while True:
    m = lab.copy()
    m[1:, :]  = np.maximum(m[1:, :],  lab[:-1, :])
    m[:-1, :] = np.maximum(m[:-1, :], lab[1:, :])
    m[:, 1:]  = np.maximum(m[:, 1:],  lab[:, :-1])
    m[:, :-1] = np.maximum(m[:, :-1], lab[:, 1:])
    m = np.where(small, m, 0)
    it += 1
    if np.array_equal(m, lab):
        break
    lab = m
ids, counts = np.unique(lab[lab > 0], return_counts=True)
order = np.argsort(-counts)
keep = ids[order][:NCELL]
print(f'iters={it}  bilesen={len(ids)}  korunan alanlar(px²·{SC*SC})={sorted(counts[order][:NCELL].tolist(), reverse=True)}')
if len(ids) < NCELL:
    raise SystemExit(f'HATA: sadece {len(ids)} bilesen bulundu (8 bekleniyordu)')

# --- bbox'lar (küçük → tam çözünürlük) ---
boxes = []
for L in keep:
    ys, xs = np.where(lab == L)
    boxes.append([xs.min() * SC, ys.min() * SC, (xs.max() + 1) * SC, (ys.max() + 1) * SC])
# okuma sırası: 2 satır (y-merkez) sonra x-merkez
cys = [(b[1] + b[3]) / 2 for b in boxes]
mid = (min(cys) + max(cys)) / 2
boxes.sort(key=lambda b: (0 if (b[1] + b[3]) / 2 < mid else 1, (b[0] + b[2]) / 2))

# --- RGBA kaynak + her meyveyi kareye ortala ---
rgba = np.dstack([arr, alpha * 255]).astype(np.uint8)
src = Image.fromarray(rgba, 'RGBA')
sheet = Image.new('RGBA', (CELL * NCELL, CELL), (0, 0, 0, 0))
inner = int(CELL * (1 - 2 * PAD_FRAC))
names = ['apple', 'banana', 'grapes', 'orange', 'watermelon', 'strawberry', 'lemon', 'cherries']
for i, b in enumerate(boxes):
    crop = src.crop(tuple(b))
    a = np.asarray(crop)[:, :, 3]
    ys, xs = np.where(a > 20)
    crop = crop.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    w, h = crop.size
    s = inner / max(w, h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    sheet.alpha_composite(crop, (i * CELL + (CELL - nw) // 2, (CELL - nh) // 2))
    print(f'  {i} {names[i]:11s} bbox={b} -> {w}x{h}')

OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT)
sheet.resize((CELL * NCELL // 2, CELL // 2), Image.LANCZOS).save(PREV)
print('YAZILDI', OUT, sheet.size)
