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


# ---- BOLUM 7: "Üç Kilit" — 3 KAT, 3 CO-OP KİLİDİ, orta-zor (DOĞRULANMIŞ) ----
# NOT: Daha yoğun "koridor-labirent" denemesi motorun KAFA-ÇARPMASI bug'ına takıldı
# (alçak tavana çarpan oyuncu kayma durumunda havuz+duvar İÇİNDEN dünyadan düşüyor).
# KURAL: zıplama yapılan her yerde ≥5 satır açık tavan bırak; alçak tavan altında
# zorunlu zıplama TASARLAMA. Yoğunluk = L5/L6 tarzı YÜKSEK tavanlı açık odalar.
# AKIŞ: üst kat (başlangıç) -> sağ şaft -> orta kat RÖLE köprüsü (gömülü, asitten
# yükselir) -> delik -> alt kat KALDIRAÇ köprüsü + lav şeridi + mesafe-kilitli BEKÇİ.
LEVEL7 = make_level([
    lay(),                                            # r1
    lay(),                                            # r2
    lay(),                                            # r3
    lay(),                                            # r4
    lay(),                                            # r5
    lay(),                                            # r6
    lay(),                                            # r7
    lay(),                                            # r8
    lay((1, 30)),                                     # r9  ÜST KAT bandı (başlangıç); c31-37 = iniş şaftı
    lay(),                                            # r10
    lay(),                                            # r11
    lay(),                                            # r12
    lay(),                                            # r13
    lay(),                                            # r14
    lay((1, 4), (8, 11), (23, 37)),                   # r15 ORTA KAT: sol cep / delik c5-7 / sol-yaka / ÇUKUR c12-22 / sağ-yaka
    lay((1, 4), (8, 11), (12, 22, "a"), (23, 37)),    # r16 ÇUKURDA ASİT (yürüme seviyesinin 1 altı)
    lay((12, 22), (30, 30)),                          # r17 asit leğeni tabanı + BEKÇİ DUVAR GÖVDESİ (c30)
    lay((30, 30)),                                    # r18 duvar gövdesi (sağ oda mühürlü — tek giriş bariyer)
    lay((30, 30)),                                    # r19
    lay((30, 30)),                                    # r20
    lay((30, 30)),                                    # r21
    lay((30, 30)),                                    # r22 (bariyer açılınca çubuk gövdeye çekilir)
    lay(),                                            # r23
    lay(),                                            # r24
    lay(),                                            # r25
    lay((1, 7), (19, 20), (24, 37)),                  # r26 ALT KAT bandı: cep / ÇUKUR c8-18 / ara / LAV c21-23 / kapılar
], lay((1, 7, "#"), (8, 18, "a"), (19, 20, "#"), (21, 23, "f"), (24, 37, "#")))
# r27 çukur içleri: ASİT moat2 c8-18 (kaldıraç köprüsü üstünden) / LAV c21-23 (ateş içinden,
#     su üstünden) — leğen tabanı = alt kenar duvarı (r28)

