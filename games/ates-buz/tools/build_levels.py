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


# ---- BOLUM 7: "Ates ve Buz Yollari" — nazik kooperatif giris ----
# Ikisi ORTA tabanda baslar. Sol yol FIRE havuzundan (ates gecer, su olur),
# sag yol WATER havuzundan (su gecer, ates olur) gecer -> ayrilmak ZORUNLU.
# Her biri kendi yan bandini tirmanip kendi kapisina ulasir (ates sol-ust,
# su sag-ust). Iki kapi da ayni anda acilinca biter. 8 elmas.
LEVEL7 = make_level([
    E, E, E, E, E,                  # r1-5
    DOOR_SIDE,                      # r6  ates kapisi sol (c2-9), su kapisi sag (c29-36)
    E, E,                           # r7-8
    SB,                             # r9
    E, E,                           # r10-11
    SA,                             # r12
    E, E,                           # r13-14
    SB,                             # r15
    E, E,                           # r16-17
    SA,                             # r18
    E, E,                           # r19-20
    SB,                             # r21
    E, E,                           # r22-23
    SA,                             # r24
    E, E,                           # r25-26
], "#" * 9 + "f" * 5 + "#" * 9 + "w" * 5 + "#" * 9)   # r27 fire c10-14, water c24-28

# ---- BOLUM 8: "Itme ve Kaldirac" — orta ----
# Koselerde baslar (ates sol, su sag); merkezde genis ACID ucurumu ayirir.
# Her biri kendi bandini tirmanip ORTAK kapi platformuna (ust-merkez) ulasir.
# r15'te havuz rafi tema katar. KUP ve KALDIRAC bonus elmaslari acar (JSON).
LEVEL8 = make_level([
    E, E, E, E, E,                  # r1-5
    DOOR_MID,                       # r6  ortak kapi platformu (c15-24)
    E, E,                           # r7-8
    SB,                             # r9  bant tepe
    E, E,                           # r10-11
    SA,                             # r12
    E, E,                           # r13-14
    SBf,                            # r15 havuz rafi (sol fire / sag water)
    E, E,                           # r16-17
    SA,                             # r18
    E, E,                           # r19-20
    SB,                             # r21
    E, E,                           # r22-23
    SA,                             # r24
    E, E,                           # r25-26
], "#" * 12 + "a" * 14 + "#" * 11)   # r27 merkez ACID ucurum c13-26

# ---- BOLUM 9: "Kopru ve Top" — zor ----
# Koselerde baslar; zeminde FIRE (sol) ve WATER (sag) havuzlari ayirici.
# Bantlarda iki havuz rafi. ORTAK kapi ust-merkez. KOPRU + TOP+BUTON bonus.
LEVEL9 = make_level([
    E, E, E, E, E,                  # r1-5
    DOOR_MID,                       # r6
    E, E,                           # r7-8
    SB,                             # r9
    E, E,                           # r10-11
    SAf,                            # r12 havuz rafi
    E, E,                           # r13-14
    SB,                             # r15
    E, E,                           # r16-17
    SA,                             # r18
    E, E,                           # r19-20
    SBf,                            # r21 havuz rafi
    E, E,                           # r22-23
    SA,                             # r24
    E, E,                           # r25-26
], "#" * 7 + "f" * 5 + "#" * 13 + "w" * 5 + "#" * 7)   # r27 fire c8-12, water c26-30

# ---- BOLUM 10: "Doruk" — en zor ----
# Koselerde baslar; zeminde UC havuz: FIRE(sol) ACID(merkez) WATER(sag).
# En yogun bant: cok sayida havuz rafi. ORTAK kapi en-ust merkez.
# Tum mekanikler bonus olarak (JSON): kaldirac, buton, kup.
LEVEL10 = make_level([
    E, E, E, E, E,                  # r1-5
    DOOR_MID,                       # r6
    E, E,                           # r7-8
    SBf,                            # r9  havuz rafi
    E, E,                           # r10-11
    SA,                             # r12
    E, E,                           # r13-14
    SBf,                            # r15 havuz rafi
    E, E,                           # r16-17
    SAf,                            # r18 havuz rafi
    E, E,                           # r19-20
    SB,                             # r21
    E, E,                           # r22-23
    SAf,                            # r24 havuz rafi
    E, E,                           # r25-26
], "#" * 6 + "f" * 5 + "#" * 5 + "a" * 5 + "#" * 5 + "w" * 5 + "#" * 6)   # r27 fire c7-11, acid c17-21, water c27-31

