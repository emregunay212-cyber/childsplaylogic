# -*- coding: utf-8 -*-
"""
Baked seçenek dizisi çakışma tarayıcısı.
Shipped oyunlardaki (games/*/index.html, js/games/*.js) ve fabrika
bankalarındaki çoktan-seçmeli seçenek dizilerini tarar; iki seçeneğin
AYNI cevabı gösterdiği (normalize-eşit VEYA tam-kelime kapsama) durumları
bildirir. questionbank.js _sameAns mantığının Python aynası.

Kullanım:  python fabrika/tools/scan_option_collisions.py
'-' ve '/' AYRAÇ DEĞİL (işaret/kesir korunur), tırnak/noktalama silinir.
"""
import json, re, glob, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)

def norm(s):
    s = str(s).replace("İ", "i").replace("I", "ı").lower()
    s = re.sub(r"['’`\"().,;:!?]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def same(a, b):
    x, y = norm(a), norm(b)
    if not x or not y:
        return str(a) == str(b)  # noktalama/sembol cevaplar: ham eşitlik
    if x == y:
        return True
    s, l = (x, y) if len(x) <= len(y) else (y, x)
    return (" " + l + " ").find(" " + s + " ") >= 0

def collisions(opts, ci=None):
    out = []
    for i in range(len(opts)):
        for j in range(i + 1, len(opts)):
            if same(opts[i], opts[j]):
                out.append((opts[i], opts[j], ci is not None and ci in (i, j)))
    return out

STR = re.compile(r'"((?:[^"\\]|\\.)*)"' + r"|'((?:[^'\\]|\\.)*)'")
OPT = re.compile(r"(?:\bo|secenekler|options|opts)\s*:\s*(\[[^\]]*\])")

scanned = 0
flagged = 0

def scan_array(opts, ci, label):
    global scanned, flagged
    if len(opts) < 2:
        return
    scanned += 1
    cols = collisions(opts, ci)
    if cols:
        flagged += 1
        print("[!] " + label)
        for a, b, ic in cols:
            tag = "[DOGRUYU ICERIR]" if ic else "[iki celdirici]"
            print(f'      "{a}"  ==  "{b}"   {tag}')

# 1) shipped inline option arrays
for fn in sorted(glob.glob("games/*/index.html") + glob.glob("js/games/*.js") + ["index.html"]):
    if not os.path.exists(fn):
        continue
    txt = open(fn, encoding="utf-8").read()
    for m in OPT.finditer(txt):
        items = [a or b for a, b in STR.findall(m.group(1))]
        if not items:
            continue
        ln = txt[: m.start()].count("\n") + 1
        scan_array(items, None, f"{fn}:{ln}")

# 2) fabrika kaynak bankaları (oyuncuya ulaşmaz ama hijyen)
for fn in sorted(glob.glob("fabrika/soru-bankasi/*.json")):
    try:
        d = json.load(open(fn, encoding="utf-8"))
    except Exception as e:
        print("JSON?", fn, e); continue
    arr = d.get("sorular") if isinstance(d, dict) else d
    if arr is None and isinstance(d, dict):
        for v in d.values():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                arr = v; break
    for q in (arr or []):
        opts = q.get("secenekler") or q.get("o") or q.get("options")
        if opts:
            scan_array(opts, q.get("dogru_index", q.get("a")),
                       f"{os.path.basename(fn)} :: {str(q.get('soru', q.get('q', '')))[:55]}")

print(f"\nTARANAN dizi: {scanned}  |  CAKISMA: {flagged}")
