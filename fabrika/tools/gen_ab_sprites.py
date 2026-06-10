#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ateş & Buz — özgün karakter sprite üretici.

Fireboy&Watergirl görsel dilinden bilinçli olarak ayrışan, tamamen geometrik
iki karakter çizer:
  • KOR  — baklava (rombus) formlu ateş ruhu: kömür çekirdek + kor çatlaklar
  • BUZ  — altıgen buz kristali: fasetli, yarı saydam görünüm

Sheet düzeni orijinalle birebir (oyun kodu değişmez):
  gövde  800×400  = 4 satır × 8 sütun (100×100 kare)
      satır1: idle(1) · satır2: koşu(8) · satır3: zıplama(1) · satır4: düşüş(1)
  bacak  200×51   = 2 satır × 8 sütun (25×25.5 kare)
      satır1: idle(1) · satır2: koşu(8)

Çıktı: fabrika/src/ates-buz/img/  (aynı dosya adlarıyla — iç yollar sabit kalır)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'src' / 'ates-buz' / 'img'
OUT.mkdir(parents=True, exist_ok=True)

CELL = 100


def rot(points, cx, cy, ang):
    out = []
    for x, y in points:
        dx, dy = x - cx, y - cy
        out.append((cx + dx * math.cos(ang) - dy * math.sin(ang),
                    cy + dx * math.sin(ang) + dy * math.cos(ang)))
    return out


# ---------------------------------------------------------------- KOR (ateş)
def draw_kor(d, ox, oy, pose='idle', phase=0.0):
    """Baklava formlu kor ruhu. pose: idle/run/up/down. phase 0..1 (koşu)."""
    cx = ox + 50
    bob = math.sin(phase * 2 * math.pi) * 3 if pose == 'run' else 0
    lean = 0.18 * math.sin(phase * 2 * math.pi) if pose == 'run' else 0.0
    if pose == 'run':
        lean += 0.22  # koşuda öne eğik
    w, h = 30, 38
    if pose == 'up':
        w, h = 26, 44
    elif pose == 'down':
        w, h = 36, 30
    cy = oy + 56 + bob

    # dış kor halo (turuncu)
    halo = [(cx, cy - h - 6), (cx + w + 6, cy), (cx, cy + h + 4), (cx - w - 6, cy)]
    d.polygon(rot(halo, cx, cy, lean), fill=(255, 159, 67, 110))
    # ana gövde (kırmızı-turuncu)
    body = [(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)]
    d.polygon(rot(body, cx, cy, lean), fill=(231, 76, 60, 255),
              outline=(120, 26, 16, 255), width=3)
    # iç kor (parlak sarı üçgen — koşuda nefes alır)
    glow = 0.55 + (0.25 * math.sin(phase * 4 * math.pi) if pose == 'run' else 0)
    iw, ih = w * glow, h * glow
    inner = [(cx, cy - ih), (cx + iw, cy), (cx, cy + ih), (cx - iw, cy)]
    d.polygon(rot(inner, cx, cy, lean), fill=(255, 209, 102, 235))
    # kömür çatlakları (köşeli kısa çizgiler)
    for (ax, ay, bx, by) in [(-14, -8, -4, -2), (6, 4, 16, 10), (-6, 12, 2, 20)]:
        p = rot([(cx + ax, cy + ay), (cx + bx, cy + by)], cx, cy, lean)
        d.line(p, fill=(80, 16, 10, 255), width=3)
    # kare gözler
    ey = cy - 8
    for ex in (cx - 12, cx + 4):
        p = rot([(ex, ey), (ex + 9, ey), (ex + 9, ey + 9), (ex, ey + 9)], cx, cy, lean)
        d.polygon(p, fill=(255, 255, 255, 255))
        p2 = rot([(ex + 3, ey + 3), (ex + 7, ey + 3), (ex + 7, ey + 8), (ex + 3, ey + 8)],
                 cx, cy, lean)
        d.polygon(p2, fill=(40, 8, 6, 255))
    # köşeli gülümseme
    sm = rot([(cx - 8, cy + 8), (cx - 3, cy + 12), (cx + 5, cy + 12), (cx + 10, cy + 8)],
             cx, cy, lean)
    d.line(sm, fill=(80, 16, 10, 255), width=3)


