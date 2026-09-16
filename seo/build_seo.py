#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SEO landing sayfa jeneratoru — bilnetoyun.com
Veri: data/games.json (GAMES; seo/games_data.py yukler) + seo/games_data.py (STATIC_PAGES). Bu dosya yalniz sablon + uretim.

Uretir:
  oyunlar/<slug>/index.html   her kayit (active=False -> noindex + "Cok yakinda", CTA yok)
  oyunlar/index.html          hub (yalniz aktif oyunlar; CollectionPage + ItemList)
  <slug>/index.html           STATIC_PAGES (gizlilik/hakkinda/iletisim; WebPage JSON-LD, CTA yok)
  sitemap.xml                 ana sayfa + hub + STATIC_PAGES + aktif oyunlar (lastmod git'ten)
  llms.txt                    aktif oyunlar, Turkce karakterler korunur

Calistir:  python seo/build_seo.py
Kurallar:  uretilen dosyalar ELLE DUZENLENMEZ; degisiklik veriye/sablona yapilir.
  * title <= 60, description <= 150 karakter (asim varsa uretim durur, sayfa basilir).
  * lastmod/dateModified: uretilen icerik HEAD'deki surumle ayniysa dosyanin son commit
    tarihi, degilse bugun. git yoksa / dosya izlenmiyorsa bugun.
"""
import datetime
import html
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from games_data import GAMES, STATIC_PAGES, SCHOOL_NAME, SCHOOL_URL, SCHOOL_SOCIAL  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://bilnetoyun.com"
ORG_ID = f"{SITE}/#org"
# TODO(A5-og): oyun basina 1200x630 PNG uretilince oyunun kendi gorseli olacak (04-seo.md P2).
OG_IMAGE = f"{SITE}/og-image.png"
OG_W, OG_H = 1200, 630
AGE_SPAN = "4-12"          # sitenin genel yas konumlandirmasi (llms.txt / hub metni)
TITLE_MAX = 60
DESC_MAX = 150
TODAY = datetime.date.today().isoformat()

# Yazi tipleri self-host (A9a): /css/fonts.css (Fredoka + Nunito, assets/fonts/*.woff2). Google Fonts istegi yok.
FONTS_HREF = "/css/fonts.css"

# egweblab marka imzasi — global kural: her sayfanin en altinda, metin ve baglanti degismez.
IMZA_HTML = """<div class="imza-band">
  <a class="imza" href="https://egweblab.com.tr" target="_blank" rel="noopener">
    <img class="imza__mark" src="/assets/logo-96.png" width="20" height="20" alt="" decoding="async">
    <span class="imza__ust">Tasarım ve yazılım</span>
    <span class="imza__ad">egweblab<span class="imza__tld">.com.tr</span></span>
  </a>
</div>"""


# ---------------------------------------------------------------- yardimcilar
def esc(s):
    return html.escape(s, quote=True)


def is_active(g):
    return g.get("active", True)


def page_url(g):
    return f"{SITE}/oyunlar/{g['slug']}/"


def build_title(g):
    """<= TITLE_MAX: once '– Ücretsiz {cat} Oyunu' parcasi, sonra 'Ücretsiz Oyun' dusurulur."""
    name = g["name"]
    if not is_active(g):
        return f"{name} – Çok Yakında | Bilnet Oyun"
    candidates = (
        f"{name} Oyna – Ücretsiz {g['cat']} Oyunu | Bilnet Oyun",
        f"{name} Oyna – Ücretsiz Oyun | Bilnet Oyun",
        f"{name} Oyna | Bilnet Oyun",
    )
    return next((t for t in candidates if len(t) <= TITLE_MAX), candidates[-1])


def truncate_words(text, limit):
    """Kelime sinirinda kes, '…' ekle; sonuc <= limit."""
    if len(text) <= limit:
        return text
    cut = text[:limit - 1].rsplit(" ", 1)[0].rstrip(" ,;:—–-")
    return cut + "…"


def build_description(g):
    suffix = f" {age_label(g)} yaş için ücretsiz, üyeliksiz."
    return truncate_words(g["short"], DESC_MAX - len(suffix)) + suffix


def age_range(g):
    """(min, max) — data/games.json [min, max] listesi; eski 'min-max' metni de kabul edilir."""
    age = g["age"]
    if isinstance(age, (list, tuple)):
        if len(age) != 2 or not all(isinstance(x, int) for x in age) or age[0] >= age[1]:
            raise ValueError(f"{g['slug']}: age {age!r} [min, max] (min < max) biciminde degil")
        return int(age[0]), int(age[1])
    m = re.fullmatch(r"\s*(\d+)\s*-\s*(\d+)\s*", str(age))
    if not m:
        raise ValueError(f"{g['slug']}: age '{age}' 'min-max' biciminde degil")
    return int(m.group(1)), int(m.group(2))


def age_label(g):
    """Metin: '4-7' (meta description, landing kutusu, hub karti)."""
    amin, amax = age_range(g)
    return f"{amin}-{amax}"


def minutes_label(g):
    """Tipik tur suresi metni ('5 dk'); alan yoksa bos (eski kayit sekli)."""
    minutes = g.get("minutes")
    return f"{minutes} dk" if minutes else ""


def players_range(g):
    """(min, max) — max bilinmiyorsa None; turetilemiyorsa None doner."""
    if "players_range" in g:
        return tuple(g["players_range"])
    p = g["players"].lower()
    m = re.search(r"(\d+)\s*-\s*(\d+)", p)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.search(r"(\d+)\s*kişi", p)
    if m:
        return int(m.group(1)), int(m.group(1))
    if p.startswith("tek"):
        return 1, 1
    if "online" in p:
        return 2, None
    return None


def play_modes(g):
    p = g["players"].lower()
    online = "online" in p
    solo = p.startswith("tek") or "solo" in p or "bot" in p
    if online and solo:
        return ["SinglePlayer", "MultiPlayer"]
    return "MultiPlayer" if online else "SinglePlayer"


def static_url(p):
    return f"{SITE}/{p['slug']}/"


def static_nav(p):
    return p.get("nav") or p["title"]


def static_links():
    return "".join(f' · <a href="/{p["slug"]}/">{esc(static_nav(p))}</a>' for p in STATIC_PAGES)


def total_games(active):
    """Sitede duyurulan toplam oyun sayisi: aktif sayfalar + ayni sayfada online surumu olanlar."""
    return len(active) + sum(1 for g in active if g.get("also_online"))


def fill(text, total):
    """Statik sayfa metnindeki yer tutucular (veri dosyasinda belgelenir)."""
    return text.replace("{toplam_oyun}", str(total))


# ---------------------------------------------------------------- git / tazelik
def git(*args):
    try:
        r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    except OSError:
        return None
    return r.stdout if r.returncode == 0 else None


def committed_text(rel):
    """HEAD'deki icerik (LF'e normalize) ya da None (izlenmiyor / git yok)."""
    out = git("show", f"HEAD:{rel}")
    return out.replace("\r\n", "\n") if out is not None else None


def last_commit_date(rel):
    out = (git("log", "-1", "--format=%cs", "--", rel) or "").strip()
    return out or None


def render_fresh(rel, render):
    """render(date) -> (metin, tarih, kaynak). HEAD'deki surumle birebir ayniysa dosyanin son
    commit tarihi ('git'), degilse bugun ('bugun')."""
    git_date = last_commit_date(rel)
    if git_date:
        candidate = render(git_date)
        if candidate == committed_text(rel):
            return candidate, git_date, "git"
    return render(TODAY), TODAY, "bugun"


# ---------------------------------------------------------------- JSON-LD
def jsonld_graph(*nodes):
    text = json.dumps({"@context": "https://schema.org", "@graph": list(nodes)}, ensure_ascii=False, indent=2)
    return text.replace("</", "<\\/")   # <script> icinde guvenli


def jsonld_org():
    """Bilnet Oyun + ust kurum. Okul URL'leri games_data.SCHOOL_* (sahip dogrulamali tek kaynak).
    sameAs sosyal hesaplar (@bilnetbalikesir) kampusun profilleri -> parentOrganization altinda;
    Bilnet Oyun'un kendi sosyal hesabi yok, uydurulmaz."""
    return {"@type": "Organization", "@id": ORG_ID, "name": "Bilnet Oyun",
            "url": SITE + "/", "logo": f"{SITE}/icon-512.png",
            "parentOrganization": {"@type": "EducationalOrganization", "name": SCHOOL_NAME, "url": SCHOOL_URL,
                                   "sameAs": [u for _, u in SCHOOL_SOCIAL]}}