# ---- BOLUM 8: "Küp Atölyesi" — ASİT GÖLÜ ÜSTÜNDE BANT + ÇİFT-BUTON BEKÇİ + KÜP, zor ----
# Tüm aksiyon r18 YÜRÜME BANDINDA (c1-21), altı DEV ASİT GÖLÜ (c1-32). AKIŞ:
# (1) BEKÇİ RÖLESİ: bariyer (c12) bandı ikiye böler; butonlar c1 (başlangıç tarafı) ve
#     c20 (raf tarafı) — bariyere uzak => tek kişi imkansız. A c1'i tutar -> B geçer.
# (2) B raftaki KÜPÜ sağa iter: bandın ucundan (792) ASİT GÖLÜNE düşer, dibe oturur ve
#     DİPTEKİ BUTONA basar — oyuncu o butona ASLA ulaşamaz (asit öldürür) => köprü
#     (c24-32) KALICI yükselir. (3) B c20 butonunu tutar -> A bariyerden geçer.
# (4) İkisi bant ucundan köprüye/küpün üstüne atlar -> kapı platformuna (c33-37).
LEVEL8 = make_level([
    lay((30, 30)),                                    # r1  BÖLME DUVARI (c30, tavandan r23'e): bant ucundan kapı
    lay((30, 30)),                                    # r2  platformuna UZUN-ZIPLAMA hilesini keser; altında (864-936)
    lay((30, 30)),                                    # r3  72px geçit — köprüden YÜRÜYEREK geçilir
    lay((30, 30)),                                    # r4
    lay((30, 30)),                                    # r5
    lay((30, 30)),                                    # r6
    lay((30, 30)),                                    # r7
    lay((30, 30)),                                    # r8
    lay((30, 30)),                                    # r9
    lay((30, 30)),                                    # r10
    lay((30, 30)),                                    # r11
    lay((12, 12), (30, 30)),                          # r12 BEKÇİ duvar gövdesi (bariyer kalkınca içine girer)
    lay((12, 12), (30, 30)),                          # r13
    lay((12, 12), (30, 30)),                          # r14
    lay((30, 30)),                                    # r15 (bariyer çubuğu r15-17 — makine)
    lay((30, 30)),                                    # r16
    lay((14, 14), (30, 30)),                          # r17 raf DUDAĞI (c14): küp sola/bariyere itilip kaybolamaz
    lay((1, 21), (30, 30)),                           # r18 YÜRÜME BANDI (c1-21): başlangıç c1-11 | bariyer c12 | raf c13-21;
                                                      #     sağ ucu (792) gölün üstü => küp DOĞRUDAN dipteki butona düşer
    lay((30, 30)),                                    # r19
    lay((30, 30)),                                    # r20
    lay((30, 30)),                                    # r21
    lay((30, 30)),                                    # r22
    lay((30, 30)),                                    # r23 bölme duvarı alt ucu (864) — köprü (936) üstünde 72px geçit
    lay(),                                            # r24
    lay(),                                            # r25
    lay((33, 37)),                                    # r26 KAPI platformu (sağ-alt; köprüden yürünerek ulaşılır)
], lay((1, 32, "a"), (33, 37, "#")))
# r27 DEV ASİT GÖLÜ c1-32 (banttan düşen ölür — yumuşak-kilit YOK, yeniden başlar) +
#     kapı platformu tabanı c33-37. Küp gölden dibe (kenar duvarı üstü 1008) oturur.

# ---- BOLUM 9: "Tirmanis" — KATI MERDIVEN (sağa çıkış), zor ----
# Tek yönlü katı merdiven: sol-alttan sağ-üst kapıya. Her basamak 3 hücre + altına
# kadar dolu (tam temaslı yüzler) -> "duvara yürü + zıpla" güvenilir. İki oyuncu
# ---- BOLUM 9: "Ada Zinciri" — TÜNELLİ ÇİFT RÖLE (kıyı->ada->kapı kıyısı), zor ----
# Asit gölü ORTASINDA ADA; iki ardışık GÖMÜLÜ köprü, her biri 2-buton rölesi:
# (1) A kıyı butonunu (c5) tutar -> köprü-A asitten yükselir -> B adaya geçer ->
#     B ada-sol butonunu (c14) tutar -> A geçer. (2) Aynı röle ada-sağ (c20) /
#     kapı-kıyısı (c29) butonlarıyla köprü-B üstünden. ALÇAK TÜNEL TAVANI (r22,
#     c7-27): zıplama ~2.75 hücreye düşer => 6 hücrelik göller ASLA atlanamaz,
#     tavanın üstüne de çıkılamaz (144px > 135px apex). Adada LAV-dalış cebi
#     (c16-17, ateş elmasları), kapı kıyısında SU-dalış cebi (c30-31). Gömülü
#     köprüler bırakılınca batar => solo bas-koş İMKANSIZ (binen asitte ölür).
LEVEL9 = make_level([
    lay(),                                            # r1
    lay(),                                            # r2
    lay(),                                            # r3
    lay(),                                            # r4
    lay(),                                            # r5
    lay(),                                            # r6
    lay(),                                            # r7
    lay(),                                            # r8
    lay(),                                            # r9
    lay(),                                            # r10
    lay(),                                            # r11
    lay(),                                            # r12
    lay(),                                            # r13
    lay(),                                            # r14
    lay(),                                            # r15
    lay(),                                            # r16
    lay(),                                            # r17
    lay(),                                            # r18
    lay(),                                            # r19
    lay(),                                            # r20
    lay(),                                            # r21
    lay((7, 27)),                                     # r22 TÜNEL TAVANI (göller+ada üstü; üstüne zıplanamaz: 144>135)
    lay(),                                            # r23
    lay(),                                            # r24
    lay(),                                            # r25
    lay((1, 6), (13, 15), (18, 21), (28, 29), (32, 37)),  # r26 yürüme bantları: sol kıyı / ada-sol / ada-sağ
                                                      #     (lav cebi c16-17 arada) / kapı kıyısı (su cebi c30-31 arada)
], lay((1, 6, "#"), (7, 12, "a"), (13, 15, "#"), (16, 17, "f"), (18, 21, "#"), (22, 27, "a"), (28, 29, "#"), (30, 31, "w"), (32, 37, "#")))
# r27: ASİT göl-A c7-12 / ada (LAV cebi c16-17) / ASİT göl-B c22-27 / kapı kıyısı (SU cebi c30-31)