# ---------------------------------------------------------------- BUZ (su)
def draw_buz(d, ox, oy, pose='idle', phase=0.0):
    """Altıgen buz kristali ruhu."""
    cx = ox + 50
    bob = math.sin(phase * 2 * math.pi) * 3 if pose == 'run' else 0
    lean = 0.15 * math.sin(phase * 2 * math.pi) if pose == 'run' else 0.0
    if pose == 'run':
        lean += 0.20
    rx, ry = 30, 36
    if pose == 'up':
        rx, ry = 26, 42
    elif pose == 'down':
        rx, ry = 35, 29
    cy = oy + 56 + bob

    def hexpts(rx_, ry_):
        return [(cx + rx_ * math.cos(a), cy + ry_ * math.sin(a))
                for a in [math.pi / 2 + i * math.pi / 3 for i in range(6)]]

    # buğulu dış halo
    d.polygon(rot(hexpts(rx + 6, ry + 6), cx, cy, lean), fill=(155, 234, 255, 90))
    # ana kristal
    d.polygon(rot(hexpts(rx, ry), cx, cy, lean), fill=(107, 183, 255, 255),
              outline=(18, 90, 140, 255), width=3)
    # parlak üst-sol faset (koşuda kayar — dönme hissi)
    shift = (phase % 1.0) * 0.8 if pose == 'run' else 0.0
    fac = [(cx - rx * 0.7 + shift * 10, cy - ry * 0.55), (cx - rx * 0.1 + shift * 10, cy - ry * 0.85),
           (cx + rx * 0.25 + shift * 10, cy - ry * 0.25), (cx - rx * 0.35 + shift * 10, cy + ry * 0.05)]
    d.polygon(rot(fac, cx, cy, lean), fill=(217, 244, 255, 220))
    # kristal damarları
    for (ax, ay, bx, by) in [(-16, 6, -6, 14), (8, -14, 16, -4), (0, 10, 8, 20)]:
        p = rot([(cx + ax, cy + ay), (cx + bx, cy + by)], cx, cy, lean)
        d.line(p, fill=(30, 110, 165, 255), width=3)
    # kare gözler
    ey = cy - 8
    for ex in (cx - 12, cx + 4):
        p = rot([(ex, ey), (ex + 9, ey), (ex + 9, ey + 9), (ex, ey + 9)], cx, cy, lean)
        d.polygon(p, fill=(255, 255, 255, 255))
        p2 = rot([(ex + 3, ey + 3), (ex + 7, ey + 3), (ex + 7, ey + 8), (ex + 3, ey + 8)],
                 cx, cy, lean)
        d.polygon(p2, fill=(10, 40, 70, 255))
    # köşeli gülümseme
    sm = rot([(cx - 8, cy + 9), (cx - 3, cy + 13), (cx + 5, cy + 13), (cx + 10, cy + 9)],
             cx, cy, lean)
    d.line(sm, fill=(18, 90, 140, 255), width=3)


# ---------------------------------------------------------------- sheets
def body_sheet(draw_fn, path):
    img = Image.new('RGBA', (800, 400), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_fn(d, 0, 0, 'idle')                       # satır 1
    for i in range(8):                             # satır 2: koşu
        draw_fn(d, i * CELL, 100, 'run', i / 8)
    draw_fn(d, 0, 200, 'up')                       # satır 3
    draw_fn(d, 0, 300, 'down')                     # satır 4
    img.save(path, optimize=True)
    print(f'  {path.name}  {img.size}')


def legs_sheet(color, edge, path):
    img = Image.new('RGBA', (200, 51), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def feet(ox, oy, phase=None):
        # iki küçük kare ayak; koşuda zıt fazda ileri-geri
        if phase is None:
            offs = [(-8, 0), (3, 0)]
        else:
            s = math.sin(phase * 2 * math.pi) * 5
            offs = [(-8 + s, -abs(s) * 0.3), (3 - s, -abs(math.sin(phase * 2 * math.pi + math.pi)) * 1.5)]
        for dx, dy in offs:
            x, y = ox + 12 + dx, oy + 14 + dy
            d.rectangle([x, y, x + 7, y + 7], fill=color, outline=edge, width=1)

    feet(0, 0)                                     # satır 1: idle
    for i in range(8):                             # satır 2: koşu
        feet(i * 25, 26, i / 8)
    img.save(path, optimize=True)
    print(f'  {path.name}  {img.size}')


print('[gen_ab_sprites] üretiliyor →', OUT)
body_sheet(draw_kor, OUT / 'fireboy_sprite.png')
body_sheet(draw_buz, OUT / 'watergirl_sprite.png')
legs_sheet((180, 40, 24, 255), (90, 18, 10, 255), OUT / 'fireboy_legs_sprite.png')
legs_sheet((40, 120, 180, 255), (15, 70, 110, 255), OUT / 'watergirl_legs_sprite.png')
print('Bitti.')
