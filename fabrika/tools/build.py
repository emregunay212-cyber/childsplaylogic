#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fabrika build aracı — oyunları tek dosyalık portal build'lerine derler.

Kullanım:
    python build.py <oyun-id> [...]     # fabrika/src/<oyun-id>/config.json okur
    python build.py all                 # src/ altındaki tüm oyunlar

config.json şeması:
{
  "id": "buz-kulesi",
  "type": "shellA" | "singlefile" | "esm",
  "titles": {"tr": "Buz Kulesi", "en": "Frost Climber"},
  "slug":   {"tr": "buz-kulesi", "en": "frost-climber"},   # çıktı dosya adları
  "langs": ["tr", "en"],
  "themeColor": "#4ECDC4",
  "mode": "endless" | "levels",        # shellA: kabuk davranışı
  "levelCount": 12,                    # mode=levels ise
  "gameVar": "BuzKulesi",              # shellA: GAME = <gameVar>
  "sources": ["game.js"],              # src/<id>/ altında, sırayla
  "css": ["game.css"],
  "assets": {"assets/archer.png": 128},        # yol(repo köküne göre) -> renk sayısı
  "srcRoot": "games/ates-buz",         # esm: canlı kaynak kökü
  "bundleOrder": ["js/helpers.js", ...],       # esm: topolojik sıra
  "dataFiles": {"GAMEDATA_ADI": "data/x.json"} # esm/singlefile: gömülecek JSON'lar
}
"""
import base64
import json
import sys
from pathlib import Path

FABRIKA = Path(__file__).resolve().parent.parent
REPO = FABRIKA.parent
BUILD_DIR = FABRIKA / 'build'

sys.path.insert(0, str(FABRIKA / 'tools'))
from optimize_png import png_data_uri  # noqa: E402
import validate as validator  # noqa: E402

LIBS = ['js/audio.js', 'js/particles.js', 'js/mobile-utils.js']


def read(p):
    return Path(p).read_text(encoding='utf-8')


def guard_script_safe(name, text):
    if '</script' in text.lower():
        raise SystemExit(f'[build] {name}: içerik "</script" içeriyor — HTML gömme bozulur')
    return text


def asset_map(cfg):
    """config.assets → {yol: dataURI}"""
    out = {}
    for rel, colors in cfg.get('assets', {}).items():
        p = REPO / rel
        uri = png_data_uri(p, colors)
        out[rel] = uri
        print(f'   asset: {rel}  ({p.stat().st_size//1024} KB -> {len(uri)*3//4//1024} KB b64)')
    return out


def build_shellA(cfg, src_dir):
    template = read(FABRIKA / 'templates' / 'shell.html')
    strings = json.loads(read(src_dir / 'strings.json'))
    core = read(FABRIKA / 'shims' / 'core.js').replace(
        '___STRINGS___', json.dumps(strings, ensure_ascii=False))
    libs = '\n\n'.join(read(REPO / l) for l in LIBS)
    game_js = '\n\n'.join(
        guard_script_safe(s, read(src_dir / s)) for s in cfg['sources'])
    game_css = '\n\n'.join(read(src_dir / c) for c in cfg.get('css', []))

    # Asset'ler varsa __ASSETS sabiti olarak başa ekle
    assets = asset_map(cfg)
    if assets:
        game_js = 'const __ASSETS = ' + json.dumps(assets) + ';\n\n' + game_js

    shell_cfg = {
        'id': cfg['id'],
        'mode': cfg.get('mode', 'endless'),
        'levelCount': cfg.get('levelCount', 1),
    }

    outs = []
    for lang in cfg.get('langs', ['tr', 'en']):
        html = (template
                .replace('___LANG___', lang)
                .replace('___TITLE___', cfg['titles'][lang])
                .replace('___THEME___', cfg.get('themeColor', '#4ECDC4'))
                .replace('___GAME_CSS___', game_css)
                .replace('___CORE_JS___', core)
                .replace('___LIBS_JS___', libs)
                .replace('___SHELL_CONFIG___', json.dumps(shell_cfg))
                .replace('___GAME_JS___', game_js)
                .replace('___GAME_VAR___', cfg['gameVar']))
        out = BUILD_DIR / f"{cfg['slug'][lang]}-{lang}.html"
        out.write_text(html, encoding='utf-8')
        outs.append(out)
    return outs


def build_singlefile(cfg, src_dir):
    """Önceden tek-HTML olan oyun (zindan-okcusu): src kopyası üzerinde
    yer-tutucu değişimleri + asset gömme + STRINGS/core enjeksiyonu."""
    html = read(src_dir / 'index.html')

    strings_path = src_dir / 'strings.json'
    strings = json.loads(read(strings_path)) if strings_path.exists() else {'tr': {}, 'en': {}}
    core = read(FABRIKA / 'shims' / 'core.js').replace(
        '___STRINGS___', json.dumps(strings, ensure_ascii=False))
    html = html.replace('/*___FABRIKA_CORE___*/', core)

    # Asset yolu -> dataURI: oyun içindeki yol literal'i config'te "assetLiterals" ile eşlenir
    assets = asset_map(cfg)
    for rel, uri in assets.items():
        literal = cfg.get('assetLiterals', {}).get(rel, rel)
        if literal not in html:
            raise SystemExit(f'[build] {cfg["id"]}: asset literal bulunamadı: {literal}')
        html = html.replace(literal, uri)

    outs = []
    for lang in cfg.get('langs', ['tr']):
        out_html = (html
                    .replace('___LANG___', lang)
                    .replace('___TITLE___', cfg['titles'][lang]))
        out_html = inject_question_bank(out_html, cfg, lang)
        out_html = apply_translation(out_html, src_dir, cfg, lang)
        out = BUILD_DIR / f"{cfg['slug'][lang]}-{lang}.html"
        out.write_text(out_html, encoding='utf-8')
        outs.append(out)
    return outs


def inject_question_bank(html, cfg, lang):
    """config.questionBank varsa /*___SORU_BANKASI___*/ yerine dil-filtreli
    soru bankasını göm: {konular:[{kod,ad}], sorular:[...]} (yalnız o dilin soruları)."""
    qb = cfg.get('questionBank')
    if not qb:
        return html
    bank = json.loads(read(REPO / qb))
    sorular = [
        {'konu': q['konu'], 'zorluk': q['zorluk'], 'soru': q['soru'],
         'secenekler': q['secenekler'], 'dogru_index': q['dogru_index']}
        for q in bank['sorular'] if q.get('dil') == lang
    ]
    konular = [{'kod': k['kod'], 'ad': k.get('ad_' + lang, k.get('ad_tr', k['kod']))}
               for k in bank.get('konular', [])]
    payload = json.dumps({'konular': konular, 'sorular': sorular}, ensure_ascii=False)
    guard_script_safe('soru-bankasi', payload)
    print(f'   soru bankası ({lang}): {len(sorular)} soru, {len(konular)} konu')
    return html.replace('/*___SORU_BANKASI___*/',
                        'const SORU_BANKASI = ' + payload + ';')


def apply_translation(html, src_dir, cfg, lang):
    """translate-<lang>.json varsa TR metinleri hedef dile çevir.
    Güvenli bağlamlar: '...' / "..." (JS literal, tam içerik) ve >...< (HTML
    metin düğümü, tam içerik). Kısmi/kelime-içi eşleşme yapılmaz."""
    tfile = src_dir / f'translate-{lang}.json'
    if not tfile.exists():
        return html
    table = json.loads(read(tfile))
    # Uzun metinler önce — kısa bir metin uzunun parçasıysa önce uzun değişsin
    missing = []
    for key in sorted(table, key=len, reverse=True):
        en = table[key]
        # '~' öneki: bağlamsız düz değişim (açık uçlu parçalar için; anahtar
        # benzersiz olacak kadar uzun seçilmeli)
        if key.startswith('~'):
            tr = key[1:]
            if tr in html:
                html = html.replace(tr, en)
            else:
                missing.append(tr)
            continue
        tr = key
        hit = False
        for pre, post in (("'", "'"), ('"', '"'), ('>', '<')):
            old = pre + tr + post
            if old in html:
                html = html.replace(old, pre + en + post)
                hit = True
        if not hit:
            missing.append(tr)
    if missing:
        print(f'   [çeviri] eşleşmeyen {len(missing)} giriş: '
              + ' | '.join(m[:30] for m in missing[:5]))
    return html


def build_esm(cfg, src_dir):
    """ES-module oyun (ates-buz): bundle + şablona gömme."""
    from bundle_esm import bundle

    src_root = REPO / cfg['srcRoot']
    overrides = {}
    for p in (src_dir / 'js').rglob('*.js') if (src_dir / 'js').exists() else []:
        overrides[p.name] = p

    files = [src_root / f for f in cfg['bundleOrder']]
    game_js = bundle(files, overrides)
    guard_script_safe('bundle', game_js)

    # Veri JSON'ları → tek __GAMEDATA__ objesi (dataBundle: {anahtar: göreli dosya yolu})
    data_obj = {}
    for key, rel in cfg.get('dataBundle', {}).items():
        data_obj[key] = json.loads(read(src_root / rel))
    data_js = ('const __GAMEDATA__ = ' + json.dumps(data_obj, ensure_ascii=False) + ';') if data_obj else ''

    # __ASSETS anahtarları oyunun kullandığı literal yollar (assetLiterals eşlemesi)
    assets = asset_map(cfg)
    lit = cfg.get('assetLiterals', {})
    assets_js = 'const __ASSETS = ' + json.dumps(
        {lit.get(k, k): v for k, v in assets.items()}) + ';'

    strings = json.loads(read(src_dir / 'strings.json'))
    core = read(FABRIKA / 'shims' / 'core.js').replace(
        '___STRINGS___', json.dumps(strings, ensure_ascii=False))

    template = read(src_dir / 'template.html')
    outs = []
    for lang in cfg.get('langs', ['tr', 'en']):
        html = (template
                .replace('___LANG___', lang)
                .replace('___TITLE___', cfg['titles'][lang])
                .replace('/*___FABRIKA_CORE___*/', core)
                .replace('/*___ASSETS___*/', assets_js)
                .replace('/*___GAMEDATA___*/', data_js)
                .replace('/*___GAME_JS___*/', game_js))
        out = BUILD_DIR / f"{cfg['slug'][lang]}-{lang}.html"
        out.write_text(html, encoding='utf-8')
        outs.append(out)
    return outs


BUILDERS = {'shellA': build_shellA, 'singlefile': build_singlefile, 'esm': build_esm}


def build_game(game_id):
    src_dir = FABRIKA / 'src' / game_id
    cfg = json.loads(read(src_dir / 'config.json'))
    print(f'[build] {game_id} ({cfg["type"]})')
    BUILD_DIR.mkdir(exist_ok=True)
    outs = BUILDERS[cfg['type']](cfg, src_dir)
    failed = False
    for out in outs:
        errors = validator.validate(out)
        # Oyun-özel yasaklı kelimeler (örn. marka adları)
        text = out.read_text(encoding='utf-8').lower()
        for word in cfg.get('forbiddenWords', []):
            if word.lower() in text:
                errors.append(f'yasaklı kelime: {word!r}')
        if errors:
            failed = True
            print(f'   [FAIL] {out.name}')
            for e in errors:
                print(f'      - {e}')
        else:
            print(f'   [OK]   {out.name}  ({out.stat().st_size//1024} KB)')
    return not failed


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    if args == ['all']:
        args = sorted(p.name for p in (FABRIKA / 'src').iterdir()
                      if (p / 'config.json').exists())
    ok = all(build_game(g) for g in args)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
