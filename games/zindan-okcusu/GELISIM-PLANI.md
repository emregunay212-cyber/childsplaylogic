# Zindan Okçusu — Roguelite Gelişim Planı

> Amaç: Zindan Okçusu'nu, türün en iyilerinden (Vampire Survivors, Archero, Brotato, Halls of Torment, Survivor.io) öğrenilen **yetenek çeşitliliği, gelişim evreleri ve tasarım derinliği** ile tam bir survivor-roguelite'a evirmek. Mevcut sağlam temeli **yıkmadan, üzerine cerrahi eklemelerle**.

---

## 0. TL;DR

Oyunun çekirdeği zaten güçlü (otomatik atış + seviye-yetenek + fusion + ekipman + sahne/sonsuz + boss + enrage). Eksik olan **derinlik, çeşitlilik ve koşular-arası meta hedefler**. Plan 4 faza bölünür:

- **Faz A — Hızlı kazanımlar:** seçim araçları (banish/skip), yeni yetenekler, elite/affix düşmanlar, melek/şeytan odaları.
- **Faz B — Build derinliği:** gerçek "evrim" sistemi (katalizör + boss-sandığı), yeni silahlar, telegraflı boss fazları.
- **Faz C — Meta gelişim:** kalıcı **Yetenek Ağacı**, **Kahraman seçimi**, set bonusları.
- **Faz D — Uzun vade:** **Zorluk katmanları (Kabus/Yükseliş / NG+)**, evcil/yoldaş, günlük görev.

Her faz **tek başına yayınlanabilir** (oyun her zaman oynanır kalır).

---

## 1. Mevcut Sistemler (sahip olduğumuz temel)

Kaynak: `games/zindan-okcusu/index.html`

