#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ateş & Buz — yeni bölüm (7-10) build aracı.

ASCII tilemap (39x29) -> (1) collisionBlocks.js içindeki levelN int dizisi
                        -> (2) img/maps/levelN.png (mevcut kahverengi tema dokusuyla)

Kullanım:
    python build_levels.py test    # sadece test grid PNG'si üret (tools/_test_*.png), hiçbir şeyi değiştirme
    python build_levels.py build   # level7-10: collisionBlocks.js dizileri + PNG üret/yamala

NOT: Bu araç ÇALIŞMA ZAMANINDA yüklenmez; yalnızca geliştirme zamanı içindir
(hazirlik/tools/*.py geleneği). Deterministiktir: aynı girdi -> aynı çıktı.
Bölüm ASCII tanımları LEVELS sözlüğünde (dosyanın altında) tutulur.

ASCII LEJANTI (tek karakter = bir 36x36 hücre):
    .  EMPTY (boş, geçilir)                          0
    #  BLOCK (dolu duvar)                             1
    b  ◣  ucgen, dolu SOL-ALT  (zemin rampasi "\\")   3  TRIANGLE_RIGHT_UP
    d  ◢  ucgen, dolu SAG-ALT  (zemin rampasi "/")    2  TRIANGLE_LEFT_UP
    p  ◤  ucgen, dolu SOL-UST  (tavan)                5  TRIANGLE_RIGHT_DOWN
    q  ◥  ucgen, dolu SAG-UST  (tavan)                4  TRIANGLE_LEFT_DOWN
    f  FIRE_POND (lav: su kizi olur, ates gecer)      6
    g  FIRE_POND_TRIANGLE_LEFT                         7
    F  FIRE_POND_TRIANGLE_RIGHT                        8
    w  WATER_POND (su: ates olur, su gecer)           9
    v  WATER_POND_TRIANGLE_LEFT                        10
    W  WATER_POND_TRIANGLE_RIGHT                       11
    a  ACID_POND (asit: ikisi de olur)                12
    s  ACID_POND_TRIANGLE_LEFT                         13
    A  ACID_POND_TRIANGLE_RIGHT                        14

Pond ve EMPTY hücreleri PNG'de SEFFAF birakilir (havuzlar oyun calisirken
ponds.png'den cizilir; bosluk yerinde alttaki bg.png gorunur).
"""
import os
import sys
from PIL import Image, ImageDraw

# ---- yollar ----
TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(TOOLS_DIR)                  # games/ates-buz
IMG_MAPS = os.path.join(BASE, "img", "maps")
DATA_DIR = os.path.join(BASE, "data")
COLLISION_JS = os.path.join(BASE, "js", "collisionBlocks.js")

# ---- izgara ----
GW, GH, B = 39, 29, 36                             # grid genislik, yukseklik, blok px
PX_W, PX_H = GW * B, GH * B                         # 1404 x 1044

# ---- karakter -> tile int ----
CHAR_INT = {
    ".": 0, "#": 1,
    "b": 3, "d": 2, "p": 5, "q": 4,                # ucgenler
    "f": 6, "g": 7, "F": 8,                         # fire pond
    "w": 9, "v": 10, "W": 11,                       # water pond
    "a": 12, "s": 13, "A": 14,                      # acid pond
}
INT_CONST = {
    0: "EMPTY", 1: "BLOCK",
    2: "TRIANGLE_LEFT_UP", 3: "TRIANGLE_RIGHT_UP",
    4: "TRIANGLE_LEFT_DOWN", 5: "TRIANGLE_RIGHT_DOWN",
    6: "FIRE_POND", 7: "FIRE_POND_TRIANGLE_LEFT", 8: "FIRE_POND_TRIANGLE_RIGHT",
    9: "WATER_POND", 10: "WATER_POND_TRIANGLE_LEFT", 11: "WATER_POND_TRIANGLE_RIGHT",
    12: "ACID_POND", 13: "ACID_POND_TRIANGLE_LEFT", 14: "ACID_POND_TRIANGLE_RIGHT",
}


def triangle_points(code):
    """collisions.js draw() ile BIREBIR ayni kose noktalari (hucre orijini 0,0)."""
    if code == 3:    # RIGHT_UP  ◣  TL,BL,BR
        return [(0, 0), (0, B), (B, B)]
    if code == 2:    # LEFT_UP   ◢  TR,BL,BR
        return [(B, 0), (0, B), (B, B)]
    if code == 5:    # RIGHT_DOWN ◤ TL,TR,BL
        return [(0, 0), (B, 0), (0, B)]
    if code == 4:    # LEFT_DOWN  ◥ TL,TR,BR
        return [(0, 0), (B, 0), (B, B)]
    return None


def extract_tile(src_png="level2.png"):
    """Mevcut bir bolum PNG'sinden, 4 komsusu da dolu grid-hizali bir ic 36x36
    hucreyi kirpar. Izgara cizgileri hucre sinirinda oldugundan doseme mevcut
    temayi birebir yeniden uretir."""
    im = Image.open(os.path.join(IMG_MAPS, src_png)).convert("RGBA")
    px = im.load()

    def opaque_cell(c, r):
        ox, oy = c * B, r * B
        op = 0
        for yy in range(oy + 4, oy + B - 4, 6):
            for xx in range(ox + 4, ox + B - 4, 6):
                if px[xx, yy][3] > 240:
                    op += 1
        return op >= 16

    for r in range(2, GH - 2):
        for c in range(2, GW - 2):
            if (opaque_cell(c, r) and opaque_cell(c - 1, r) and opaque_cell(c + 1, r)
                    and opaque_cell(c, r - 1) and opaque_cell(c, r + 1)):
                tile = im.crop((c * B, r * B, c * B + B, r * B + B)).convert("RGBA")
                tpx = tile.load()
                for yy in range(B):
                    for xx in range(B):
                        rr, gg, bb, _ = tpx[xx, yy]
                        tpx[xx, yy] = (rr, gg, bb, 255)
                return tile, (c, r, src_png)
    raise RuntimeError("Uygun ic doku hucresi bulunamadi: " + src_png)


def parse_grid(grid):
    if len(grid) != GH:
        raise ValueError(f"Izgara {GH} satir olmali, {len(grid)} bulundu")
    ints = []
    for ri, row in enumerate(grid):
        if len(row) != GW:
            raise ValueError(f"Satir {ri}: {GW} karakter olmali, {len(row)} bulundu -> {row!r}")
        for ch in row:
            if ch not in CHAR_INT:
                raise ValueError(f"Bilinmeyen karakter {ch!r} (satir {ri})")
            ints.append(CHAR_INT[ch])
    return ints


def render_png(ints, tile):
    img = Image.new("RGBA", (PX_W, PX_H), (0, 0, 0, 0))
    for i, code in enumerate(ints):
        if code == 0 or code >= 6:                 # bos veya pond -> seffaf
            continue
        c, r = i % GW, i // GW
        px, py = c * B, r * B
        if code == 1:
            img.alpha_composite(tile, (px, py))
        else:
            mask = Image.new("L", (B, B), 0)
            ImageDraw.Draw(mask).polygon(triangle_points(code), fill=255)
            cell = Image.new("RGBA", (B, B), (0, 0, 0, 0))
            cell.paste(tile, (0, 0), mask)
            img.alpha_composite(cell, (px, py))
    return img


def js_array(name, ints):
    out = [f"const {name} = ["]
    for r in range(GH):
        row = ints[r * GW:(r + 1) * GW]
        out.append("    " + ", ".join(INT_CONST[v] for v in row) + ",")
    out.append("];")
    return "\n".join(out)


def patch_collision_js(arrays):
    with open(COLLISION_JS, "r", encoding="utf-8") as f:
        src = f.read()
    START = "// === GENERATED LEVELS 7-10 START (build_levels.py) ==="
    END = "// === GENERATED LEVELS 7-10 END ==="
    block = START + "\n" + "\n\n".join(a[1] for a in arrays) + "\n" + END + "\n"
    if START in src and END in src:
        pre = src[:src.index(START)]
        post = src[src.index(END) + len(END):].lstrip("\n")
        src = pre + post
    anchor = "const levels = {"
    idx = src.index(anchor)
    src = src[:idx] + block + "\n" + src[idx:]
    nums = [1, 2, 3, 4, 5, 6] + sorted(LEVELS)
    levels_obj = "const levels = {\n" + "".join(f"    {n}: level{n},\n" for n in nums) + "}"
    s2 = src.index("const levels = {")
    e2 = src.index("}", s2) + 1
    src = src[:s2] + levels_obj + src[e2:]
    with open(COLLISION_JS, "w", encoding="utf-8") as f:
        f.write(src)


# ---------- test grid ----------
TEST_GRID = [
    "#######################################",
    "#.....................................#",
    "#..####...........................###.#",
    "#.....................b#..............#",
    "#....................b##d.............#",
    "#...................b####d............#",
    "#..........#######............#.......#",
    "#..####q...........p#.................#",
    "#......##...........................#.#",
    "#...................................#.#",
    "#.######............................#.#",
    "#......................fff............#",
    "#......................###............#",
    "#.....www.............................#",
    "#.....###.............................#",
    "#.........aaaa........................#",
    "#.........####........................#",
    "#.....................................#",
    "#..#########..........####............#",
    "#.....................................#",
    "#............b#.......................#",
    "#...........b##.......................#",
    "#..........b###.......................#",
    "#.........b####.......................#",
    "#........#####........................#",
    "#.....................................#",
    "#.....................................#",
    "#.....................................#",
    "#######################################",
]


def cmd_test():
    tile, info = extract_tile()
    print("Doku kaynagi (col,row,dosya):", info)
    ints = parse_grid(TEST_GRID)
    img = render_png(ints, tile)
    img.save(os.path.join(TOOLS_DIR, "_test_level.png"))
    print("Yazildi: tools/_test_level.png")
    bg_path = os.path.join(IMG_MAPS, "bg.png")
    if os.path.exists(bg_path):
        bg = Image.open(bg_path).convert("RGBA")
        Image.alpha_composite(bg, img).save(os.path.join(TOOLS_DIR, "_test_preview.png"))
        print("Yazildi: tools/_test_preview.png")
    tile.save(os.path.join(TOOLS_DIR, "_tile.png"))


def cmd_preview():
    """LEVELS'i tools/_levelN_preview.png olarak (bg uzerine bindirilmis) render
    eder; HICBIR dosyayi yamalamaz. Tasarim dogrulama dongusu icin."""
    if not LEVELS:
        print("HATA: LEVELS bos.")
        sys.exit(1)
    tile, info = extract_tile()
    print("Doku kaynagi:", info)
    bg = Image.open(os.path.join(IMG_MAPS, "bg.png")).convert("RGBA")
    for n in sorted(LEVELS):
        ints = parse_grid(LEVELS[n])
        img = render_png(ints, tile)
        comp = Image.alpha_composite(bg, img)
        # bos/floor sayim ozeti
        comp.save(os.path.join(TOOLS_DIR, f"_level{n}_preview.png"))
        print(f"Onizleme: tools/_level{n}_preview.png")


def cmd_build():
    if not LEVELS:
        print("HATA: LEVELS bos. Once bolum gridlerini tanimla.")
        sys.exit(1)
    tile, info = extract_tile()
    print("Doku kaynagi:", info)
    arrays = []
    for n in sorted(LEVELS):
        ints = parse_grid(LEVELS[n])
        render_png(ints, tile).save(os.path.join(IMG_MAPS, f"level{n}.png"))
        print(f"PNG: img/maps/level{n}.png")
        arrays.append((n, js_array(f"level{n}", ints)))
    patch_collision_js(arrays)
    print("collisionBlocks.js guncellendi")


# =====================================================================
#  BOLUM TANIMLARI (7-10) — ASCII gridler
# =====================================================================
BORDER = "#" * GW


def R(interior):
    """Ic icerigi (sol-hizali, <=37) alir; 37'ye nokta ile tamamlar, yan
    duvarlari ekler -> tam 39 karakter satir. Tasmada hata verir."""
    if len(interior) > GW - 2:
        raise ValueError(f"Ic icerik {GW-2} karakteri asti ({len(interior)}): {interior!r}")
    return "#" + interior.ljust(GW - 2, ".") + "#"


# Zigzag bant rafleri — REACHABILITY GARANTILI:
# Sol bant c2-12, sag bant c26-36. Raflar her 3 satirda bir SA<->SB arasinda
# degisir (yatay ortusme c7 / c31) -> her raf bir alttakinden 3 hucre yukarida
# ve yatayda ortusur => 3 hucrelik ziplama (apex ~3.7) ile ulasilir.
SA = "." + "#" * 6 + "." * 23 + "#" * 6 + "."          # sol c2-7,  sag c31-36
SB = "." * 6 + "#" * 6 + "." * 13 + "#" * 6 + "." * 6   # sol c7-12, sag c26-31
SAf = "." + "f" * 6 + "." * 23 + "w" * 6 + "."          # SA ama sol FIRE / sag WATER havuz raf
SBf = "." * 6 + "f" * 6 + "." * 13 + "w" * 6 + "." * 6   # SB ama sol FIRE / sag WATER havuz raf
DOOR_SIDE = "." + "#" * 8 + "." * 19 + "#" * 8 + "."     # sol c2-9, sag c29-36 (yan kapi platformlari)
DOOR_MID = "." * 14 + "#" * 10 + "." * 13                # merkez c15-24 (ortak kapi platformu)
E = ""                                                   # bos satir


def make_level(rows27, floor):
    """27 ic satir (r1..r27) + zemin -> 29 satirlik tam grid. rows27 son eleman
    yerine floor kullanilir (r27)."""
    body = [R(x) for x in rows27[:26]] + [R(floor)]
    return [BORDER] + body + [BORDER]


# ---- BOLUM 7: "Gecit" — YATAY, kaldirac kopru bulmacasi, kolay ----
# Ikisi ortada baslar (c7-14 zemini). Merkezde ACID hendegi (c15-21) gecisi keser.
# ATES sola gidip FIRE-pond'u (c4-6) gecer, c1-3 cebindeki KALDIRACi ceker ->
# rampa hendegi zemin seviyesinde kopruler (kalici). Ikisi de saga gecip
# r24 sag-kenardaki kapilara ulasir. Su, fire-pond'u gecemez -> ates ZORUNLU.
# Sol taraf (kaldirac cebi c1-3 + fire-pond c4-6) USTU bos: su yukaridan havuza
# dusup gecidi atlayamasin. Raflar/kapi YALNIZ sagda (su+ates ortak, kopru sonrasi).
LEVEL7 = make_level([
    E, E, E, E, E, E, E, E,         # r1-8
    E, E, E, E, E, E, E, E, E,      # r9-17
    "." * 25 + "#" * 6,             # r18 sag raf c26-31 (su elmasi)
    E, E,                           # r19-20
    "." * 30 + "#" * 6,             # r21 sag raf c31-36 (su elmasi)
    E, E,                           # r22-23
    "." * 28 + "#" * 9,             # r24 KAPI sahanligi sag c29-37
    E, E,                           # r25-26
], "#" * 16 + "a" * 7 + "#" * 14)   # r27 sol zemin c1-16 (kaldirac+start), ACID c17-23, sag c24-37

# ---- BOLUM 8: "Kule" — DIKEY tirmanis + KUP basamak bulmacasi, orta ----
# Ikisi sagda baslar; KUP'u sola itip r22 sahanligi (zeminden 5 hucre, ziplanamaz)
# altina koyar, ustune cikip cikar -> tirmanis baslar. Kup OLMADAN cikis yok.
# r22'den merkeze dogru zigzag tirmanip ust-merkez ORTAK kapilara ulasir.
LEVEL8 = make_level([
    E, E, E, E, E, E,               # r1-6
    DOOR_MID,                       # r7  ORTAK kapi platformu (c15-24)
    E, E,                           # r8-9
    "." * 15 + "#" * 8,             # r10 sahanlik c16-23
    E, E,                           # r11-12
    "." * 11 + "#" * 8,             # r13 sahanlik c12-19
    E, E,                           # r14-15
    "." * 19 + "#" * 8,             # r16 sahanlik c20-27
    E, E,                           # r17-18
    "." * 10 + "#" * 8,             # r19 sahanlik c11-18
    E, E,                           # r20-21
    "." + "#" * 8,                  # r22 sahanlik c2-9  [KUP basamak gecidi]
    E, E, E, E,                     # r23-26
], "#" * 37)   # r27 tam zemin (kup itme alani)

# ---- BOLUM 9: "Kopru ve Top" — zor ----
# Koselerde baslar; zeminde FIRE (sol) ve WATER (sag) havuzlari ayirici.
# Bantlarda iki havuz rafi. ORTAK kapi ust-merkez. KOPRU + TOP+BUTON bonus.
LEVEL9 = make_level([
    E, E, E, E, E, E, E, E, E, E, E,  # r1-11
    DOOR_MID,                         # r12 ORTAK kapi platformu (c15-24)
    E, E,                             # r13-14
    "." * 11 + "#" * 8,               # r15 sahanlik c12-19
    E, E,                             # r16-17
    "." * 19 + "#" * 8,               # r18 sahanlik c20-27
    E, E,                             # r19-20
    "." * 13 + "#" * 8,               # r21 sahanlik c14-21
    E, E,                             # r22-23
    E, E,                             # r24-25 (BUTON-rampasi r24'te belirir - JSON)
    "." * 19 + "#",                   # r26 kup-durdurucu duvar c20 (kup butona c18 oturur)
], "#" * 4 + "w" * 4 + "#" * 20 + "f" * 4 + "#" * 5)   # r27 su c5-8 (kopru), fire c29-32 (kopru)

# ---- BOLUM 10: "Doruk" — en zor ----
# Koselerde baslar; zeminde UC havuz: FIRE(sol) ACID(merkez) WATER(sag).
# En yogun bant: cok sayida havuz rafi. ORTAK kapi en-ust merkez.
# Tum mekanikler bonus olarak (JSON): kaldirac, buton, kup.
LEVEL10 = make_level([
    E, E, E, E, E, E, E, E, E, E, E,  # r1-11
    DOOR_MID,                         # r12 ORTAK kapi platformu (c15-24)
    E, E,                             # r13-14
    "." * 15 + "#" * 8,               # r15 sahanlik c16-23
    E, E,                             # r16-17
    "." * 11 + "#" * 8,               # r18 sahanlik c12-19
    E, E,                             # r19-20
    "." * 17 + "#" * 8,               # r21 sahanlik c18-25
    E, E,                             # r22-23
    E, E,                             # r24-25 (KUP-BUTON rampasi r24'te belirir)
    "." * 31 + "#",                   # r26 kup-durdurucu duvar c32
], "#" * 11 + "a" * 6 + "w" * 4 + "#" * 16)   # r27 ACID c12-17 (kaldirac-kopru), WATER c18-21 (kopru), sag c22-37

LEVELS = {7: LEVEL7, 8: LEVEL8, 9: LEVEL9, 10: LEVEL10}


# =====================================================================
#  NESNE TANIMLARI (player/diamond/door) — grid (col,row) ile
# =====================================================================
# players: feet_row = uzerinde durulan zemin satiri -> y = feet_row*36 - 72
# doors:   plat_row = kapinin uzerinde durdugu platform satiri -> y = plat_row*36 - 108
# diamonds: (col, row, "fire"|"water") -> piksel (col*36, row*36)
OBJECTS = {
    7: {
        "players": {"fire": (10, 27), "water": (12, 27)},   # sol zeminde (c1-16)
        "doors": {"fire": (30, 24), "water": (34, 24)},      # r24 sag kapi sahanligi
        "diamonds": [
            (2, 26, "fire"), (7, 26, "fire"), (15, 26, "fire"), (26, 26, "fire"),
            (13, 26, "water"), (28, 17, "water"), (33, 20, "water"), (35, 23, "water"),
        ],
        # KALDIRAC (paylasimli, temiz zeminde c4): cekilince rampa ACID hendegini
        # (c17-23) zemin seviyesinde kalici kopruler -> ikisi de saga gecer.
        "levers": [
            {"lever": (4, 26),
             "ramp": {"pos": (17, 23), "final": (17, 27), "boxCount": 7, "rotated": False,
                      "color": "#b8b800", "finalColor": "#ffff33"}},
        ],
    },
    8: {
        "players": {"fire": (16, 27), "water": (18, 27)},   # sagda, kupun sagi
        "doors": {"fire": (18, 7), "water": (21, 7)},        # ust-merkez ortak platform
        "diamonds": [
            (4, 21, "fire"), (23, 15, "fire"), (19, 9, "fire"), (24, 26, "fire"), (2, 26, "fire"),
            (13, 18, "water"), (15, 12, "water"), (20, 9, "water"), (8, 26, "water"), (30, 26, "water"),
        ],
        # KUP: sola itilip r22 sahanligi (c2-9) altina, ustune cikilarak tirmanis baslar.
        "cubes": [(12, 25)],
    },
    9: {
        "players": {"fire": (2, 27), "water": (35, 27)},
        "doors": {"fire": (18, 12), "water": (21, 12)},
        "diamonds": [
            (2, 26, "fire"), (6, 26, "fire"), (15, 20, "fire"), (24, 17, "fire"), (13, 14, "fire"), (18, 11, "fire"),
            (35, 26, "water"), (31, 26, "water"), (20, 20, "water"), (22, 17, "water"), (15, 14, "water"), (21, 11, "water"),
        ],
        # KUP butona itilir -> rampa r24'te basamak olur (climb gecidi). KOPRU'ler havuz gecisleri.
        "buttons": [
            {"buttons": [(18, 26)],
             "ramp": {"pos": (13, 11), "final": (13, 24), "boxCount": 4, "rotated": False,
                      "color": "#0a7d4a", "finalColor": "#10c878"}},
        ],
        "cubes": [(14, 25)],
        "bridges": [(5, 26, 2), (29, 26, 2)],
    },
    10: {
        "players": {"fire": (8, 27), "water": (10, 27)},     # start c1-11 (kaldirac c3'un sagi)
        "doors": {"fire": (18, 12), "water": (21, 12)},       # ust-merkez ortak platform
        "diamonds": [
            (2, 26, "fire"), (8, 26, "fire"), (24, 26, "fire"), (19, 20, "fire"), (14, 17, "fire"), (17, 11, "fire"),
            (10, 26, "water"), (28, 26, "water"), (23, 20, "water"), (17, 17, "water"), (20, 14, "water"), (22, 11, "water"),
        ],
        # DORUK: (1) KALDIRAC (c3, sola yaklasilir) -> ACID koprusu c12-17.
        # (2) KOPRU su-havuzu (c18-21) gecisi. (3) KUP-BUTON -> climb basamagi r24.
        "levers": [
            {"lever": (3, 26),
             "ramp": {"pos": (12, 23), "final": (12, 27), "boxCount": 6, "rotated": False,
                      "color": "#b8b800", "finalColor": "#ffff33"}},
        ],
        "bridges": [(18, 26, 2)],
        "buttons": [
            {"buttons": [(30, 26)],
             "ramp": {"pos": (24, 11), "final": (24, 24), "boxCount": 4, "rotated": False,
                      "color": "#0a7d4a", "finalColor": "#10c878"}},
        ],
        "cubes": [(26, 25)],
    },
}


def _load_json(name):
    import json
    with open(os.path.join(DATA_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


def _save_json(name, data):
    import json
    with open(os.path.join(DATA_DIR, name), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.write("\n")


def _gpx(cr):
    """grid (col,row) -> piksel {x,y} (sol-ust). Rampa/kup/top/kopru/buton/lever
    konumlari icin. Hizalama oyun-icinde ince ayar edilir."""
    return {"x": cr[0] * B, "y": cr[1] * B}


def _ramp_json(r):
    """OBJECTS ramp dict {pos:(c,r), final:(c,r), boxCount, rotated, color, finalColor}
    -> oyunun bekledigi ramp JSON'u."""
    return {
        "position": _gpx(r["pos"]),
        "boxCount": r["boxCount"],
        "color": r.get("color", "#7a4fb0"),
        "finalPosition": _gpx(r["final"]),
        "finalColor": r.get("finalColor", "#b06fe0"),
        "rotated": r.get("rotated", False),
    }


def cmd_json():
    """8 veri dosyasina 7-10 anahtarlarini yazar (1-6 korunur). Idempotent:
    bir bolum bir mekanigi kullanmiyorsa o dosyadan 7-10 anahtari SILINIR."""
    players = _load_json("players.json")
    diamonds = _load_json("diamonds.json")
    doors = _load_json("doors.json")
    buttons = _load_json("buttons.json")
    levers = _load_json("levers.json")
    cubes = _load_json("cubes.json")
    bridges = _load_json("bridges.json")
    balls = _load_json("balls.json")

    for n, obj in OBJECTS.items():
        k = str(n)
        # --- players ---
        fx, fr = obj["players"]["fire"]
        wx, wr = obj["players"]["water"]
        players["fireboy"][k] = {"position": {"x": fx * B, "y": fr * B - 72}}
        players["watergirl"][k] = {"position": {"x": wx * B, "y": wr * B - 72}}
        # --- diamonds ---
        diamonds[k] = [{"position": {"x": c * B, "y": r * B}, "type": t}
                       for (c, r, t) in obj["diamonds"]]
        # --- doors ---
        dfx, dfr = obj["doors"]["fire"]
        dwx, dwr = obj["doors"]["water"]
        doors[k] = [
            {"position": {"x": dfx * B, "y": dfr * B - 108}, "element": "fire"},
            {"position": {"x": dwx * B, "y": dwr * B - 108}, "element": "water"},
        ]
        # --- mekanikler (opsiyonel; yoksa anahtari sil) ---
        if obj.get("buttons"):
            buttons[k] = [{"buttons": [{"position": _gpx(b)} for b in g["buttons"]],
                           "ramp": _ramp_json(g["ramp"])} for g in obj["buttons"]]
        else:
            buttons.pop(k, None)
        if obj.get("levers"):
            levers[k] = [{"lever": {"position": _gpx(g["lever"])}, "ramp": _ramp_json(g["ramp"])}
                         for g in obj["levers"]]
        else:
            levers.pop(k, None)
        if obj.get("cubes"):
            cubes[k] = [{"position": _gpx(c)} for c in obj["cubes"]]
        else:
            cubes.pop(k, None)
        if obj.get("bridges"):
            bridges[k] = [{"position": _gpx((c[0], c[1])), "chainsCount": c[2]}
                          for c in obj["bridges"]]
        else:
            bridges.pop(k, None)
        if obj.get("balls"):
            balls[k] = [{"position": _gpx(b)} for b in obj["balls"]]
        else:
            balls.pop(k, None)

    for name, data in [("players.json", players), ("diamonds.json", diamonds),
                       ("doors.json", doors), ("buttons.json", buttons),
                       ("levers.json", levers), ("cubes.json", cubes),
                       ("bridges.json", bridges), ("balls.json", balls)]:
        _save_json(name, data)
    print("JSON guncellendi (8 dosya, 7-10): players/diamonds/doors + buttons/levers/cubes/bridges/balls")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"
    if mode == "test":
        cmd_test()
    elif mode == "preview":
        cmd_preview()
    elif mode == "build":
        cmd_build()
    elif mode == "json":
        cmd_json()
    elif mode == "all":
        cmd_build()
        cmd_json()
    else:
        print("Kullanim: python build_levels.py [test|preview|build|json|all]")
