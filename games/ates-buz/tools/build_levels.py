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


def lay(*spans):
    """37 karakterlik IC satir (col 1..37) uretir. spans: (c_start, c_end[, ch])
    kapsayici, MUTLAK kolon (1..37). ch verilmezse '#'. col c -> index c-1.
    Boş çağrı (lay()) tüm satırı nokta yapar. make_level zaten R() ile sarar."""
    row = ["."] * (GW - 2)            # 37 hücre: col1..col37
    for sp in spans:
        a, b = sp[0], sp[1]
        ch = sp[2] if len(sp) > 2 else "#"
        for c in range(a, b + 1):
            if not (1 <= c <= GW - 2):
                raise ValueError(f"lay: kolon {c} aralik disi (1..{GW-2})")
            row[c - 1] = ch
    return "".join(row)


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


# ---- BOLUM 7: "Kopru Gecidi" — YATAY, 2-BUTON ROLE koprusu, kolay-orta ----
# Ikisi solda baslar (c1-13 zemin). Merkezde GENIS ASIT hendegi (c14-25 = 12 hucre,
# ZIPLANAMAZ, ikisini de oldurur) sagdaki kapilardan ayirir. Tek paylasilan rampa-kopru
# iki butona (sol c11 / sag c27) bagli (OR): biri butonda DURURKEN rampa asidi zemin
# seviyesinde kopruler. ASIMETRIK RELE: A sol butonu tutar -> B kopruden gecer -> B sag
# butonu tutar -> A gecer. Tek oyuncu yapamaz (hem basip hem gecemez); asit ziplanamaz
# -> dumduz gecmek IMKANSIZ. (Level 1/4 asimetrik buton-rampa idiomu.)
LEVEL7 = make_level([
    lay(),                # r1
    lay(),                # r2
    lay(),                # r3
    lay(),                # r4
    lay(),                # r5
    lay((34, 37)),        # r6  KAPI basamağı (en üst-sağ)
    lay((34, 37)),        # r7
    lay((34, 37)),        # r8
    lay((32, 37)),        # r9
    lay((32, 37)),        # r10
    lay((32, 37)),        # r11
    lay((30, 37)),        # r12
    lay((30, 37)),        # r13
    lay((30, 37)),        # r14
    lay((28, 37)),        # r15
    lay((28, 37)),        # r16
    lay((28, 37)),        # r17
    lay((26, 37)),        # r18
    lay((26, 37)),        # r19
    lay((26, 37)),        # r20
    lay((24, 37)),        # r21
    lay((24, 37)),        # r22
    lay((24, 37)),        # r23
    lay((22, 37)),        # r24  merdiven tabanı (kenar-tırmanışla çıkılır)
    lay((22, 37)),        # r25
    lay((22, 37)),        # r26
], lay((1, 5, "#"), (6, 17, "a"), (18, 37, "#")))     # r27 zemin: başlangıç c1-5 / GENİŞ ASİT c6-17 (röle) / sahanlık+merdiven c18-37

# ---- BOLUM 8: "Kule" — DIKEY zigzag tirmanis, orta ----
# Her basamak 3 hücre + GENIS (≥4 hücre) örtüşmeli zigzag -> kolay yan-sıçrayış,
# baş-çarpması yok. İlk basamak (r24) zeminden 3 hücre = doğrudan ulaşılır (mekanik
# gerekmez). Köşelerde ATEŞ/SU havuzu (tema + elmas); ana yol ortada güvenli.
# Aşamalı zorluk: uzun dikey tırmanış. Çözülebilirlik = her adım <=3 hücre.
LEVEL8 = make_level([
    lay(),                # r1
    lay(),                # r2
    lay(),                # r3
    lay(),                # r4
    lay(),                # r5
    lay(),                # r6
    lay(),                # r7
    lay(),                # r8
    lay((17, 22)),        # r9  PIRAMIT TEPESI — ORTAK kapı platformu (zirve)
    lay((17, 22)),        # r10
    lay((17, 22)),        # r11
    lay((15, 24)),        # r12
    lay((15, 24)),        # r13
    lay((15, 24)),        # r14
    lay((13, 26)),        # r15
    lay((13, 26)),        # r16
    lay((13, 26)),        # r17
    lay((11, 28)),        # r18
    lay((11, 28)),        # r19
    lay((11, 28)),        # r20
    lay((9, 30)),         # r21
    lay((9, 30)),         # r22
    lay((9, 30)),         # r23
    lay((7, 32)),         # r24
    lay((7, 32)),         # r25
    lay((7, 32)),         # r26
], lay((1, 37, "#")))     # r27 zemin — KATI PIRAMIT (ateş sol yüzü, su sağ yüzü tırmanır;
                          # her basamak altına kadar dolu -> "duvara yürü + zıpla" güvenilir)

