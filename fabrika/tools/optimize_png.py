#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PNG küçültücü — PIL quantize (FASTOCTREE). Küçülmüyorsa orijinali döndürür."""
import base64
import io
from pathlib import Path

from PIL import Image


def optimize_png(path, colors=128):
    """PNG'yi paletli forma indirger; bayt olarak min(orijinal, quantize) döner."""
    orig = Path(path).read_bytes()
    try:
        img = Image.open(io.BytesIO(orig)).convert('RGBA')
        q = img.quantize(colors=colors, method=Image.FASTOCTREE)
        buf = io.BytesIO()
        q.save(buf, 'PNG', optimize=True)
        out = buf.getvalue()
        return out if len(out) < len(orig) else orig
    except Exception:
        return orig


def png_data_uri(path, colors=128):
    data = optimize_png(path, colors)
    return 'data:image/png;base64,' + base64.b64encode(data).decode('ascii')


if __name__ == '__main__':
    import sys
    for p in sys.argv[1:]:
        orig_kb = Path(p).stat().st_size / 1024
        new_kb = len(optimize_png(p)) / 1024
        print(f'{p}: {orig_kb:.0f} KB -> {new_kb:.0f} KB')
