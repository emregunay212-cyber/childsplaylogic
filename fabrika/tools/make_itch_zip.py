#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""itch.io paketi üretir: build HTML'ini index.html adıyla zip'ler.

Kullanım: python make_itch_zip.py <build-dosyası> [çıktı-adı]
Boş çağrılırsa Math Archer TR+EN paketlerini üretir.
"""
import sys
import zipfile
from pathlib import Path

FABRIKA = Path(__file__).resolve().parent.parent
OUT = FABRIKA / 'dist' / 'itch'


def pack(build_name, zip_name):
    src = FABRIKA / 'build' / build_name
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / zip_name
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('index.html', src.read_text(encoding='utf-8'))
    kb = dst.stat().st_size // 1024
    print(f'   [OK] {dst.relative_to(FABRIKA)}  ({kb} KB)')


DEFAULT = [
    ('math-archer-en.html', 'math-archer-en-itch.zip'),
    ('matematik-okcusu-tr.html', 'matematik-okcusu-tr-itch.zip'),
]

if __name__ == '__main__':
    if len(sys.argv) > 1:
        build = sys.argv[1]
        name = sys.argv[2] if len(sys.argv) > 2 else build.replace('.html', '-itch.zip')
        pack(build, name)
    else:
        for b, n in DEFAULT:
            pack(b, n)