# ---- BOLUM 9: "Tirmanis" — KATI MERDIVEN (sağa çıkış), zor ----
# Tek yönlü katı merdiven: sol-alttan sağ-üst kapıya. Her basamak 3 hücre + altına
# kadar dolu (tam temaslı yüzler) -> "duvara yürü + zıpla" güvenilir. İki oyuncu
# birlikte tırmanır. Aşamalı zorluk: L8'den daha uzun/dik. Tehlike yok.
LEVEL9 = make_level([
    lay(),                # r1
    lay(),                # r2
    lay(),                # r3
    lay(),                # r4
    lay(),                # r5
    lay((32, 37)),        # r6  en üst basamak (kapılar) sağ-üst
    lay((32, 37)),        # r7
    lay((32, 37)),        # r8
    lay((28, 37)),        # r9
    lay((28, 37)),        # r10
    lay((28, 37)),        # r11
    lay((24, 37)),        # r12
    lay((24, 37)),        # r13
    lay((24, 37)),        # r14
    lay((20, 37)),        # r15
    lay((20, 37)),        # r16
    lay((20, 37)),        # r17
    lay((16, 37)),        # r18
    lay((16, 37)),        # r19
    lay((16, 37)),        # r20
    lay((12, 37)),        # r21
    lay((12, 37)),        # r22
    lay((12, 37)),        # r23
    lay((8, 37)),         # r24
    lay((8, 37)),         # r25
    lay((8, 37)),         # r26
], lay((1, 37, "#")))     # r27 zemin (sol c1-7 başlangıç düzlüğü)

# ---- BOLUM 10: "Doruk" — KATI MERDIVEN (sola çıkış) + KALDIRAÇ-ASİT köprüsü, en zor ----
# Sağ-altta başlar; bir ASİT hendeği (c25-30) başlangıcı merdivenden ayırır. KALDIRAÇ
# çekilince rampa hendeği zemin seviyesinde kalıcı köprüler (L7 deseni, güvenilir).
# Sonra sola-çıkan katı merdivenle sol-üst kapılara. Kaldıraç ZORUNLU + uzun tırmanış.
LEVEL10 = make_level([
    lay(),                # r1
    lay(),                # r2
    lay(),                # r3
    lay(),                # r4
    lay(),                # r5
    lay((1, 6)),          # r6  en üst basamak (kapılar) sol-üst
    lay((1, 6)),          # r7
    lay((1, 6)),          # r8
    lay((1, 9)),          # r9
    lay((1, 9)),          # r10
    lay((1, 9)),          # r11
    lay((1, 12)),         # r12
    lay((1, 12)),         # r13
    lay((1, 12)),         # r14
    lay((1, 15)),         # r15
    lay((1, 15)),         # r16
    lay((1, 15)),         # r17
    lay((1, 18)),         # r18
    lay((1, 18)),         # r19
    lay((1, 18)),         # r20
    lay((1, 21)),         # r21
    lay((1, 21)),         # r22
    lay((1, 21)),         # r23
    lay((1, 24)),         # r24  taban (zeminden 3 hücre)
    lay((1, 24)),         # r25
    lay((1, 24)),         # r26
], lay((1, 24, "#"), (25, 29, "a"), (30, 37, "#")))   # r27 merdiven tabanı c1-24, ASİT c25-29, başlangıç c30-37

LEVELS = {7: LEVEL7, 8: LEVEL8, 9: LEVEL9, 10: LEVEL10}


