#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ateş & Buz — özgün karakter sprite üretici (v2: yumuşak hatlar).

İki karakter, klasik silüetlerle ama tamamen kendi çizimimiz:
  • ALEV — dalgalı uçlu, yumuşak alev gövdesi (kırmızı→turuncu→sarı katmanlar)
  • DAMLA — klasik su damlası (yuvarlak gövde, yumuşak sivri tepe, parlak yansıma)

Keskin köşe yok: tüm kenarlar bezier örneklemesiyle, 4× süpersample + LANCZOS
küçültmeyle anti-aliased çizilir. Gözler/gülümseme yuvarlak.

Sheet düzeni orijinalle birebir (oyun kodu değişmez):
  gövde  800×400  = 4 satır × 8 sütun (100×100 kare)
      satır1: idle(1) · satır2: koşu(8) · satır3: zıplama(1) · satır4: düşüş(1)
  bacak  200×51   = 2 satır × 8 sütun (25×25.5 kare)

Çıktı: fabrika/src/ates-buz/img/  (aynı dosya adlarıyla)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'src' / 'ates-buz' / 'img'
OUT.mkdir(parents=True, exist_ok=True)

CELL = 100
SS = 4          # süpersample çarpanı
S = CELL * SS   # süpersample hücre boyutu


def bez(p0, p1, p2, p3, n=14):
    """Kübik bezier örnekle → nokta listesi."""
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def arcpts(cx, cy, rx, ry, a0, a1, n=18):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n),
             cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def lean_pts(pts, cx, cy, ang):
    out = []
    for x, y in pts:
        dx, dy = x - cx, y - cy
        out.append((cx + dx * math.cos(ang) - dy * math.sin(ang),
                    cy + dx * math.sin(ang) + dy * math.cos(ang)))
    return out


def face(d, cx, eye_y, scale=1.0, pupil_dx=0.0, mouth_dy=0.0,
         pupil=(40, 20, 12, 255), mouth=(120, 40, 18, 255)):
    """Yumuşak yüz: oval beyaz gözler + bebek + yay gülümseme. (süpersample koord.)"""
    ew, eh = 11 * SS * scale, 13 * SS * scale
    gap = 13 * SS * scale
    for sx in (-1, 1):
        ex = cx + sx * gap
        d.ellipse([ex - ew / 2, eye_y - eh / 2, ex + ew / 2, eye_y + eh / 2],
                  fill=(255, 255, 255, 255))
        pw = ew * 0.5
        px = ex + pupil_dx * SS
        d.ellipse([px - pw / 2, eye_y - pw / 2 + 1 * SS, px + pw / 2, eye_y + pw / 2 + 1 * SS],
                  fill=pupil)
        d.ellipse([px - pw / 6 + 1 * SS, eye_y - pw / 3, px + pw / 6 + 1 * SS, eye_y - pw / 9],
                  fill=(255, 255, 255, 230))
    my = eye_y + 15 * SS * scale + mouth_dy * SS
    mw = 12 * SS * scale
    d.arc([cx - mw, my - mw * 0.9, cx + mw, my + mw * 0.7],
          20, 160, fill=mouth, width=int(2.6 * SS))