def jsonld_breadcrumb(*items):
    """items: (ad, url|None) — son oge url'siz olabilir (sayfanin kendisi)."""
    elements = []
    for i, (name, url) in enumerate(items, 1):
        el = {"@type": "ListItem", "position": i, "name": name}
        if url:
            el["item"] = url
        elements.append(el)
    return {"@type": "BreadcrumbList", "itemListElement": elements}


def jsonld_game(g, url, date):
    amin, amax = age_range(g)
    game = {
        "@type": "VideoGame",
        "@id": url + "#game",
        "name": g["name"],
        "url": url,
        "image": OG_IMAGE,
        "description": g["about"],
        "inLanguage": "tr",
        "genre": g["cat"],
        "gamePlatform": "Web Browser",
        "applicationCategory": "GameApplication",
        "operatingSystem": "Any",
        "playMode": play_modes(g),
    }
    rng = players_range(g)
    if rng:
        qty = {"@type": "QuantitativeValue", "minValue": rng[0]}
        if rng[1] is not None:
            qty["maxValue"] = rng[1]
        game["numberOfPlayers"] = qty
    game.update({
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "TRY"},
        "audience": {"@type": "EducationalAudience", "educationalRole": "student",
                     "suggestedMinAge": amin, "suggestedMaxAge": amax},
        "educationalUse": "practice",
        "teaches": g["teaches"],
        "dateModified": date,
        "publisher": {"@id": ORG_ID},
    })
    return game