LEVELS = {7: LEVEL7, 8: LEVEL8, 9: LEVEL9, 10: LEVEL10}


# =====================================================================
#  NESNE TANIMLARI (player/diamond/door) — grid (col,row) ile
# =====================================================================
# players: feet_row = uzerinde durulan zemin satiri -> y = feet_row*36 - 72
# doors:   plat_row = kapinin uzerinde durdugu platform satiri -> y = plat_row*36 - 108
# diamonds: (col, row, "fire"|"water") -> piksel (col*36, row*36)
OBJECTS = {
    7: {
        "players": {"fire": (16, 27), "water": (22, 27)},
        "doors": {"fire": (4, 6), "water": (33, 6)},
        "diamonds": [
            (4, 23, "fire"), (9, 20, "fire"), (4, 17, "fire"), (9, 14, "fire"),
            (33, 23, "water"), (28, 20, "water"), (33, 17, "water"), (28, 14, "water"),
        ],
    },
    8: {
        "players": {"fire": (3, 27), "water": (34, 27)},
        "doors": {"fire": (17, 6), "water": (21, 6)},
        "diamonds": [
            (4, 23, "fire"), (9, 20, "fire"), (4, 17, "fire"), (9, 14, "fire"), (4, 11, "fire"),
            (33, 23, "water"), (28, 20, "water"), (33, 17, "water"), (28, 14, "water"), (33, 11, "water"),
        ],
    },
    9: {
        "players": {"fire": (3, 27), "water": (34, 27)},
        "doors": {"fire": (17, 6), "water": (21, 6)},
        "diamonds": [
            (4, 23, "fire"), (9, 20, "fire"), (4, 17, "fire"), (9, 14, "fire"), (4, 11, "fire"),
            (33, 23, "water"), (28, 20, "water"), (33, 17, "water"), (28, 14, "water"), (33, 11, "water"),
        ],
    },
    10: {
        "players": {"fire": (3, 27), "water": (34, 27)},
        "doors": {"fire": (17, 6), "water": (21, 6)},
        "diamonds": [
            (4, 23, "fire"), (9, 20, "fire"), (4, 17, "fire"), (9, 14, "fire"), (4, 11, "fire"), (9, 8, "fire"),
            (33, 23, "water"), (28, 20, "water"), (33, 17, "water"), (28, 14, "water"), (33, 11, "water"), (28, 8, "water"),
        ],
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


def cmd_json():
    """players/diamonds/doors.json dosyalarina 7-10 anahtarlarini yazar
    (1-6 korunur). Idempotent."""
    players = _load_json("players.json")
    diamonds = _load_json("diamonds.json")
    doors = _load_json("doors.json")

    for n, obj in OBJECTS.items():
        k = str(n)
        fx, fr = obj["players"]["fire"]
        wx, wr = obj["players"]["water"]
        players["fireboy"][k] = {"position": {"x": fx * B, "y": fr * B - 72}}
        players["watergirl"][k] = {"position": {"x": wx * B, "y": wr * B - 72}}

        diamonds[k] = [
            {"position": {"x": c * B, "y": r * B}, "type": t}
            for (c, r, t) in obj["diamonds"]
        ]

        dfx, dfr = obj["doors"]["fire"]
        dwx, dwr = obj["doors"]["water"]
        doors[k] = [
            {"position": {"x": dfx * B, "y": dfr * B - 108}, "element": "fire"},
            {"position": {"x": dwx * B, "y": dwr * B - 108}, "element": "water"},
        ]

    _save_json("players.json", players)
    _save_json("diamonds.json", diamonds)
    _save_json("doors.json", doors)
    print("JSON guncellendi: players, diamonds, doors (7-10)")


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