# ---------------------------------------------------------------- ALEV
def draw_alev(d, pose='idle', phase=0.0):
    """Yumuşak alev: yuvarlak gövde + dalgalı tek tepe. Süpersample tuvale çizer."""
    cx = S / 2
    bob = math.sin(phase * 2 * math.pi) * 3 * SS if pose == 'run' else 0
    lean = (0.16 + 0.06 * math.sin(phase * 2 * math.pi)) if pose == 'run' else 0.0
    sway = (math.sin(phase * 2 * math.pi) * 7 * SS) if pose == 'run' else 0
    flick = (math.sin(phase * 4 * math.pi) * 3 * SS) if pose == 'run' else 0

    w = 33 * SS
    body_bot = 92 * SS + bob
    tip_y = 12 * SS + bob
    belly_y = 66 * SS + bob
    if pose == 'up':
        w, tip_y, body_bot = 29 * SS, 6 * SS, 94 * SS
    elif pose == 'down':
        w, tip_y, body_bot = 37 * SS, 24 * SS, 92 * SS

    def flame_outline(width, tip, bot, sw, fl):
        right = (cx + width, belly_y)
        left = (cx - width, belly_y)
        # SIRALI tek yön (kesişme yok): sağ kenar↑tepe → tepe↓sol kenar → alt yay sol→sağ
        up_r = bez(right,
                   (cx + width * 0.95, belly_y - 26 * SS),
                   (cx + width * 0.18 + sw + fl, tip + 26 * SS),
                   (cx + sw, tip))
        up_l = bez((cx + sw, tip),
                   (cx - width * 0.18 + sw - fl, tip + 26 * SS),
                   (cx - width * 0.95, belly_y - 26 * SS),
                   left)
        bottom = arcpts(cx, belly_y, width, bot - belly_y, math.pi, 0)  # sol→alt→sağ
        return up_r + up_l[1:] + bottom[1:]

    cx0, cy0 = cx, (tip_y + body_bot) / 2
    # katmanlar: dış→iç (yumuşak ateş degrade hissi)
    layers = [
        (1.00, (226, 88, 34, 255)),    # dış: koyu turuncu-kırmızı
        (0.80, (255, 140, 50, 255)),   # orta: turuncu
        (0.58, (255, 197, 92, 255)),   # iç: amber
    ]
    if pose == 'run':
        layers[2] = (0.58 + 0.05 * math.sin(phase * 4 * math.pi), (255, 205, 105, 255))
    for k, col in layers:
        pts = flame_outline(w * k, tip_y + (1 - k) * 26 * SS, body_bot - (1 - k) * 9 * SS,
                            sway * k, flick * k)
        d.polygon(lean_pts(pts, cx0, cy0, lean), fill=col)
    # yüz
    fy = 56 * SS + bob
    pdx = 2.5 if pose == 'run' else 0.0
    mdy = 2 if pose == 'down' else 0
    face(d, cx, fy, scale=1.0, pupil_dx=pdx, mouth_dy=mdy)
    # yanak ışıltıları
    for sx in (-1, 1):
        d.ellipse([cx + sx * 22 * SS - 4 * SS, fy + 10 * SS,
                   cx + sx * 22 * SS + 4 * SS, fy + 15 * SS],
                  fill=(255, 230, 150, 120))