def jsonld_page(g, url, date):
    crumbs = jsonld_breadcrumb(("Ana Sayfa", SITE + "/"), ("Oyunlar", SITE + "/oyunlar/"), (g["name"], None))
    return jsonld_graph(jsonld_game(g, url, date), jsonld_org(), crumbs)


def jsonld_hub(active, desc, date):
    items = [{"@type": "ListItem", "position": i, "url": page_url(g), "name": g["name"]}
             for i, g in enumerate(active, 1)]
    page = {
        "@type": "CollectionPage",
        "@id": f"{SITE}/oyunlar/#page",
        "name": "Tüm Eğitici Oyunlar",
        "url": f"{SITE}/oyunlar/",
        "description": desc,
        "inLanguage": "tr",
        "dateModified": date,
        "publisher": {"@id": ORG_ID},
        "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items},
    }
    return jsonld_graph(page, jsonld_org(), jsonld_breadcrumb(("Ana Sayfa", SITE + "/"), ("Oyunlar", None)))


def jsonld_static(p, url, desc, date):
    page = {
        "@type": p.get("schema_type", "WebPage"),
        "@id": url + "#page",
        "name": p["title"],
        "url": url,
        "description": desc,
        "inLanguage": "tr",
        "dateModified": date,
        "publisher": {"@id": ORG_ID},
    }
    if page["@type"] == "AboutPage":
        page["mainEntity"] = {"@id": ORG_ID}
    return jsonld_graph(page, jsonld_org(), jsonld_breadcrumb(("Ana Sayfa", SITE + "/"), (p["title"], None)))


# ---------------------------------------------------------------- sablonlar
HEAD_COMMON = f"""<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="stylesheet" href="{FONTS_HREF}">
<link rel="stylesheet" href="/css/landing.css">
<link rel="stylesheet" href="/css/imza.css">"""