# =====================================================================
#  NESNE TANIMLARI (player/diamond/door) — grid (col,row) ile
# =====================================================================
# players: feet_row = uzerinde durulan zemin satiri -> y = feet_row*36 - 72
# doors:   plat_row = kapinin uzerinde durdugu platform satiri -> y = plat_row*36 - 108
# diamonds: (col, row, "fire"|"water") -> piksel (col*36, row*36)
OBJECTS = {
    7: {
        # YOĞUN: tabanda 2-BUTON RÖLE köprüsü (geniş asit c6-17 üstü, asimetrik co-op) ->
        # ardından KATI-BASAMAK MERDIVEN (sağa-yukarı kenar-tırmanış) -> üst-sağ kapılar.
        # İki oyuncu solda başlar, röleyle asidi geçer, birlikte merdiveni tırmanır.
        "players": {"fire": (2, 27), "water": (3, 27)},
        "doors": {"fire": (34, 6), "water": (36, 6)},
        "diamonds": [
            (2, 26, "fire"), (23, 23, "fire"), (27, 17, "fire"), (31, 11, "fire"),
            (24, 20, "fire"), (28, 14, "fire"), (32, 8, "fire"), (35, 5, "fire"),
            (4, 26, "water"), (25, 23, "water"), (29, 17, "water"), (33, 11, "water"),
            (26, 20, "water"), (30, 14, "water"), (33, 8, "water"), (34, 5, "water"),
        ],
        # 2-BUTON RÖLE (OR): paylaşılan rampa-köprü iki butona bağlı (sol c3 / sağ c19).
        # Biri butonu tutar -> rampa asidi (c6-17) zemin seviyesinde köprüler -> diğeri geçer ->
        # karşı butonu tutar -> ilki geçer. Asit 12 hücre = zıplanamaz -> dümdüz İMKANSIZ.
        # KRİTİK: butonlar rampanın x-aralığından (c6-17) UZAK; yoksa butonu tutan oyuncu inen
        # rampayı engeller (c5'te bu olmuştu). Sol buton c3 (rampa solu), sağ c19 (sahanlık).
        "buttons": [
            {"buttons": [(1, 26), (19, 26)],
             "ramp": {"pos": (6, 23), "final": (6, 27), "finalY": 967, "boxCount": 12, "rotated": False,
                      "color": "#0a7d4a", "finalColor": "#10c878"}},
        ],
    },
    8: {
        "players": {"fire": (4, 27), "water": (34, 27)},     # zemin köşeleri (piramit tabanı dışı)
        "doors": {"fire": (18, 9), "water": (21, 9)},        # piramit zirvesi ORTAK platform (r9)
        "diamonds": [
            (8, 23, "fire"), (10, 20, "fire"), (12, 17, "fire"), (14, 14, "fire"), (16, 11, "fire"),
            (31, 23, "water"), (29, 20, "water"), (27, 17, "water"), (25, 14, "water"), (23, 11, "water"),
        ],
    },
    9: {
        "players": {"fire": (3, 27), "water": (5, 27)},      # sol-alt başlangıç düzlüğü
        "doors": {"fire": (33, 6), "water": (35, 6)},        # sağ-üst en üst basamak
        "diamonds": [
            (9, 23, "fire"), (13, 20, "fire"), (17, 17, "fire"), (21, 14, "fire"), (25, 11, "fire"),
            (10, 23, "water"), (14, 20, "water"), (18, 17, "water"), (22, 14, "water"), (29, 8, "water"),
        ],
    },
    10: {
        "players": {"fire": (33, 27), "water": (35, 27)},    # sağ-alt başlangıç (asit hendeğinin sağı)
        "doors": {"fire": (2, 6), "water": (5, 6)},          # sol-üst en üst basamak
        "diamonds": [
            (23, 23, "fire"), (20, 20, "fire"), (17, 17, "fire"), (14, 14, "fire"), (8, 8, "fire"),
            (22, 23, "water"), (19, 20, "water"), (16, 17, "water"), (11, 11, "water"), (5, 5, "water"),
        ],
        # KALDIRAC (c31, sola yaklaşılır) -> rampa ASİT hendeğini (c25-29) zemin
        # seviyesinde kalıcı köprüler (L7 deseni). İki oyuncu da geçer, sola tırmanır.
        "levers": [
            {"lever": (31, 26),
             "ramp": {"pos": (25, 23), "final": (25, 27), "boxCount": 5, "rotated": False,
                      "color": "#b8b800", "finalColor": "#ffff33"}},
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


def _gpx(cr):
    """grid (col,row) -> piksel {x,y} (sol-ust). Rampa/kup/top/kopru/buton/lever
    konumlari icin. Hizalama oyun-icinde ince ayar edilir."""
    return {"x": cr[0] * B, "y": cr[1] * B}


def _ramp_json(r):
    """OBJECTS ramp dict {pos:(c,r), final:(c,r), boxCount, rotated, color, finalColor}
    -> oyunun bekledigi ramp JSON'u. Opsiyonel posY/finalY = PIKSEL y override (rampa
    hitbox'i +5 offsetli oldugu icin zemine TAM HIZALAMAK gerektiginde: finalY=zemin_top-5)."""
    pos = _gpx(r["pos"])
    final = _gpx(r["final"])
    if "posY" in r:
        pos["y"] = r["posY"]
    if "finalY" in r:
        final["y"] = r["finalY"]
    return {
        "position": pos,
        "boxCount": r["boxCount"],
        "color": r.get("color", "#7a4fb0"),
        "finalPosition": final,
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
