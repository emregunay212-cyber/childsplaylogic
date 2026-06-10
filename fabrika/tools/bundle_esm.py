#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ES module birleştirici (ates-buz için).
import satırlarını siler, export anahtar kelimelerini soyar, dosyaları verilen
topolojik sırayla tek script'e birleştirir. Üst-düzey tanımlayıcı çakışmasında
build'i düşürür.
"""
import re
import sys
from pathlib import Path

# Tek VE çok satırlı import'lar: 'import' ile başlar, ilk ';'e kadar (import
# ifadesi içinde ';' geçemez; [^;] karakter sınıfı newline'ları da kapsar).
IMPORT_RE = re.compile(r'^[ \t]*import\s[^;]*;', re.MULTILINE)
EXPORT_BLOCK_RE = re.compile(r'^\s*export\s*\{[^}]*\}\s*;?\s*$', re.MULTILINE)
EXPORT_DECL_RE = re.compile(r'^(\s*)export\s+(async\s+function|const|let|var|function|class|default)\b', re.MULTILINE)
TOPLEVEL_DECL_RE = re.compile(r'^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', re.MULTILINE)


def strip_module_syntax(src):
    src = IMPORT_RE.sub('', src)
    src = EXPORT_BLOCK_RE.sub('', src)
    src = EXPORT_DECL_RE.sub(r'\1\2', src)
    return src


def toplevel_names(src):
    return set(TOPLEVEL_DECL_RE.findall(src))


def bundle(files, overrides=None):
    """files: sıralı Path listesi. overrides: {dosya_adi: Path} — varsa onu oku."""
    overrides = overrides or {}
    seen = {}
    parts = []
    for f in files:
        f = Path(f)
        src_path = overrides.get(f.name, f)
        src = Path(src_path).read_text(encoding='utf-8')
        names = toplevel_names(src)
        for n in names:
            if n in seen:
                raise SystemExit(
                    f'[bundle_esm] Tanımlayıcı çakışması: "{n}" hem {seen[n]} hem {f.name} içinde')
            seen[n] = f.name
        stripped = strip_module_syntax(src)
        if re.search(r'^\s*import\s', stripped, re.MULTILINE):
            raise SystemExit(f'[bundle_esm] {f.name}: temizlenemeyen import kaldı')
        parts.append(f'/* ===== {f.name} ===== */\n{stripped}')
    return '\n\n'.join(parts)


if __name__ == '__main__':
    print('Bu modül build.py tarafından kullanılır; doğrudan çalıştırma için dosya listesi verin.')
    if len(sys.argv) > 1:
        print(bundle([Path(p) for p in sys.argv[1:]])[:2000])
