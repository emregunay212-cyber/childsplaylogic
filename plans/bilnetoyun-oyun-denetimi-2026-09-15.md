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

## Durum — 16 Eyl 2026 gece: **TAMAMLANDI** — 57/57 oyun K1+K2 (online K2: kelime-tahmin ve harf-tahmin iki sekme), PR #34 merge (9bf8bbe). Kalan kararlar BULGULAR.md'de "karar" etiketli (kural tabanlı hile yüzeyi, bilgi-ciftligi tier metni, sonsuz oyunların yıldızı, satranç taşları self-host, ates-buz dokunmatik ikinci pad).

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
| 18 | Bulmaca | hafiza-kartlari | [x] | [x] | 0/2/0/1 | PR |
| 19 | Bulmaca | sekil-bulmaca | [x] | [x] | 0/1/1/1 | PR |
| 20 | Bulmaca | siralama | [x] | [x] | 0/1/1/1 | PR |
| 21 | Bulmaca | jigsaw | [x] | [x] | 0/2/0/0 | PR |
| 22 | Bulmaca | tetris | [x] | [x] | 0/1/2/0 (+1 şüpheli) | PR |
| 23 | Bulmaca | bilim-dedektifi (iframe) | [x] | [x] | 0/1/1/1 | PR |
| 24 | Bulmaca | eslestirme-ustasi (iframe) | [x] | [x] | 0/1/1/0 (+1 şüpheli) | PR |
| 25 | Bulmaca | labirent-avcisi (iframe) | [x] | [x] | 0/0/2/1 | — |
| 26 | Yaratıcılık | renk-eslestirme | [x] | [x] | 0/1/1/0 | PR |
| 27 | Yaratıcılık | boyama | [x] | [x] | 0/1/1/0 | PR |
| 28 | Yaratıcılık | tuval | [x] | [x] | 0/2/1/0 | PR |
| 29 | Yaratıcılık | sayilarla-boyama | [x] | [x] | 0/1/2/0 | PR |
| 30 | Yaratıcılık | emoji-yapici | [x] | [x] | 0/1/1/0 (+1 şüpheli) | PR |
| 31 | Strateji | kod-macerasi | [x] | [x] | 0/2/0/0 (+1 şüpheli) | PR |
| 32 | Strateji | lego-macerasi | [x] | [x] | 1/1/0/1 | PR |
| 33 | Strateji | lego-world | [x] | [x] | 0/2/3/1 (+1 şüpheli) | PR |
| 34 | Strateji | satranc | [x] | [x] | 0/1/1/2 | PR |
| 35 | Strateji | zipla-topla | [x] | [x] | 0/1/2/0 (+1 şüpheli) | PR |
| 36 | Strateji | space-waves | [x] | [x] | 0/0/2/0 (+1 şüpheli) | — |
| 37 | Strateji | egim | [x] | [x] | 0/0/2/0 | — |
| 38 | Strateji | buz-kulesi | [x] | [x] | 0/1/1/0 | PR |
| 39 | Strateji | penalti | [x] | [x] | 0/1/0/1 | PR |
| 40 | Strateji | zindan-okcusu (iframe) | [x] | [x] | 0/0/2/0 (+1 şüpheli) | — |
| 41 | Strateji | bil-ve-fethet (iframe) | [x] | [x] | 0/1/1/1 (+1 şüpheli) | PR |
| 42 | Strateji | bilgi-takimi (iframe) | [x] | [x] | 0/1/0/1 | PR |
| 43 | Strateji | bilgi-ciftligi (iframe) | [x] | [x] | 0/1 (karar)/0/0 (+1 şüpheli) | — |
| 44 | Strateji | bilgi-kulesi (iframe) | [x] | [x] | 0/1/1/0 (+1 şüpheli) | PR |
| 45 | Strateji | cevap-kosusu (iframe) | [x] | [x] | 0/0/0/2 | — |
| 46 | Strateji | bilgi-savunmasi (iframe) | [x] | [x] | 1/0/0/0 (+1 şüpheli) | PR |
| 47 | Strateji | fizik-firlatma (iframe) | [x] | [x] | 0/0/1/1 | — |
| 48 | Online | kelime-tahmin | [x] | [x] | 0/3 (2 altyapı)/1/0 | PR |
| 49 | Online | harf-tahmin | [x] | [ ] | 0/1/0/0 | PR |
| 50 | Online | kod-macerasi (mp) | [x] | [ ] | 0/1/0/0 (+1 şüpheli) | PR |
| 51 | Online | satranc (mp) | [x] | [ ] | 0/1/0/0 | PR |
| 52 | Online | penalti-mp | [x] | [ ] | 0/1 (karar)/0/0 | PR (altyapı) |
| 53 | Online | ates-buz (iframe) | [x] | [ ] | 0/1 (karar)/0/1 | — |
| 54 | Online | zipla-topla-coop | [x] | [ ] | 0/1/1/0 (+1 şüpheli) | PR |
| 55 | Online | hava-hokeyi (iframe) | [x] | [ ] | 0/1/0/0 (+2 şüpheli) | PR |
| 56 | Online | altin-avi | [x] | [ ] | 0/1 (karar)/1/1 | — |
| 57 | Online | kelimelik (iframe) | [x] | [ ] | 0/1 (karar)/1/0 | — |
| 58 | Online | son-kart (iframe) | [x] | [ ] | 0/1 (karar)/1/0 | — |

## Plan mutasyon protokolü
Bir oyun atlanır/bölünürse tabloya `[atlandı: gerekçe]`; kategori PR'ı merge olunca "Düzeltme" sütununa PR numarası; commit mesajı `docs(plan): …`.
