#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fabrika ekran görüntüsü otomasyonu — Playwright.

Her oyun için 5 kare (1280×720) çeker: menü, erken oynanış, aksiyon,
özel an, bölüm-sonu/uzun-oynanış. dist/<oyun>/screenshots/ altına yazar.

Kullanım:
    python shoot.py [oyun-id ...]      # boşsa hepsi
Not: yerel sunucu http://localhost:8000 üzerinde çalışıyor olmalı
(repo kökünden `python -m http.server 8000`).
"""
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

FABRIKA = Path(__file__).resolve().parent.parent
BASE = 'http://localhost:8000/fabrika/build/'
W, H = 1280, 720


def shot(page, game, name):
    out = FABRIKA / 'dist' / game / 'screenshots' / f'{name}.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(out))
    print(f'   📸 {game}/{name}.png')


def hold_keys(page, keys, seconds, pattern=None):
    """Tuşları basılı tutarak süre geçir. pattern: [(keyset, dur), ...] döngüsü."""
    if pattern is None:
        pattern = [(keys, seconds)]
    t_end = time.time() + seconds
    while time.time() < t_end:
        for ks, dur in pattern:
            for k in ks:
                page.keyboard.down(k)
            page.wait_for_timeout(int(dur * 1000))
            for k in ks:
                page.keyboard.up(k)
            if time.time() >= t_end:
                break


def open_game(page, slug):
    page.goto(BASE + slug + '.html')
    page.wait_for_timeout(900)


# ---------- Grup A kabuk yardımcıları ----------
def shell_play(page):
    page.click('#shell-play')
    page.wait_for_timeout(300)


def shell_level(page, n=1):
    page.click(f'#shell-levels-grid .shell-lv:nth-child({n})')
    page.wait_for_timeout(300)


# ---------- Oyun senaryoları ----------
def sc_buz_kulesi(page):
    g = 'buz-kulesi'
    open_game(page, 'buz-kulesi-tr')
    shot(page, g, '1-menu')
    shell_play(page)
    page.wait_for_timeout(800)
    shot(page, g, '2-gameplay')
    hold_keys(page, None, 4, pattern=[(['ArrowRight', ' '], 0.35), (['ArrowLeft'], 0.3), ([' '], 0.2)])
    shot(page, g, '3-action')
    hold_keys(page, None, 3, pattern=[([' '], 0.25), (['ArrowRight', ' '], 0.3)])
    shot(page, g, '4-special')
    page.wait_for_timeout(14000)   # auto-scroll sonunda düşüş → game-over modalı
    shot(page, g, '5-gameover')


def sc_egim(page):
    g = 'egim'
    open_game(page, 'egim-tr')
    shot(page, g, '1-menu')
    shell_play(page)
    page.wait_for_timeout(2500)    # 3sn geri sayımın ortası
    shot(page, g, '2-countdown')
    page.wait_for_timeout(1500)
    hold_keys(page, None, 4, pattern=[(['ArrowLeft'], 0.5), (['ArrowRight'], 0.5), ([' '], 0.2)])
    shot(page, g, '3-action')
    hold_keys(page, None, 6, pattern=[(['ArrowRight'], 0.4), (['ArrowLeft'], 0.5), ([' '], 0.25)])
    shot(page, g, '4-special')
    page.wait_for_timeout(12000)   # girdisiz → engele çarpma olasılığı yüksek
    shot(page, g, '5-gameover')


def sc_blok_yagmuru(page):
    g = 'blok-yagmuru'
    open_game(page, 'blok-yagmuru-tr')
    shot(page, g, '1-menu')
    shell_play(page)
    page.wait_for_timeout(3600)    # geri sayım bitti, ilk parça düşüyor
    shot(page, g, '2-gameplay')
    hold_keys(page, None, 6, pattern=[(['ArrowLeft'], 0.2), (['ArrowUp'], 0.15), (['ArrowRight'], 0.2), (['ArrowDown'], 0.4)])
    shot(page, g, '3-action')
    for _ in range(14):            # hard-drop yağmuru → yığın yükselir
        page.keyboard.press(' ')
        page.wait_for_timeout(220)
    shot(page, g, '4-special')
    for _ in range(40):            # tepeye dayat → game-over
        page.keyboard.press(' ')
        page.wait_for_timeout(140)
    page.wait_for_timeout(1200)
    shot(page, g, '5-gameover')


def sc_penalti(page):
    g = 'penalti'
    open_game(page, 'penalti-tr')
    shot(page, g, '1-menu')
    shell_play(page)
    page.wait_for_timeout(400)
    shot(page, g, '2-levels')
    shell_level(page, 1)
    page.wait_for_timeout(600)
    shot(page, g, '3-pitch')
    page.click('.pen-target[data-zone="4"]', force=True)
    page.wait_for_timeout(1100)    # top ağda, GOL/KURTARDI yazısı ekranda
    shot(page, g, '4-goal')
    page.wait_for_timeout(2200)
    zones = ['0', '2', '6', '8', '4', '1']
    for z in zones:                # kalan şutlar → bölüm sonu
        try:
            page.click(f'.pen-target[data-zone="{z}"]', force=True, timeout=2500)
            page.wait_for_timeout(3400)
        except Exception:
            break
    page.wait_for_timeout(1800)
    shot(page, g, '5-complete')


def sc_zipla_topla(page):
    g = 'zipla-topla'
    open_game(page, 'zipla-topla-tr')
    shot(page, g, '1-menu')
    shell_play(page)
    page.wait_for_timeout(400)
    shot(page, g, '2-levels')
    shell_level(page, 1)
    page.wait_for_timeout(700)     # "Seviye 1 — Çayır" banner'ı ekranda
    shot(page, g, '3-banner')
    hold_keys(page, None, 4, pattern=[(['ArrowRight'], 0.8), (['ArrowRight', ' '], 0.35)])
    shot(page, g, '4-action')
    page.click('.zt-mode-btn[data-mode="coop"]')
    page.wait_for_timeout(800)
    hold_keys(page, None, 2, pattern=[(['ArrowRight', 'd'], 0.5)])
    shot(page, g, '5-coop')


def sc_zindan(page):
    g = 'zindan-okcusu'
    open_game(page, 'zindan-okcusu-tr')
    page.wait_for_timeout(600)
    shot(page, g, '1-hub')
    page.click('#goMapBtn')
    page.wait_for_timeout(500)
    shot(page, g, '2-map')
    page.click('#mapBack')
    page.wait_for_timeout(300)
    page.click('#goEquipBtn')
    page.wait_for_timeout(500)
    shot(page, g, '3-equip')
    page.click('#eqBack')
    page.wait_for_timeout(300)
    page.click('#goEndlessBtn')
    page.wait_for_timeout(2500)
    hold_keys(page, None, 3, pattern=[(['w', 'd'], 0.5), (['s', 'a'], 0.5)])
    shot(page, g, '4-combat')
    hold_keys(page, None, 9, pattern=[(['d'], 0.6), (['w'], 0.4), (['a'], 0.6), (['s'], 0.4)])
    shot(page, g, '5-wave')


def sc_ates_buz(page):
    g = 'ates-buz'
    open_game(page, 'ates-buz-tr')
    page.wait_for_timeout(1200)
    shot(page, g, '1-menu')
    page.mouse.click(560, 663)     # en alttaki (altın çerçeveli) 1. bölüm düğümü
    page.wait_for_timeout(3500)    # menü kayma animasyonu + bölüm kurulumu
    shot(page, g, '2-level1')
    hold_keys(page, None, 3, pattern=[(['ArrowRight'], 0.6), (['ArrowUp'], 0.3), (['d'], 0.5), (['w'], 0.3)])
    shot(page, g, '3-action')
    hold_keys(page, None, 5, pattern=[(['ArrowRight', 'd'], 0.7), (['ArrowUp', 'w'], 0.3), (['a'], 0.4)])
    shot(page, g, '4-coop')
    hold_keys(page, None, 5, pattern=[(['d'], 0.8), (['w'], 0.3), (['ArrowRight'], 0.6), (['ArrowUp'], 0.3)])
    shot(page, g, '5-progress')


def sc_math_archer(page):
    g = 'math-archer'
    open_game(page, 'matematik-okcusu-tr')
    page.wait_for_timeout(700)
    shot(page, g, '1-hub')
    page.evaluate("startEndless();")
    page.wait_for_timeout(2200)
    hold_keys(page, None, 2, pattern=[(['d'], 0.5), (['w'], 0.3)])
    page.evaluate("wave=3; startQuestionWave();")
    page.wait_for_timeout(600)
    shot(page, g, '2-soru-dalgasi')
    page.evaluate(
        "killEnemy(qWave.carriers.find(c=>c.qIdx===qWave.q.dogru_index));")
    page.wait_for_timeout(350)
    shot(page, g, '3-dogru')
    page.evaluate(
        "mode='stage'; stageIndex=4; dropPending=makeItem('silah','rare'); openChestQuestion(true,0,4);")
    page.wait_for_timeout(500)
    shot(page, g, '4-sandik')
    page.evaluate("answerChestQ(chestQ.q.dogru_index);")
    page.wait_for_timeout(700)
    shot(page, g, '5-sandik-dogru')


SCENARIOS = {
    'math-archer': sc_math_archer,
    'buz-kulesi': sc_buz_kulesi,
    'egim': sc_egim,
    'blok-yagmuru': sc_blok_yagmuru,
    'penalti': sc_penalti,
    'zipla-topla': sc_zipla_topla,
    'zindan-okcusu': sc_zindan,
    'ates-buz': sc_ates_buz,
}


def main():
    targets = sys.argv[1:] or list(SCENARIOS)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': W, 'height': H})
        for game in targets:
            fn = SCENARIOS.get(game)
            if not fn:
                print(f'[shoot] bilinmeyen oyun: {game}')
                continue
            print(f'[shoot] {game}')
            try:
                fn(page)
            except Exception as e:
                print(f'   [HATA] {game}: {e}')
        browser.close()
    print('Bitti.')


if __name__ == '__main__':
    main()
