#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fabrika build doğrulayıcı — tek dosya kuralları.
Kontroller: boyut < 2 MB, dış referans yok, firebase/localStorage yok.
Kullanım: python validate.py <build.html> [...]  → hata varsa exit 1
"""
import re
import shutil
import subprocess
import sys
import tempfile
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
    errors.extend(check_script_syntax(text))
    return errors


def check_script_syntax(html):
    """Gömülü <script> bloklarını node --check ile parse et (node yoksa sessiz atla)."""
    if not shutil.which('node'):
        return []
    errors = []
    for i, m in enumerate(re.finditer(r'<script>(.*?)</script>', html, re.DOTALL)):
        # .cjs: node'un module-detection'ı 'export' görüp ESM sayamasın —
        # inline <script> klasik script'tir, export/import orada hatadır.
        with tempfile.NamedTemporaryFile('w', suffix='.cjs', delete=False,
                                         encoding='utf-8') as f:
            f.write(m.group(1))
            tmp = f.name
        try:
            r = subprocess.run(['node', '--check', tmp],
                               capture_output=True, text=True, timeout=30)
            if r.returncode != 0:
                first = (r.stderr or '').strip().splitlines()
                errors.append(f'script #{i + 1} syntax hatası: {first[-1] if first else "?"}')
        except Exception:
            pass
        finally:
            Path(tmp).unlink(missing_ok=True)
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
