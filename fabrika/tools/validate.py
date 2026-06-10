#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fabrika build doğrulayıcı — tek dosya kuralları.
Kontroller: boyut < 2 MB, dış referans yok, firebase/localStorage yok.
Kullanım: python validate.py <build.html> [...]  → hata varsa exit 1
"""
import re
import sys
from pathlib import Path

MAX_BYTES = 2 * 1024 * 1024

# (desen, açıklama) — case-insensitive taranır
FORBIDDEN = [
    (r'src=["\']https?://', 'harici src='),
    (r'href=["\']https?://', 'harici href='),
    (r'\bfetch\s*\(', 'fetch() çağrısı'),
    (r'firebase', 'firebase referansı'),
    (r'XMLHttpRequest', 'XMLHttpRequest'),
    (r'\blocalStorage\b', 'doğrudan localStorage'),
    (r'^\s*import\s+[{"\'\w]', 'ESM import satırı'),
    (r'googleapis|gstatic\.com|cdnjs|unpkg|jsdelivr', 'CDN referansı'),
]


def validate(path):
    p = Path(path)
    errors = []
    if not p.exists():
        return [f'dosya yok: {p}']
    size = p.stat().st_size
    if size >= MAX_BYTES:
        errors.append(f'boyut {size/1024:.0f} KB >= 2 MB limiti')
    text = p.read_text(encoding='utf-8')
    for pattern, desc in FORBIDDEN:
        m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if m:
            line = text.count('\n', 0, m.start()) + 1
            errors.append(f'{desc} (satır {line}: {m.group(0)!r})')
    return errors


def main():
    paths = sys.argv[1:]
    if not paths:
        print('kullanım: python validate.py <build.html> [...]')
        sys.exit(2)
    failed = False
    for path in paths:
        errors = validate(path)
        size_kb = Path(path).stat().st_size / 1024 if Path(path).exists() else 0
        if errors:
            failed = True
            print(f'[FAIL] {path}')
            for e in errors:
                print(f'   - {e}')
        else:
            print(f'[OK]   {path}  ({size_kb:.0f} KB)')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