PAGE_TMPL = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#4AABE0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="author" content="Bilnet Oyun">
<link rel="canonical" href="{url}">
<meta name="robots" content="{robots}">
<meta property="og:type" content="website">
<meta property="og:title" content="{ogt}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Bilnet Oyun">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="{og_w}">
<meta property="og:image:height" content="{og_h}">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ogt}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{og_image}">
{head_common}
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>
<div class="wrap">
<header><a href="/">🎮 Bilnet Oyun</a></header>
<nav class="crumb" aria-label="Sayfa yolu"><a href="/">Ana Sayfa</a> › <a href="/oyunlar/">Oyunlar</a> › {name}</nav>
<main class="card">
<h1>{h1}</h1>
<p class="tagline">{short}</p>
{cta}
<div class="meta"><span><span aria-hidden="true">👤</span> {players}</span><span><span aria-hidden="true">🎯</span> {age} yaş</span><span><span aria-hidden="true">🏷️</span> {cat}</span><span><span aria-hidden="true">🧠</span> {teaches}</span></div>
<p class="about">{about}</p>
<p class="about"><strong>Nasıl oynanır?</strong> {howto}</p>
<div class="more">▸ <a href="/oyunlar/">Tüm eğitici oyunları gör</a></div>
</main>
<footer>Bilnet Oyun — Bilnet Okulları Eğitici Oyun Platformu · <a href="/">Ana Sayfa</a> · <a href="/oyunlar/">Oyunlar</a>{static_links}</footer>
</div>
{imza}
</body>
</html>
"""

HUB_TMPL = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#4AABE0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="author" content="Bilnet Oyun">
<link rel="canonical" href="{site}/oyunlar/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:title" content="Tüm Oyunlar | Bilnet Oyun">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{site}/oyunlar/">
<meta property="og:site_name" content="Bilnet Oyun">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="{og_w}">
<meta property="og:image:height" content="{og_h}">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Tüm Oyunlar | Bilnet Oyun">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{og_image}">
{head_common}
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>
<div class="wrap wrap--hub">
<header><a class="home" href="/">🎮 Bilnet Oyun</a></header>
<nav class="crumb" aria-label="Sayfa yolu"><a href="/">Ana Sayfa</a> › Oyunlar</nav>
<main>
<h1>Tüm Eğitici Oyunlar</h1>
<p class="lead">Anaokulu, ilkokul ve ortaokul çocukları için {n} ücretsiz, üyeliksiz eğitici oyun. Bir oyuna dokun, tarayıcıda hemen oyna.</p>
<div class="grid">
{cards}
</div>
</main>
<footer>Bilnet Oyun — Bilnet Okulları Eğitici Oyun Platformu · <a href="/">Ana Sayfa</a>{static_links}</footer>
</div>
{imza}
</body>
</html>
"""

