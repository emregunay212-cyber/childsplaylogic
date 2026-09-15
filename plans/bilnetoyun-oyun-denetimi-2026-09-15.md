# Blueprint — Oyun Denetimi: kod + oynanış (15 Eyl 2026)

**Hedef:** 57 aktif oyunun her birinde (1) kod incelemesi, (2) canlı oynanış kontrolü; hataları bul, KRİTİK/YÜKSEK olanları düzelt.
**İstek:** "oyunları kontrol et, sırayla, kodlarında/oynanışta hata var mı bul, oyun oyun ilerle" (15 Eyl gece).
**Sıra:** `js/app.js` kayıt defteri sırası (Harfler → Sayılar → Bulmaca → Yaratıcılık → Strateji → Online). `comingSoon` (kelime-madeni-3d) atlanır.
**Envanter (Adım 0):** statik → `ecc:code-reviewer` (salt okunur, oyun mantığı odaklı istem) + `ecc:click-path-audit` yöntemi; canlı → `ecc:browser-qa` (misafir modu, üretimde salt okunur); düzeltme geçidi → Reality Checker + AI-Generated Code Security Auditor.

## Yöntem (her oyun için)
- **K1 statik:** modül `js/games/<slug>.js` (+ iframe oyunlarda `games/<slug>/index.html`, tek dosya). Motor sözleşmesi `js/engine.js`: `{id, levels[], init(gameArea, level, {onCorrect,onWrong,onComplete}), destroy()}`; `GameEngine.setTotal(n)`; `onComplete(customStars?)`; replay/nextLevel = destroy → init. iframe oyunlar hub'la konuşmaz, `window.storage` (localStorage) kullanır, yıldız vermez.
- **K2 canlı:** `https://bilnetoyun.com/?oyun=<slug>` misafir modu; konsol hatası; 2–3 etkileşim (doğru + yanlış cevap); ulaşılabiliyorsa seviye sonu (yıldız / Tekrar / Sonraki / hub'a dön); 375 px görünüm; hub'a dönüp yeniden açma (sızıntı/çift ses).
- **K3 kayıt:** aşağıdaki tablo + `docs/oyun-denetimi-2026-09-15/BULGULAR.md` (oyun başına bölüm, `[KRİTİK|YÜKSEK|ORTA|DÜŞÜK|ŞÜPHELİ] dosya:satır — sorun — senaryo — öneri`).
- **Düzeltme:** kategori bitince tek dal/PR (`fix/oyun-<kategori>`); KRİTİK/YÜKSEK zorunlu, ORTA/DÜŞÜK ucuzsa. CI (eslint + duman 60/60) + geçit yorumu → merge. Plan tablosu güncellenmeden sonraki kategoriye geçilmez.
- **Online (11):** en sonda, iki sekme ile; Firebase yazmaları misafir takma adla (gerçek çocuk verisi yok).

## Durum tablosu
Sütunlar: K1 statik · K2 canlı · bulgu sayısı K/Y/O/D · düzeltme

| # | Kategori | Oyun | K1 | K2 | K/Y/O/D | Düzeltme |
|---|---|---|---|---|---|---|
| 1 | Harfler | harf-tanima | [x] | [x] | 0/1/1/2 (+sistem 2Y) | PR (kategori 1) |
| 2 | Harfler | hece-birlestirme | [x] | [x] | 1/1/0/1 | PR (kategori 1) |
| 3 | Harfler | kelime-madeni-3d | atlandı (comingSoon) | — | | |
| 4 | Harfler | kelime-balonu (iframe) | [x] | [x] | 0/0/3/3 (+2 şüpheli) | — |
| 5 | Harfler | kelime-canavarlari (iframe) | [x] | [x] | 0/0/1/2 (+1 şüpheli) | — |
| 6 | Harfler | kelime-kurtarma (iframe) | [x] | [x] | 1/1/2/1 | PR (kategori 1) |
| 7 | Harfler | gunluk-kelime (iframe) | [x] | [x] | 2/0/1/1 | PR (kategori 1) |
| 8 | Sayılar | sayi-sayma | [x] | [x] | 0/1/1/0 | PR (kategori 1-2) |
| 9 | Sayılar | matematik | [x] | [x] | 0/0/2/0 | PR (kategori 1-2) |
| 10 | Sayılar | desen | [x] | [x] | 0/0/2/1 | PR (kategori 1-2) |
| 11 | Sayılar | bilgi-madencisi (iframe) | [x] | [x] | 0/0/2/1 (+1 şüpheli) | — |
| 12 | Sayılar | matematik-patlatma (iframe) | [x] | [x] | 0/1/1/0 (+1 şüpheli) | PR (kategori 1-2) |
| 13 | Sayılar | matematik-kafe (iframe) | [x] | [x] | 0/0/0/2 | — |
| 14 | Sayılar | bilgi-yilani (iframe) | [x] | [x] | 0/1/1/1 (+1 şüpheli) | PR (kategori 1-2) |
| 15 | Sayılar | ritim-sorulari (iframe) | [x] | [x] | 1/0/1/0 (+1 şüpheli) | PR (kategori 1-2) |
| 16 | Sayılar | kesir-2048 (iframe) | [x] | [x] | 0/1/2/1 | PR (kategori 1-2) |
| 17 | Sayılar | sayi-ninja (iframe) | [x] | [x] | 0/1/1/1 | PR (kategori 1-2) |
| 18 | Bulmaca | hafiza-kartlari | [ ] | [ ] | | |
| 19 | Bulmaca | sekil-bulmaca | [ ] | [ ] | | |
| 20 | Bulmaca | siralama | [ ] | [ ] | | |
| 21 | Bulmaca | jigsaw | [ ] | [ ] | | |
| 22 | Bulmaca | tetris | [ ] | [ ] | | |
| 23 | Bulmaca | bilim-dedektifi (iframe) | [ ] | [ ] | | |
| 24 | Bulmaca | eslestirme-ustasi (iframe) | [ ] | [ ] | | |
| 25 | Bulmaca | labirent-avcisi (iframe) | [ ] | [ ] | | |
| 26 | Yaratıcılık | renk-eslestirme | [ ] | [ ] | | |
| 27 | Yaratıcılık | boyama | [ ] | [ ] | | |
| 28 | Yaratıcılık | tuval | [ ] | [ ] | | |
| 29 | Yaratıcılık | sayilarla-boyama | [ ] | [ ] | | |
| 30 | Yaratıcılık | emoji-yapici | [ ] | [ ] | | |
| 31 | Strateji | kod-macerasi | [ ] | [ ] | | |
| 32 | Strateji | lego-macerasi | [ ] | [ ] | | |
| 33 | Strateji | lego-world | [ ] | [ ] | | |
| 34 | Strateji | satranc | [ ] | [ ] | | |
| 35 | Strateji | zipla-topla | [ ] | [ ] | | |
| 36 | Strateji | space-waves | [ ] | [ ] | | |
| 37 | Strateji | egim | [ ] | [ ] | | |
| 38 | Strateji | buz-kulesi | [ ] | [ ] | | |
| 39 | Strateji | penalti | [ ] | [ ] | | |
| 40 | Strateji | zindan-okcusu (iframe) | [ ] | [ ] | | |
| 41 | Strateji | bil-ve-fethet (iframe) | [ ] | [ ] | | |
| 42 | Strateji | bilgi-takimi (iframe) | [ ] | [ ] | | |
| 43 | Strateji | bilgi-ciftligi (iframe) | [ ] | [ ] | | |
| 44 | Strateji | bilgi-kulesi (iframe) | [ ] | [ ] | | |
| 45 | Strateji | cevap-kosusu (iframe) | [ ] | [ ] | | |
| 46 | Strateji | bilgi-savunmasi (iframe) | [ ] | [ ] | | |
| 47 | Strateji | fizik-firlatma (iframe) | [ ] | [ ] | | |
| 48 | Online | kelime-tahmin | [ ] | [ ] | | |
| 49 | Online | harf-tahmin | [ ] | [ ] | | |
| 50 | Online | kod-macerasi (mp) | [ ] | [ ] | | |
| 51 | Online | satranc (mp) | [ ] | [ ] | | |
| 52 | Online | penalti-mp | [ ] | [ ] | | |
| 53 | Online | ates-buz (iframe) | [ ] | [ ] | | |
| 54 | Online | zipla-topla-coop | [ ] | [ ] | | |
| 55 | Online | hava-hokeyi (iframe) | [ ] | [ ] | | |
| 56 | Online | altin-avi | [ ] | [ ] | | |
| 57 | Online | kelimelik (iframe) | [ ] | [ ] | | |
| 58 | Online | son-kart (iframe) | [ ] | [ ] | | |

## Plan mutasyon protokolü
Bir oyun atlanır/bölünürse tabloya `[atlandı: gerekçe]`; kategori PR'ı merge olunca "Düzeltme" sütununa PR numarası; commit mesajı `docs(plan): …`.