# ---- BOLUM 10: "Doruk" — BEKÇİ + KÜP + GÖL KÖPRÜSÜ + KALDIRAÇ FİNALİ, en zor ----
# 4 aşamalı finale (hepsi doğrulanmış parçalar): (1) BANT (c1-21, altı asit gölü):
# bekçi bariyeri c10, röle butonları c1/c18 — A tutar, B geçer (sonra tersi).
# (2) B KÜPÜ (c15) bant ucundan (792) göle iter -> dipteki butona oturur -> köprü-1
# (c24-26) KALICI yükselir. (3) İkisi banttan küp/köprüye atlayıp ORTA PLATFORMA
# (c27-30) geçer. (4) KALDIRAÇ (c29; sağından sola yürüyerek çevrilir) son asit
# boşluğunun (c31-33) köprüsünü KALICI yükseltir -> kapı platformu (c34-37).
# BÖLME KOLONU (c31, tavandan 828'e): bant ucundan kapılara uzun-zıplamayı keser;
# altındaki 108px geçit yürüyerek geçilir + son boşluğun zıplama-kapağı olur.
LEVEL10 = make_level([
    lay(),                                            # r1
    lay((31, 31)),                                    # r2  BÖLME KOLONU başı (uzun-zıplama hile-keseri)
    lay((31, 31)),                                    # r3
    lay((31, 31)),                                    # r4
    lay((31, 31)),                                    # r5
    lay((31, 31)),                                    # r6
    lay((31, 31)),                                    # r7
    lay((31, 31)),                                    # r8
    lay((31, 31)),                                    # r9
    lay((31, 31)),                                    # r10
    lay((31, 31)),                                    # r11
    lay((10, 10), (31, 31)),                          # r12 BEKÇİ duvar gövdesi (c10) + kolon
    lay((10, 10), (31, 31)),                          # r13
    lay((10, 10), (31, 31)),                          # r14
    lay((31, 31)),                                    # r15 (bariyer çubuğu r15-17 — makine)
    lay((31, 31)),                                    # r16
    lay((12, 12), (31, 31)),                          # r17 raf DUDAĞI (c12) + kolon
    lay((1, 21), (31, 31)),                           # r18 YÜRÜME BANDI (c1-21; ucu 792 = göl yuvasının üstü)
    lay((31, 31)),                                    # r19
    lay((31, 31)),                                    # r20
    lay((31, 31)),                                    # r21
    lay((31, 33)),                                    # r22 kolon başlığı: son boşluğun (c31-33) ZIPLAMA KAPAĞI
    lay(),                                            # r23
    lay(),                                            # r24
    lay(),                                            # r25
    lay((27, 30), (34, 37)),                          # r26 ORTA PLATFORM (c27-30; kaldıraç c29) + KAPI platformu (c34-37)
], lay((1, 26, "a"), (27, 30, "#"), (31, 33, "a"), (34, 37, "#")))
# r27: DEV ASİT GÖLÜ c1-26 (küp dibe oturur, buton c22) / orta taban / SON BOŞLUK asidi c31-33 / kapı tabanı