STATIC_TMPL = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#4AABE0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="author" content="Bilnet Oyun">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:title" content="{ogt}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Bilnet Oyun">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="{og_w}">
<meta property="og:image:height" content="{og_h}">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ogt}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{og_image}">
{head_common}
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>
<div class="wrap wrap--doc">
<header><a href="/">🎮 Bilnet Oyun</a></header>
<nav class="crumb" aria-label="Sayfa yolu"><a href="/">Ana Sayfa</a> › {nav}</nav>
<main class="card doc">
<h1>{h1}</h1>
<p class="tagline">{lead}</p>
{note}{toc}{sections}
<div class="more">▸ <a href="/oyunlar/">Tüm eğitici oyunları gör</a></div>
</main>
<footer>Bilnet Oyun — Bilnet Okulları Eğitici Oyun Platformu · <a href="/">Ana Sayfa</a> · <a href="/oyunlar/">Oyunlar</a>{static_links}</footer>
</div>
{imza}
</body>
</html>
"""

TOC_MIN_SECTIONS = 5      # bu kadar ve daha cok bolumu olan sayfaya "Bu sayfada" atlama menusu

CTA_ACTIVE = '<a class="play" href="/?oyun={slug}">▶ Hemen Oyna (Ücretsiz)</a>'
CTA_SOON = '<p class="soon" role="status"><span aria-hidden="true">⏳</span> Çok yakında — bu oyun hazırlanıyor</p>'
HOWTO_ACTIVE = ("“Hemen Oyna” butonuna dokun — kurulum, indirme veya üyelik gerekmez. "
                "{name}, telefon, tablet ve bilgisayarda tarayıcıda ücretsiz çalışır.")
HOWTO_SOON = ("{name} şu anda hazırlanıyor; yayına girdiğinde bu sayfadan kurulum ve üyelik olmadan, "
              "tarayıcıda ücretsiz oynayabileceksin. O zamana kadar <a href=\"/oyunlar/\">diğer eğitici oyunlara</a> göz at.")


# ---------------------------------------------------------------- ureticiler
def build_page(g, date):
    url = page_url(g)
    active = is_active(g)
    name = esc(g["name"])
    return PAGE_TMPL.format(
        title=esc(build_title(g)), desc=esc(build_description(g)), url=url,
        robots="index, follow, max-image-preview:large" if active else "noindex, follow",
        ogt=esc(g["name"] + (" Oyna" if active else " – Çok Yakında") + " | Bilnet Oyun"),
        og_image=OG_IMAGE, og_w=OG_W, og_h=OG_H, head_common=HEAD_COMMON, jsonld=jsonld_page(g, url, date),
        name=name, h1=name + (" Oyna" if active else ""), short=esc(g["short"]),
        cta=CTA_ACTIVE.format(slug=g["slug"]) if active else CTA_SOON,
        players=esc(g["players"]), age=esc(age_label(g)), cat=esc(g["cat"]), teaches=esc(g["teaches"]),
        about=esc(g["about"]),
        howto=(HOWTO_ACTIVE if active else HOWTO_SOON).format(name=name),
        static_links=static_links(), imza=IMZA_HTML)


def static_title(p):
    return p.get("page_title") or f"{p['title']} | Bilnet Oyun"


def static_description(p, total):
    return fill(p["description"], total)


def render_block(text, total):
    """Paragraf metni <p> icine alinir; '<' ile baslayan blok (liste, yorum) oldugu gibi basilir."""
    text = fill(text, total)
    return text if text.lstrip().startswith("<") else f"<p>{text}</p>"


def render_sections(p, total):
    out = []
    for h2, sid, blocks in p["sections"]:
        body = "\n".join(render_block(b, total) for b in blocks)
        out.append(f'<section id="{sid}">\n<h2>{esc(h2)}</h2>\n{body}\n</section>')
    return "\n".join(out)


def render_toc(p):
    if len(p["sections"]) < TOC_MIN_SECTIONS:
        return ""
    links = "\n".join(f'<a href="#{sid}">{esc(h2)}</a>' for h2, sid, _ in p["sections"])
    return f'<nav class="toc" aria-label="Bu sayfada">\n{links}\n</nav>\n'


def build_static(p, date, total):
    url = static_url(p)
    desc = static_description(p, total)
    note = f'<p class="note" role="note">{esc(p["note"])}</p>\n' if p.get("note") else ""
    return STATIC_TMPL.format(
        title=esc(static_title(p)), desc=esc(desc), url=url, ogt=esc(f"{p['title']} | Bilnet Oyun"),
        og_image=OG_IMAGE, og_w=OG_W, og_h=OG_H, head_common=HEAD_COMMON,
        jsonld=jsonld_static(p, url, desc, date), nav=esc(static_nav(p)), h1=esc(p["title"]),
        lead=esc(fill(p["lead"], total)), note=note, toc=render_toc(p), sections=render_sections(p, total),
        static_links=static_links(), imza=IMZA_HTML)


def hub_title(n):
    return f"Tüm Oyunlar – {n} Ücretsiz Eğitici Çocuk Oyunu | Bilnet Oyun"


def hub_description(n):
    return (f"Bilnet Oyun'da {n} ücretsiz eğitici çocuk oyunu: satranç, matematik, kodlama, kelime ve "
            f"online oyunlar. {AGE_SPAN} yaş, üyeliksiz, tarayıcıda oynanır.")


def build_hub(active, date):
    cards = "\n".join(
        f'<a class="g" href="/oyunlar/{g["slug"]}/"><h2>{esc(g["name"])}</h2>'
        f'<p>{esc(g["short"])}</p><span class="t">{esc(g["cat"])} · {esc(age_label(g))} yaş'
        + (f' · {esc(minutes_label(g))}' if minutes_label(g) else '') + ' ›</span></a>'
        for g in active)
    n = len(active)
    desc = hub_description(n)
    return HUB_TMPL.format(
        title=esc(hub_title(n)), desc=esc(desc), site=SITE, og_image=OG_IMAGE, og_w=OG_W, og_h=OG_H,
        head_common=HEAD_COMMON, jsonld=jsonld_hub(active, desc, date), n=n, cards=cards,
        static_links=static_links(), imza=IMZA_HTML)


def build_sitemap(entries):
    """entries: [(url, lastmod)] — changefreq/priority bilerek yok (Google yok sayar)."""
    items = "\n".join(f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{d}</lastmod>\n  </url>" for u, d in entries)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + items + "\n</urlset>\n")


def games_heading(active):
    dual = [g["name"] for g in active if g.get("also_online")]
    if not dual:
        return f"## Oyunlar ({len(active)})"
    return (f"## Oyunlar ({len(active)} sayfa; {' ve '.join(dual)} için 2 kişilik online sürüm de var, "
            "ayrı sayfası yok)")


def build_llms(active):
    total = total_games(active)
    lines = [
        "# Bilnet Oyun",
        "",
        f"> Bilnet Okulları'nın {AGE_SPAN} yaş çocuklar için ücretsiz, üyeliksiz eğitici oyun platformu. "
        f"{total} oyun doğrudan tarayıcıda çalışır; kurulum, indirme ve hesap gerekmez. "
        "Türkçe arayüz; telefon, tablet ve bilgisayarda oynanır. Dersler: matematik, Türkçe, İngilizce, fen, "
        "kodlama, strateji, hafıza ve sanat; tek kişilik ve online çok oyunculu modlar.",
        "",
        f"- Ana sayfa: {SITE}/",
        f"- Tüm oyunlar: {SITE}/oyunlar/",
        f"- Site haritası: {SITE}/sitemap.xml",
        "",
        games_heading(active),
        "",
    ]
    lines += [f"- [{g['name']}]({page_url(g)}): {g['short']}" for g in active]
    if STATIC_PAGES:
        lines += ["", "## Sayfalar", ""]
        lines += [f"- [{p['title']}]({SITE}/{p['slug']}/)" for p in STATIC_PAGES]
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- dogrulama
def validate_data():
    slugs = [g["slug"] for g in GAMES]
    dupes = sorted({s for s in slugs if slugs.count(s) > 1})
    if dupes:
        raise ValueError(f"Tekrarlayan slug: {dupes}")
    for g in GAMES:
        age_range(g)
        if not re.fullmatch(r"[a-z0-9-]+", g["slug"]):
            raise ValueError(f"Gecersiz slug: {g['slug']}")
    validate_static_pages()


STATIC_REQUIRED = ("slug", "title", "description", "lead", "sections")
STATIC_RESERVED = {"oyunlar", "games", "css", "js", "assets", "admin", "seo", "docs", "plans", "fabrika"}


def validate_static_pages():
    slugs = [p["slug"] for p in STATIC_PAGES]
    if len(set(slugs)) != len(slugs):
        raise ValueError(f"Tekrarlayan statik slug: {slugs}")
    for p in STATIC_PAGES:
        missing = [k for k in STATIC_REQUIRED if not p.get(k)]
        if missing:
            raise ValueError(f"Statik sayfa {p.get('slug')}: eksik alan {missing}")
        if not re.fullmatch(r"[a-z0-9-]+", p["slug"]) or p["slug"] in STATIC_RESERVED:
            raise ValueError(f"Gecersiz statik slug: {p['slug']}")
        ids = [sid for _, sid, _ in p["sections"]]
        if len(set(ids)) != len(ids) or not all(re.fullmatch(r"[a-z0-9-]+", i) for i in ids):
            raise ValueError(f"Statik sayfa {p['slug']}: bolum id'leri benzersiz ve [a-z0-9-] olmali: {ids}")


def limit_problems(label, title, desc):
    out = []
    if len(title) > TITLE_MAX:
        out.append(f"  {label}: title {len(title)} > {TITLE_MAX}: {title}")
    if len(desc) > DESC_MAX:
        out.append(f"  {label}: description {len(desc)} > {DESC_MAX}: {desc}")
    return out


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


# ---------------------------------------------------------------- ana akis
def main():
    validate_data()
    active = [g for g in GAMES if is_active(g)]
    inactive = [g for g in GAMES if not is_active(g)]

    pages, problems, longest = [], [], (0, 0)
    for g in GAMES:
        rel = f"oyunlar/{g['slug']}/index.html"
        text, date, source = render_fresh(rel, lambda d, g=g: build_page(g, d))
        title, desc = build_title(g), build_description(g)
        longest = (max(longest[0], len(title)), max(longest[1], len(desc)))
        problems += limit_problems(g["slug"], title, desc)
        pages.append((rel, text, date, source, g))

    hub_rel = "oyunlar/index.html"
    hub_text, hub_date, _ = render_fresh(hub_rel, lambda d: build_hub(active, d))
    problems += limit_problems("oyunlar/", hub_title(len(active)), hub_description(len(active)))

    total = total_games(active)
    statics = []
    for p in STATIC_PAGES:
        rel = f"{p['slug']}/index.html"
        text, date, _ = render_fresh(rel, lambda d, p=p: build_static(p, d, total))
        problems += limit_problems(f"{p['slug']}/", static_title(p), static_description(p, total))
        statics.append((rel, text, date, p))

    if problems:
        print(f"HATA: title > {TITLE_MAX} / description > {DESC_MAX} karakter — hicbir dosya yazilmadi:")
        print("\n".join(problems))
        sys.exit(1)

    entries = [(SITE + "/", last_commit_date("index.html") or TODAY), (SITE + "/oyunlar/", hub_date)]
    entries += [(static_url(p), date) for _, _, date, p in statics]
    entries += [(page_url(g), date) for _, _, date, _, g in pages if is_active(g)]

    for rel, text, _, _, _ in pages:
        write(rel, text)
    write(hub_rel, hub_text)
    for rel, text, _, _ in statics:
        write(rel, text)
    write("sitemap.xml", build_sitemap(entries))
    write("llms.txt", build_llms(active))

    fresh = sum(1 for _, _, _, source, _ in pages if source == "bugun")
    print(f"OK: {len(pages)} landing ({len(active)} aktif, {len(inactive)} pasif/noindex) + hub + "
          f"{len(statics)} statik sayfa ({', '.join(p['slug'] for p in STATIC_PAGES)}) + "
          f"sitemap.xml ({len(entries)} URL) + llms.txt ({len(active)} oyun) uretildi.")
    print(f"Kontrol: title en uzun {longest[0]}/{TITLE_MAX}, description en uzun {longest[1]}/{DESC_MAX}, sinir asimi 0.")
    print(f"lastmod: {fresh} sayfa degisti -> bugun ({TODAY}); {len(pages) - fresh} sayfa HEAD ile ayni -> son commit tarihi.")
    if inactive:
        print("Pasif (noindex, hub/sitemap/llms disi):", ", ".join(g["slug"] for g in inactive))
    print("Slug listesi:", ", ".join(g["slug"] for g in GAMES))


if __name__ == "__main__":
    main()