- **Stat modeli (`makePlayer` ~L693, `computeLoadout` ~L506):** dmg, fireInterval, arrowSpeed/size, front/side/diag/rear, pierce, chainBounce, wallBounce, crit/critDmg, def, moveSpeed, hp/maxHp, magnetR, orbs, lightning, aura, melee (dmg/interval/range), goldBonus/xpBonus, berserk metre, son-nefes.
- **Seviye sistemi (`openLevelUp`/`renderLevelCards` ~L1869):** 3 kart, ≥1 aktif + ≥1 pasif garantisi, **tek reroll**, %9 "Kader Çarkı".
- **Yetenekler (`UPGRADES` ~L1721):** 19 aktif + 17 pasif = 36 yetenek. Aktif slot limiti **5** (`MAX_SKILL_SLOTS`). Dışlayan gruplar (arrowDir, arrowBounce).
- **Fusion (`FUSIONS` ~L1768):** 10 birleşim, her biri 2 varyant. İki bileşen cap'e ulaşınca açılır; bir aktif slotu boşaltır (`fusedAway`).
- **Meta (`save` ~L410):** gold, chapterProgress, **5 slotlu ekipman** (silah/zırh/yüzük/bot/tılsım), 2 varyant, common→mythic, upgrade/sell. `bestEndless`.
- **Sandıklar (`CHESTS` ~L471):** ahşap/gümüş/altın, ağırlıklı rarity. Boss item düşürür.
- **Koşu yapısı:** Sahne modu (4 bölge × 5 sahne, 5.'de boss) + Sonsuz (17sn dalga, her 5 dalgada boss). Zorluk formülleri + **enrage** (AFK cezası).
- **Düşmanlar (`enemyStats` ~L713):** swarm, chaser, shooter, tank, dasher, splitter, bomber, healer, boss (4 tür). **Sprite sistemi (`ESPR`/`drawESPR`)** çoğu düşman + 3 boss için eklendi.
- **His/efekt:** sfx (13 ses), burst/partikül, shake, flashV, nova/pNova, bolt zincirleri, hasar sayıları, lich çağırma çemberi.

**Çıkarım:** Çekirdek mekanikler güçlü. Asıl fırsat → **çeşitlilik (yeni silah/yetenek/düşman), gerçek evrim, ve koşular-arası kalıcı hedefler.**

---

## 2. Tür Analizi — Ne Öğrendik

### Vampire Survivors
- **Evrim (Evolution):** Bir silahı max sev. + **katalizör pasif** + **10. dakikadan sonra boss sandığı** → evrimleşmiş güçlü silah. ([wiki](https://vampire.survivors.wiki/w/Evolution))
- **Union:** İki silahı birleştirip slot boşaltma (bizim "fusion" buna yakın).
- **Pasif eşya slotları**, eşyalar evrimde tüketilir, tekrar alınabilir. ([passives](https://vampire.survivors.wiki/w/Passive_items))
- **Seçim araçları:** Reroll, **Skip** (atla, altın/XP ver), **Banish** (bir yeteneği havuzdan kalıcı çıkar), **Seal**.
- **Arcana kartları:** koşuyu kökten değiştiren güçlü modifikatörler.

### Archero (bizim türümüze en yakın — zindan okçusu)
- Her seviye **3 yetenekten 1 seçim**; bölüm başında "Glory" ile 1 bonus yetenek. ([guide](https://www.androidauthority.com/archero-guide-heroes-abilities-1086651/))
- **Melek / Şeytan / Şans Çarkı odaları:** Melek = şifa/yetenek; **Şeytan = max can karşılığı güç**; çark = kumar. (Bizde sadece %9 çark var.)
- **Kalıcı Talent (Yetenek) ağacı:** altınla alınan, **her koşuda geçerli** kalıcı statlar — ilerlemenin bel kemiği. ([mrguider](https://www.mrguider.org/articles/archero-tier-list/))
- **Kahraman seçimi**, **evcil hayvan**, ekipman rarity + synergy.
- Yetenek-silah **sinerjisi** (ör. zaten delici olan silaha delici eklemek israf).

### Brotato / Halls of Torment / Survivor.io
- **Dalga-arası dükkân** (koşu içinde altın harca), **karakter modifikatörleri** (artı/eksi).
- **Elite/affix düşmanlar** (özel yetenekli, ödüllü), **şampiyon** dalgalar.
- **Lanetler/zorluk katmanları:** zorluğu artır → ödülü artır (uzun vadeli hedef).

### Ortak "gelişim evreleri" deseni
1. **Koşu-içi güç eğrisi:** çekirdek → kimlik → evrim/sıçrama → zirve.
2. **Koşular-arası meta:** ekipman → kalıcı yetenek ağacı → kahraman/pet → zorluk katmanları.

---

## 3. Eksikler / Fırsatlar (mevcut ↔ tür)

| Özellik | Türde | Bizde | Aksiyon |
|---|---|---|---|
| Seviye seçim araçları | Reroll+Skip+Banish | Sadece reroll | **Banish + Skip ekle** (Faz A) |
| Yetenek çeşitliliği | 20-50+ | 36 (iyi) | ~8-12 yeni silah/yetenek (Faz A/B) |
| Gerçek evrim | Katalizör+boss sandığı | Fusion (cap+cap) | **Evrim katmanı ekle** (Faz B) |
| Melek/Şeytan odaları | Var | Sadece çark | **3 oda tipi** (Faz A) |
| Elite/affix düşman | Var | Yok | **Affix sistemi** (Faz A) |
| Telegraflı boss | Var | Kısmi | **Saldırı işareti + faz** (Faz B) |
| Kalıcı yetenek ağacı | Çekirdek | Yok (sadece ekipman) | **Talent ağacı** (Faz C) |
| Kahraman seçimi | Var | Tek karakter | **3-5 kahraman** (Faz C) |
| Set bonusları | Var | Yok | **Ekipman setleri** (Faz C) |
| Evcil/yoldaş | Var | Yok | **Pet** (Faz D) |
| Zorluk katmanları | Var | Sadece enrage | **Kabus/Yükseliş NG+** (Faz D) |
| Dalga-arası dükkân | Var (Brotato) | Yok (sadece hub) | Opsiyonel (Faz D) |

---

## 4. Önerilen Sistemler (detaylı)

> Her madde: **Ne / Neden / Nasıl (kod kancası) / Efor (S-M-L) / Başarı ölçütü**

### 4.1 Yeni silahlar & yetenekler — `UPGRADES`'e ekle  (Efor: M)
Tür sinerjisini artıran yeni **aktif** seçenekler:
- **Bumerang Ok** — geri dönen ok (gidiş+dönüş hasarı). Yeni `pProj` tipi (`boomerang:true`, dönüş ivmesi).
- **Takipçi Mermi (homing)** — en yakın düşmana kıvrılan mermi. `pr.homing` (her kare hedefe doğru aç düzelt).
- **Saw/Testere Halkası** — `orbs` görselini testereye çevir + büyük varyant (orb evrimi).
- **Kutsal Zemin (holy ground)** — periyodik yere hasar havuzu (mevcut `slowZones` altyapısını **aktif hasara** çevir).
- **Şimşek Fırtınası** — `lightning`'in alan-vuruşlu üst hali (rastgele yıldırım yağmuru).
- **Mızrak/Delgi Atışı** — düz, yüksek delici, yavaş büyük mermi.
- **Bomba Oku** — çarpınca küçük patlama (mevcut bomber patlama efektini oyuncuya ver).
- **Pasifler:** **Cooldown** (tüm yetenek süreleri ↓), **Alan** (tüm efekt yarıçapı ↑), **Süre** (havuz/aura süresi ↑), **Şans/Luck** (rare kart + crit), **Büyüme** (zamanla dmg artar), **Lanet** (daha çok düşman + daha çok XP/altın).
- **Nasıl:** Çoğu = yeni `UPGRADES` girdisi + `update()` içinde küçük davranış blokları (mevcut orbs/aura/lightning kalıplarını taklit et). Yeni mermi tipleri `pProj` döngüsüne bayrak.
- **Başarı ölçütü:** En az 3 farklı "build kimliği" (delici / element / orbit/alan / melee) tatmin edici şekilde oynanabilir; her yeni yetenek bir testte görünür etki yapıyor.

### 4.2 Gerçek Evrim Sistemi (katalizör + boss-sandığı)  (Efor: M)
- **Ne:** Bir aktif yetenek **cap**'e ulaşır + uygun **pasif katalizör** sahipken **boss öldürünce** "evrim sandığı" düşer → o yeteneğin **evrimleşmiş** üst formu.
- **Neden:** Fusion "iki aktifi cap'le" gerektiriyor; evrim **aktif+pasif** sinerjisini ödüllendirir (VS deseni) ve boss'a anlam katar.
- **Nasıl:** `EVOLUTIONS=[{base, catalyst, result, apply}]`. Boss `killEnemy` içinde: uygun evrim varsa normal item yerine evrim sandığı bırak; açılınca `apply(player)`. Mevcut `fusedAway`/`picks` mantığını yeniden kullan.
- **Başarı ölçütü:** Boss'tan sonra net bir "güç sıçraması" hissi; en az 6 evrim çifti.

### 4.3 Seviye Seçim Araçları: Banish + Skip (+Seal)  (Efor: S)
- **Banish:** Bir kartı **bu koşu boyunca havuzdan kalıcı çıkar** (istemediğin yetenekleri ele).
- **Skip:** Seçmeyi atla → **+altın/+küçük XP** (Brotato/VS deseni).
- **Seal/Lock:** Bir kartı sonraki seviyeye sabitle (opsiyonel).
- **Nasıl:** `renderLevelCards` UI'sine 2 küçük buton; `banished` Set + `rollUpgrades` filtresi; skip → `chooseFallback` benzeri.
- **Başarı ölçütü:** Oyuncu build'ini yönlendirebiliyor; istenmeyen kart sıklığı düşüyor.

### 4.4 Melek / Şeytan / Çark Odaları (Archero)  (Efor: M)
- **Melek:** sahne/dalga arası — ücretsiz şifa **veya** 1 yetenek seç.
- **Şeytan:** **max can −%X karşılığı** güçlü yetenek/2 yetenek (risk-ödül).
- **Çark:** mevcut "Kader Çarkı"nı bağımsız odaya çevir.
- **Nasıl:** Sahne modunda boss-olmayan oda sonunda %şansla oda kartı; yeni `state` overlay'i (mevcut levelup overlay kalıbı). Sonsuzda her N dalgada.
- **Başarı ölçütü:** Koşuya karar anları katıyor; şeytan pazarlığı "kötü ama cazip" hissettiriyor.

### 4.5 Elite / Affix Düşmanlar + Şampiyon dalgalar  (Efor: M)
- **Ne:** Bazı düşmanlar rastgele **affix** ile doğar: *kalkanlı, hızlı, patlayan, bölünen, ışınlanan, aurası olan, zırhlı*. Görsel işaret (renk/parıltı) + **garantili ödül** (gem/altın/şifa).
- **Neden:** Tekdüzeliği kırar, "mini-hedef" yaratır (roguelite olmazsa olmazı).
- **Nasıl:** `spawnEnemy`'de `e.affixes=[]`; `update`/`draw`/`damageEnemy` içinde küçük dallar; elite = +HP +boyut + parıltı + drop.
- **Başarı ölçütü:** Her dalgada 0-2 elite; öldürmek tatmin edici ve ödüllü.

### 4.6 META — Kalıcı Yetenek Ağacı (Talents)  (Efor: L)
- **Ne:** Hub'da altınla alınan **kalıcı** statlar: +dmg%, +maxHP, +hız, +crit, +başlangıç yeteneği (Archero "Glory"), +reroll, +banish, +şans, +altın/XP, +revival(ekstra can).
- **Neden:** **Koşular-arası ilerlemenin bel kemiği.** "Bir sonraki koşuda daha güçlü" hissi = elde tutma.
- **Nasıl:** `save.talents={id:level}`; `computeLoadout`/`makePlayer` bunları uygula. Hub'da yeni sekme (renderHub kalıbı). Maliyet üstel.
- **Başarı ölçütü:** İlk 30 dk'da net güçlenme eğrisi; ölünce bile "ağaca yatırım yaptım" hissi.

### 4.7 META — Kahraman Seçimi  (Efor: M)
- **Ne:** 3-5 başlangıç kahramanı; her biri farklı **başlangıç silahı/pasif + artı/eksi** (ör. "Nişancı: +crit, −can", "Muhafız: +can/def, −atış hızı", "Elementalist: aura ile başlar").
- **Nasıl:** `HEROES=[{id, start, mods, unlockCost}]`; `startChapter/startEndless` kahramana göre `computeLoadout`'u tohumlar. Kilit = altın/başarım.
- **Başarı ölçütü:** En az 3 belirgin farklı oynanış; tekrar oynanırlık artışı.

### 4.8 META — Ekipman Setleri + derinlik  (Efor: S-M)
- **Ne:** 2/4 parça **set bonusu** (ör. "Avcı Seti 2: +%15 atış hızı; 4: oklar 1 sekme"). Reforge/yeniden döküm opsiyonu.
- **Nasıl:** itemlere `set` alanı; `computeLoadout`'ta sayım + bonus.
- **Başarı ölçütü:** Ekipmanda "hedefli toplama" doğuyor (sadece rarity değil).

### 4.9 META — Evcil / Yoldaş  (Efor: M)
- **Ne:** Pasif yardımcı (otomatik küçük atış / gem toplama / ara sıra şifa). Seçilebilir, yükseltilebilir.
- **Nasıl:** Oyuncuya bağlı ikinci varlık; basit AI (orbit/follow + atış).
- **Başarı ölçütü:** Hissedilir ama dengeyi bozmayan destek.

### 4.10 Zorluk Katmanları (Kabus / Yükseliş — NG+)  (Efor: M)
- **Ne:** Bölümü/sonsuzu bitirenler için **+zorluk katmanı**: düşman güçlü ama **ödül/altın ×kat** + özel rozet. İstege bağlı **lanet yığma** (her lanet +zorluk +ödül).
- **Neden:** Endgame hedefi; "bitirdim" sonrası devam sebebi.
- **Nasıl:** `save.ascension`; zorluk knob'una çarpan; ödül çarpanı; UI'da seçim.
- **Başarı ölçütü:** İleri oyuncular için aylarca sürecek dikey hedef.

---

## 5. GELİŞİM EVRELERİ (özellikle istenen)

### 5.A — Tek koşu içi güç eğrisi
| Faz | Aralık | His | Destekleyen mekanik |
|---|---|---|---|
| **0 · Çekirdek** | Lv 1-5 | Hayatta kal, temel silah | Net başlangıç, ilk 3 seçim build yönünü açar |
| **1 · Kimlik** | Lv 6-12 | "Build'im şu" | Build-arketipleri (4.1), elite hedefler (4.5), banish ile yönlendirme (4.3) |
| **2 · Evrim/Sıçrama** | ilk boss / Lv 13-20 | Güç patlaması | **Evrim sandığı** (4.2), fusion, melek/şeytan (4.4) |
| **3 · Zirve** | Lv 20+ | Ekran temizleme + boss DPS | Tam build, enrage/curse dengesi, telegraflı boss (Faz B) |

### 5.B — Koşular-arası meta aşamalar
1. **Ekipman** (var) → set bonusları (4.8).
2. **Kalıcı Yetenek Ağacı** (4.6) — ana ilerleme.
3. **Kahraman & Pet** (4.7, 4.9) — çeşitlilik.
4. **Zorluk Katmanları** (4.10) — sonsuz dikey hedef.

### 5.C — Yeni oyuncu yolculuğu (onboarding → ustalık)
- İlk koşu: basit, 1-2 yetenek, hızlı ödül. → Bölüm 1 bitir, ekipman/talent tat. → Build çeşitliliği keşfi → Kahraman aç → Kabus katmanlarına tırman.

---

## 6. Tasarım & His (juice)

- **Boss telegrafı:** saldırı öncesi yer işareti/yanıp sönme + **faz geçişi** (%50 canda yeni saldırı) — lich çağırma çemberi bunun ilk örneği.
- **Biome kimliği:** her bölge farklı zemin paleti + atmosfer + düşman karışımı + müzik tonu.
- **Build paneli / evrim önizleme:** mevcut yetenekleri ve "neye evrilir" ipucunu gösteren küçük UI.
- **Seçim feedback'i:** kart hover'da stat farkı, nadir kartlarda ışıltı/ses.
- **Power-spike juice:** evrim/fusion anında ekran dalgası + ses + yavaşlatma (mevcut shake/flashV/pNova ile).
- **Galeri/Bestiary** (zaten yapıldı: `canavarlar.html`) → ileride yetenek/evrim galerisi de.

---

## 7. Fazlı Uygulama Yol Haritası

> Her faz **yayınlanabilir** ve **doğrulanır** (preview kanalı + oynanış testi).

### Faz A — Hızlı kazanımlar (en yüksek değer/efor)
1. Seçim araçları: **Banish + Skip** (4.3)
2. **+6-8 yeni yetenek** (4.1'in ilk yarısı)
3. **Elite/affix düşmanlar** (4.5)
4. **Melek/Şeytan/Çark odaları** (4.4)
- **Doğrula:** bir koşuda banish kullan, elite öldür, şeytan pazarlığı yap; denge kontrolü.

### Faz B — Build derinliği
5. **Gerçek Evrim sistemi** (4.2) + evrim sandığı
6. Kalan **yeni silahlar** (homing, holy ground, saw) (4.1)
7. **Telegraflı boss fazları** (6)
- **Doğrula:** boss sonrası evrim alıp güç sıçraması; her boss farklı telegraf.

### Faz C — Meta gelişim
8. **Kalıcı Yetenek Ağacı** (4.6)
9. **Kahraman seçimi** (4.7)
10. **Set bonusları** (4.8)
- **Doğrula:** ölüm sonrası talent al → sonraki koşu hissedilir güçlü; 3 kahraman farklı oynanıyor.

### Faz D — Uzun vade
11. **Zorluk katmanları (Kabus/Yükseliş)** (4.10)
12. **Evcil/Yoldaş** (4.9)
13. (Ops.) dalga-arası dükkân, günlük görev, başarımlar
- **Doğrula:** endgame oyuncusu için tırmanılacak hedef var.

---

## 8. Riskler / İlkeler / Denge

- **Canlı oyun & kilit:** Zindan Okçusu canlı ve yıldız-kilitli. Her faz geriye uyumlu; kayıt (`save`) şeması ekleme-dostu olmalı (eski kayıtlar bozulmasın → alanları varsayılanla doldur).
- **Mobil performans:** yeni mermi/efektler partikül/efekt bütçesini aşmasın (mevcut cap'leri koru).
- **Denge:** her yeni güç için düşman/zorluk tarafında karşılık; cap'ler ve soft-cap formülleri korunur. Yeni yetenekler **build kimliğini** güçlendirsin, hepsini-al olmasın.
- **Cerrahi değişiklik:** Mevcut `UPGRADES/FUSIONS/computeLoadout/CHESTS/enemyStats` desenlerini taklit et; tek dev refactor yerine küçük eklemeler.
- **Kapsam:** "hepsini-al" tuzağına düşme; her faz net başarı ölçütüyle bitince sonrakine geç.

---

## 9. Yetenek Denetimi (2026-06-09) — bulgular & yapılanlar

36 yetenek + 10 fusion incelendi (gerçek `apply` sayıları + `hurtPlayer`/`computeLoadout` ile). Çekirdek dengeli; net sorunlar:

**Ölü/bozuk → DÜZELTİLDİ:**
- `vampire` (★Kan Emici): `req: healOnKill>0` ama can-çalma kaldırılmış → asla gelmiyordu. **Kaldırıldı.**
- `fz_vamp_shadow` (Kanlı Gölge): `need:['crit','lifekill']`, lifekill yok → ulaşılamaz. **Kaldırıldı.**
- `fz_storm_volley` (Fırtına Yaylımı): `need:['as','dmg']` = berserk ile birebir → `renderLevelCards` hep `fus[0]`=berserk gösteriyor, as/dmg fusedAway olunca storm asla gelmiyordu (ölü). **`need:['big','spd']` yapıldı → artık ulaşılır**, üstelik zayıf big/spd'ye amaç verdi.

**Savunma boşluğu → DÜZELTİLDİ:** Tüm "savunma" sadece maks-can / heal / hız + ekipman def'ti; **hasar-azaltma, kaçınma, yenilenme YOKTU** (oyuncu doğrulaması: "hiç savunma yeteneği yok" — haklı). Tür standardı: VS (armor/regen/Laurel-invuln), Archero (dodge/revive/holy-touch), Brotato (armor/dodge/regen). **3 pasif eklendi:** Zırh (Savunma +%5, cap5), Sıçrama (dodge %6, cap4), Yenilenme (+1.2 HP/sn, cap4). Pasif → slot yemez, her zaman seçilebilir; `hurtPlayer`'a dodge, `update`'e regen bağlandı.

**Zayıf/gereksiz → ÖNERİ (dokunulmadı, senin kararın):**
- `big` (+%15 dmg) = `dmg`'in zayıf kopyası, kimliksiz → knockback/sersemletme kimliği önerilir.
- `spd` (ok hızı) düşük etkili; `ricochet` (duvar sekme) açık alanda `bounce`'a göre tuzak.
- `izci` 2. seçim front-capli → sadece +%10 dmg.

**OP / erken-güç → ÖNERİ:** En güçlü çarpımsal hasar (Güç/Cengaver/Cam Top) 1. seviyeden eşit ağırlıkla geliyor. Türde erken güç normaldir ama büyük sıçramalar (evrim) geç gelir; fusion'lar zaten cap-gated. Savunma artık rakip olduğundan "hepsi-saldırı" zorunluluğu azaldı. İstenirse pür-dmg kartların erken ağırlığı hafif düşürülür / seviye-eşiği eklenir (mevcut tuninge dokunmadım).

**Fusion çakışmaları → BİLGİ (kasıtlı sayılır):** marks↔arrow (pierce), elem↔inferno (light), inferno↔incendiary (aura) birbirini dışlıyor = build-yolu seçimi; sorun değil. Sadece storm/berserk çakışması bozuktu (düzeltildi).

## 10. Can-yenileme & Ekipman analizi (2026-06-09)

**(b) zayıf yetenekler — DÜZELTİLDİ:** Ağır Ok = artık hasar +%12 + **geri itme (knockback)** + büyük ok (kimlik kazandı, `p.knockback` ok-vuruşunda uygulanır; boss bağışık, tank az). Hızlı Ok = ok hızı +%26 + hafif büyüme. Duvar Sektirici = +1 sekme **ve +%10 hasar** (tuzak olmaktan çıktı). İzci = ok doluyken +%16 hasar (boşa gitmiyor).

**Regen (ölümsüzlük riski) — analiz + çözüm:** Ham regen 1.2/sn × cap4 = 4.8/sn. **Risk:** max savunma (def hard-cap 0.85 → gelen hasar %15) + regen, bir boss'un ~34/sn temas hasarını ~5/sn'ye indirip regen'le sıfırlayarak **face-tank ölümsüzlüğü** yaratabilirdi. **Çözüm:** regen artık **son 1.5sn hasar almadıysan** işler (`regenLock`, `hurtPlayer`'da 1.5s kurulur, `update`'te azalır). Temas aralığı (~0.7s, invuln) < 1.5s → tank'larken regen ASLA tiklemez; yalnız kaçarken/dalga aralarında iyileşir. Ek güvenceler zaten var (def cap 0.85 + enrage true-damage). → regen toparlanma aracı, ölümsüzlük motoru değil.

**Ekipman — analiz:** stat = `rarity.mult(1→5) × (1+0.15×(sv−1))`; taban dmg 9, mitik sv-yüksek silah +50–58 dmg → güç ağırlıklı ekipmandan gelir (in-run çarpanları bunu büyütür).
- **Erken aşırı-güç engeli — YAPILDI:** item seviyesi artık **bölümle tavanlı** — `maxItemLevel()=3+chapterProgress*3` (B1→3, B2→6, B3→9, B4→12); `doUpgrade` ve buton buna saygı duyar. Sandıklar zaten bölüm-kilitli (reqCh, rarity gating). Oyuncu bölüm ilerletmeden tek item'i "tanrı" yapamaz.
- **Ekipman-bağımlı güç — ÖNERİ (yapılmadı, onay bekler):** "kombinasyon ne kadar iyi olsa da ekipmansız çok ilerleyememe" için: (a) geç-bölüm düşman HP ölçeğini biraz dikleştir (gear flat-dmg duvarı gerektirsin) ve/veya (b) tabanı bir miktar düşürüp gear katkısını artır. Canlı dengeyi etkiler → senin kararınla.

## 11. Otonom gece inşası — DURUM (2026-06-09)

Hepsi PREVIEW kanalında, **eval ile doğrulandı** (smoke + entegrasyon), **canlıya ALINMADI**. Her özellik prosedürel/önceki sisteme dokunmadan, fallback'li eklendi.

**✅ Faz A — TAMAM:**
- Banish (koşuda 3 hak, yeteneği havuzdan çıkar) + Skip (atla → +altın/şifa).
- Savunma hattı: Zırh (def), Sıçrama (dodge), Yenilenme (regen — son 1.5s hasar yoksa, tank-heal ölümsüzlüğü kapalı).
- 3 yeni silah: **Testere Halkası** (geniş dönen bıçak), **Takipçi Mermi** (homing füze), **Kutsal Zemin** (hasarlı alan).
- **Elite/affix düşmanlar**: zırhlı (−%45 hasar) / hızlı / dev (mini-boss) / patlayan — renkli halka + can barı + garantili ödül.
- **Melek/Şeytan/Çark** kartları (level-up'ta düşük şans): Melek=tam can+kalıcı, Şeytan=güç↔can pazarlığı, Çark=kumar.

**✅ Faz C (çekirdek) — TAMAM:**
- **Kalıcı Yetenek Ağacı** (hub → 🌟 Yetenekler): 7 talent — Usta Okçu, Sağlam Bünye, Nişancılık, Tez Ayak, Talih, Toparlanma, **İkinci Şans (diriliş)**. Altınla alınır, `computeLoadout`'a işler, her koşuda geçerli. Diriliş `hurtPlayer`'da ölünce 1 kez %50 canla devam.

**✅ Faz D (çekirdek) — TAMAM:**
- **Kabus (ascension)**: 4. bölüm bitince açılır (hub'da ◀▶). Tier başına düşman +%50 can / +%25 hasar, ödül +%60. Endgame dikey hedef.

**⏳ KALAN (yapılmadı — gece tek başına, oynatıcı yok; körlemesine yapmak kırılma riski taşır):**
- **Faz B**: gerçek Evrim sistemi (katalizör pasif + boss sandığı → üst-form), telegraflı boss fazları.
- **Faz C**: Kahraman seçimi, Ekipman set bonusları.
- **Faz D**: Evcil/yoldaş, günlük görev/başarımlar.
Bunlar yeni akış/UI + denge testi ister; tek oturumda güvenle bitirilemedi. Net sıradaki adım.

## Kaynaklar
- Vampire Survivors — Evolution: https://vampire.survivors.wiki/w/Evolution
- Vampire Survivors — Passive items: https://vampire.survivors.wiki/w/Passive_items
- Archero rehberi (yetenek/talent): https://www.androidauthority.com/archero-guide-heroes-abilities-1086651/
- Archero tier/progression: https://www.mrguider.org/articles/archero-tier-list/