LEVELS = {7: LEVEL7, 8: LEVEL8, 9: LEVEL9, 10: LEVEL10}


# =====================================================================
#  NESNE TANIMLARI (player/diamond/door) — grid (col,row) ile
# =====================================================================
# players: feet_row = uzerinde durulan zemin satiri -> y = feet_row*36 - 72
# doors:   plat_row = kapinin uzerinde durdugu platform satiri -> y = plat_row*36 - 108
# diamonds: (col, row, "fire"|"water") -> piksel (col*36, row*36)
OBJECTS = {
    7: {
        # "Üç Kilit" (DOĞRULANMIŞ): üst kat -> şaft -> RÖLE -> delik -> KALDIRAÇ + BEKÇİ.
        "players": {"fire": (2, 9), "water": (4, 9)},      # üst kat, sol-üst
        "doors": {"fire": (31, 26), "water": (33, 26)},    # alt-sağ, bariyerin arkası
        "diamonds": [
            (6, 8, "fire"), (10, 8, "water"), (14, 8, "fire"), (18, 8, "water"), (22, 8, "fire"), (26, 8, "water"),
            (10, 14, "fire"), (24, 14, "water"), (2, 14, "fire"), (4, 14, "water"),
            (11, 25, "fire"), (15, 25, "water"), (20, 25, "fire"), (22, 26, "fire"),
            (26, 25, "water"), (6, 25, "water"),
        ],
        "buttons": [
            # RÖLE — moat1 (c12-22) köprüsü GÖMÜLÜ (asit içinde r17) bekler; basılınca 535'e
            # (yürüme 540) yükselir. Bırakılınca batar => solo bas-koş imkansız, sıkışma yok.
            {"buttons": [(25, 15), (9, 15)],
             "ramp": {"pos": (12, 17), "final": (12, 15), "finalY": 535, "boxCount": 11, "rotated": False,
                      "color": "#092DB8", "finalColor": "#0C3AEE"}},
            # KAPI BEKÇİSİ — dikey bariyer c30 (gövde r17-22 mühürler); butonlar c3 (27 hücre
            # uzak => tek kişi imkansız) ve c36 (röle dönüşü).
            {"buttons": [(3, 26), (36, 26)],
             "ramp": {"pos": (30, 23), "final": (30, 20), "boxCount": 3, "rotated": True,
                      "color": "#b00101", "finalColor": "#FE0000"}},
        ],
        # KALDIRAÇ — sol cep c1; moat2 köprüsü (c8-18) asitten yükselip KALICI durur.
        "levers": [
            {"lever": (1, 26),
             "ramp": {"pos": (8, 28), "final": (8, 26), "finalY": 931, "boxCount": 11, "rotated": False,
                      "color": "#B8B8B8", "finalColor": "#FEFEFE"}},
        ],
    },
    8: {
        # "Küp Atölyesi" v2: asit gölü üstünde bant; çift-buton bekçi rölesi + küp -> göl-dibi
        # butonu -> kalıcı köprü. Yerleşim mantığı LEVEL8 yorumunda.
        "players": {"fire": (2, 18), "water": (4, 18)},   # bant üstü, sol uç
        "doors": {"fire": (33, 26), "water": (35, 26)},   # sağ-alt kapı platformu
        "diamonds": [
            (3, 17, "fire"), (6, 17, "water"), (9, 17, "fire"),        # bant başlangıç bölgesi
            (12, 17, "water"),                                          # bariyer geçidi (açıkken alınır)
            (15, 17, "fire"), (18, 17, "water"), (21, 17, "water"),     # raf bölgesi
            (22, 22, "fire"), (23, 24, "water"),                        # iniş yolu (düşerken)
            (24, 25, "fire"), (26, 25, "water"), (29, 25, "fire"), (31, 25, "water"),  # köprü üstü
            (34, 25, "fire"), (36, 25, "water"),                        # kapı yanı
        ],
        "cubes": [(17, 15)],   # rafa düşer (648 üstüne oturur); dudağın (c14) 2 hücre sağında
        "buttons": [
            # KÖPRÜ — buton GÖLÜN DİBİNDE (c22, kenar-duvarı üstü 1008; oyuncu giremez, asit
            # öldürür) => yalnız KÜP basabilir. Köprü c24-32 gömülüden 931'e yükselir, KALICI.
            {"buttons": [(22, 28)],
             "ramp": {"pos": (24, 28), "final": (24, 26), "finalY": 931, "boxCount": 9, "rotated": False,
                      "color": "#092DB8", "finalColor": "#0C3AEE"}},
            # BEKÇİ RÖLESİ — bariyer c12; butonlar bant üstünde c1 (başlangıç yakası) ve c20
            # (raf yakası): ikisi de bariyere 8+ hücre => tek kişi bas-koş YAPAMAZ (kapanır).
            # A c1 tutar -> B geçer; küp işinden sonra B c20 tutar -> A geçer.
            {"buttons": [(1, 18), (20, 18)],
             "ramp": {"pos": (12, 15), "final": (12, 12), "boxCount": 3, "rotated": True,
                      "color": "#b00101", "finalColor": "#FE0000"}},
        ],
    },
    9: {
        # "Ada Zinciri": çift gömülü-köprü rölesi + tünel tavanı + element-dalış cepleri.
        # Spawn'lar butondan (c5: x180-254) SOLDA — su spawn'ı butona basmasın diye c3'te.
        "players": {"fire": (1, 26), "water": (3, 26)},
        "doors": {"fire": (33, 26), "water": (35, 26)},
        "diamonds": [
            (2, 25, "fire"), (4, 25, "water"),                          # sol kıyı
            (8, 25, "water"), (10, 25, "fire"), (12, 25, "water"),      # köprü-A üstü (tünelde)
            (14, 25, "fire"), (21, 25, "water"),                        # ada
            (16, 26, "fire"), (17, 26, "fire"),                         # LAV cebi içi (ateş dalar)
            (23, 25, "fire"), (25, 25, "water"), (27, 25, "fire"),      # köprü-B üstü
            (30, 26, "water"), (31, 26, "water"),                       # SU cebi içi (su dalar)
            (34, 25, "fire"), (36, 25, "water"),                        # kapı yanı
        ],
        "buttons": [
            # RÖLE-A — göl-A (c7-12) köprüsü; butonlar: sol kıyı c5 + ada-sol c14.
            {"buttons": [(5, 26), (14, 26)],
             "ramp": {"pos": (7, 28), "final": (7, 26), "finalY": 931, "boxCount": 6, "rotated": False,
                      "color": "#092DB8", "finalColor": "#0C3AEE"}},
            # RÖLE-B — göl-B (c22-27) köprüsü; butonlar: ada-sağ c20 + kapı kıyısı c29.
            {"buttons": [(20, 26), (29, 26)],
             "ramp": {"pos": (22, 28), "final": (22, 26), "finalY": 931, "boxCount": 6, "rotated": False,
                      "color": "#7a4fb0", "finalColor": "#b06fe0"}},
        ],
    },
    10: {
        # "Doruk" finali: bekçi rölesi + küp -> göl butonu -> köprü-1 + kaldıraç -> köprü-2.
        "players": {"fire": (2, 18), "water": (4, 18)},   # bant üstü, sol uç
        "doors": {"fire": (34, 26), "water": (36, 26)},   # kapı platformu (kolonun arkası)
        "diamonds": [
            (3, 17, "fire"), (6, 17, "water"), (9, 17, "water"),       # bant başlangıç
            (13, 17, "fire"), (16, 17, "water"), (19, 17, "fire"),     # bant raf bölgesi
            (22, 23, "water"), (23, 25, "fire"),                       # iniş/yuva yolu
            (25, 25, "water"), (28, 25, "fire"),                       # köprü-1 + orta platform
            (32, 25, "water"), (33, 25, "fire"),                       # son boşluk (kolon altı)
            (35, 25, "fire"), (37, 25, "water"),                       # kapı yanı
        ],
        "cubes": [(15, 15)],   # banda düşer; dudak c12 solunu kapar, sağdan göle itilir
        "buttons": [
            # KÖPRÜ-1 — buton GÖLÜN DİBİNDE (c22): yalnız küp basabilir; köprü c24-26 KALICI.
            {"buttons": [(22, 28)],
             "ramp": {"pos": (24, 28), "final": (24, 26), "finalY": 931, "boxCount": 3, "rotated": False,
                      "color": "#092DB8", "finalColor": "#0C3AEE"}},
            # BEKÇİ RÖLESİ — bariyer c10; butonlar bant üstü c1 ve c18 (ikisi de uzak =>
            # tek kişi bas-koş yapamaz). A c1 tutar -> B geçer; B c18 tutar -> A geçer.
            {"buttons": [(1, 18), (18, 18)],
             "ramp": {"pos": (10, 15), "final": (10, 12), "boxCount": 3, "rotated": True,
                      "color": "#b00101", "finalColor": "#FE0000"}},
        ],
        # KALDIRAÇ — orta platform c29 (üstünden hoplanıp SAĞINDAN sola yürüyerek çevrilir);
        # son boşluğun (c31-33) köprüsünü KALICI yükseltir. BEYAZ.
        "levers": [
            {"lever": (29, 26),
             "ramp": {"pos": (31, 28), "final": (31, 26), "finalY": 931, "boxCount": 3, "rotated": False,
                      "color": "#B8B8B8", "finalColor": "#FEFEFE"}},
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
    """grid (col,row) -> piksel {x,y} (sol-ust). Rampa/kup/top/kopru
    konumlari icin. Hizalama oyun-icinde ince ayar edilir."""
    return {"x": cr[0] * B, "y": cr[1] * B}


def _btn_px(cr):
    """Buton (col, ZEMIN_satiri) -> piksel. Buton zeminin USTUNE oturur:
    y = zemin_top - 18 (hitbox yuksekligi). Orijinal L5 ile ayni (990 = 1008-18).
    Boylece buton havada durmaz; basilinca 19px zemine gomulur."""
    return {"x": cr[0] * B, "y": cr[1] * B - 18}


def _lever_px(cr):
    """Kaldirac (col, ZEMIN_satiri) -> piksel. Taban (position+45) zemine oturur:
    y = zemin_top - 46 (orijinal L5: 962 = 1008-46; cubuk hitbox'i +2..+44 oyuncuyla kesisir)."""
    return {"x": cr[0] * B, "y": cr[1] * B - 46}


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
        # y = ayak_satiri*36 - 97: ayaklar (position+37+60) TAM zemin ustunde dogar.
        # (-72 oyuncuyu 25px zemine GOMUYORDU -> kafa-carpismasi dali yana kaydirip
        #  cukura dusurebiliyor + birikien hizla kenar duvarini tunelliyordu.)
        fx, fr = obj["players"]["fire"]
        wx, wr = obj["players"]["water"]
        players["fireboy"][k] = {"position": {"x": fx * B, "y": fr * B - 97}}
        players["watergirl"][k] = {"position": {"x": wx * B, "y": wr * B - 97}}
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
            buttons[k] = [{"buttons": [{"position": _btn_px(b)} for b in g["buttons"]],
                           "ramp": _ramp_json(g["ramp"])} for g in obj["buttons"]]
        else:
            buttons.pop(k, None)
        if obj.get("levers"):
            levers[k] = [{"lever": {"position": _lever_px(g["lever"])}, "ramp": _ramp_json(g["ramp"])}
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
