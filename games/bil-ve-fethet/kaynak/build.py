#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kaynak dosyalardan oynanabilir oyunu üretir.
   Kullanım: kaynak/ klasöründe `python build.py`
   game_template.html + gamedata.json + questionbank.js → ../index.html

   KURAL: ../index.html elle DÜZENLENMEZ — tüm kod değişiklikleri
   game_template.html'e yapılır ve bu script ile yeniden üretilir."""
import os


def build() -> None:
    data = open('gamedata.json', encoding='utf-8').read()
    bank = open('questionbank.js', encoding='utf-8').read()
    tpl = open('game_template.html', encoding='utf-8').read()
    out = tpl.replace('__GAMEDATA__', data).replace('__QUESTIONBANK__', bank)

    dst = os.path.join('..', 'index.html')
    open(dst, 'w', encoding='utf-8').write(out)
    # Not: Windows konsolu cp1254 olabilir — ASCII-disi karakter kullanma
    print(f"OK: {os.path.abspath(dst)} uretildi ({os.path.getsize(dst)//1024} KB)")


if __name__ == '__main__':
    build()