# ---------------------------------------------------------------- DAMLA
def draw_damla(d, pose='idle', phase=0.0):
    """Klasik su damlası: yuvarlak gövde + yumuşak sivri tepe + parlak yansıma."""
    cx = S / 2
    bob = math.sin(phase * 2 * math.pi) * 3 * SS if pose == 'run' else 0
    lean = (0.14 + 0.05 * math.sin(phase * 2 * math.pi)) if pose == 'run' else 0.0
    sway = (math.sin(phase * 2 * math.pi) * 4 * SS) if pose == 'run' else 0

    w = 31 * SS
    tip_y = 14 * SS + bob
    belly_y = 60 * SS + bob
    body_bot = 92 * SS + bob
    if pose == 'up':
        w, tip_y, body_bot = 27 * SS, 7 * SS, 94 * SS
    elif pose == 'down':
        w, tip_y, body_bot = 35 * SS, 26 * SS, 92 * SS

    def drop_outline(width, tip, bot, sw):
        right = (cx + width, belly_y)
        left = (cx - width, belly_y)
        up_r = bez(right,
                   (cx + width * 0.96, belly_y - 30 * SS),
                   (cx + width * 0.22 + sw, tip + 20 * SS),
                   (cx + sw, tip))
        up_l = bez((cx + sw, tip),
                   (cx - width * 0.22 + sw, tip + 20 * SS),
                   (cx - width * 0.96, belly_y - 30 * SS),
                   left)
        bottom = arcpts(cx, belly_y, width, bot - belly_y, math.pi, 0)  # sol→alt→sağ
        return up_r + up_l[1:] + bottom[1:]

    cx0, cy0 = cx, (tip_y + body_bot) / 2
    # gövde: koyu kenar hissi için iki katman (yumuşak)
    d.polygon(lean_pts(drop_outline(w, tip_y, body_bot, sway), cx0, cy0, lean),
              fill=(52, 130, 202, 255))
    d.polygon(lean_pts(drop_outline(w * 0.93, tip_y + 4 * SS, body_bot - 3 * SS, sway * 0.95),
                       cx0, cy0, lean),
              fill=(86, 168, 232, 255))
    # sol-üst parlak yansıma (kavisli damlacık)
    hl = bez((cx - w * 0.52, belly_y - 6 * SS),
             (cx - w * 0.62, belly_y - 26 * SS),
             (cx - w * 0.28, tip_y + 18 * SS),
             (cx - w * 0.06 + sway * 0.6, tip_y + 8 * SS))
    hl2 = bez((cx - w * 0.06 + sway * 0.6, tip_y + 8 * SS),
              (cx - w * 0.16, tip_y + 24 * SS),
              (cx - w * 0.34, belly_y - 18 * SS),
              (cx - w * 0.30, belly_y - 4 * SS))
    d.polygon(lean_pts(hl + hl2[1:], cx0, cy0, lean), fill=(190, 226, 252, 220))
    # küçük parıltı noktası
    d.ellipse([cx + w * 0.30, belly_y - 14 * SS, cx + w * 0.30 + 7 * SS, belly_y - 7 * SS],
              fill=(225, 244, 255, 200))
    # yüz
    fy = 58 * SS + bob
    pdx = 2.5 if pose == 'run' else 0.0
    mdy = 2 if pose == 'down' else 0
    face(d, cx, fy, scale=1.0, pupil_dx=pdx, mouth_dy=mdy,
         pupil=(16, 48, 84, 255), mouth=(20, 70, 120, 255))


# ---------------------------------------------------------------- sheets
def cell_render(draw_fn, pose, phase=0.0):
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(img), pose, phase)
    return img.resize((CELL, CELL), Image.LANCZOS)


def body_sheet(draw_fn, path):
    sheet = Image.new('RGBA', (800, 400), (0, 0, 0, 0))
    sheet.paste(cell_render(draw_fn, 'idle'), (0, 0))
    for i in range(8):
        sheet.paste(cell_render(draw_fn, 'run', i / 8), (i * CELL, 100))
    sheet.paste(cell_render(draw_fn, 'up'), (0, 200))
    sheet.paste(cell_render(draw_fn, 'down'), (0, 300))
    sheet.save(path, optimize=True)
    print(f'  {path.name}  {sheet.size}')


def legs_sheet(color, edge, path):
    """Yuvarlak minik ayaklar (köşesiz)."""
    big = Image.new('RGBA', (200 * SS, 51 * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)

    def feet(ox, oy, phase=None):
        if phase is None:
            offs = [(-8, 0), (3, 0)]
        else:
            s = math.sin(phase * 2 * math.pi) * 5
            offs = [(-8 + s, -abs(s) * 0.35), (3 - s, -abs(s) * 0.2)]
        for dx, dy in offs:
            x = (ox + 12 + dx) * SS
            y = (oy + 14 + dy) * SS
            d.ellipse([x, y, x + 8.5 * SS, y + 7 * SS], fill=color,
                      outline=edge, width=SS)

    feet(0, 0)
    for i in range(8):
        feet(i * 25, 26, i / 8)
    img = big.resize((200, 51), Image.LANCZOS)
    img.save(path, optimize=True)
    print(f'  {path.name}  {img.size}')


print('[gen_ab_sprites v2] üretiliyor →', OUT)
body_sheet(draw_alev, OUT / 'fireboy_sprite.png')
body_sheet(draw_damla, OUT / 'watergirl_sprite.png')
legs_sheet((226, 88, 34, 255), (150, 48, 16, 255), OUT / 'fireboy_legs_sprite.png')
legs_sheet((52, 130, 202, 255), (24, 80, 140, 255), OUT / 'watergirl_legs_sprite.png')
print('Bitti.')
