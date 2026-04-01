# 🧱 LEGO World — Anaokulu Seviyesi Eğitsel Oyun

## Proje Özeti

Mevcut siteye entegre edilecek, anaokulu seviyesinde LEGO ve temel kodlama mantığı öğreten bir 2.5D web oyunu. Oyuncu, canlı bir mini dünyada LEGO karakteriyle gezer, LEGO parçaları toplar, hasarlı binaları tamir eder ve basit kodlama mantığını (sıralama, döngü, koşul) keşfeder.

**Hedef Kitle:** 4–6 yaş (anaokulu)  
**Platform:** Web (mevcut Vercel + Firebase sitesine eklenti)  
**Oyun Motoru:** Phaser 3 (veya PixiJS) — lightweight, 2D/2.5D web oyun framework  
**Backend:** Firebase (Auth, Firestore, Storage — zaten mevcut)  
**Deploy:** Vercel (mevcut altyapı)

---

## 1. Mevcut Siteye Entegrasyon Planı

### 1.1 Dosya Yapısı

Oyun, mevcut Next.js projesine bir sayfa/route olarak eklenir. Ayrı bir SPA olarak çalışır ama sitenin layout'u içinde render edilir.

```
existing-project/
├── app/                          # (veya pages/ — mevcut yapıya göre)
│   ├── ...mevcut sayfalar...
│   └── lego-world/
│       └── page.tsx              # Oyun sayfası (canvas mount noktası)
├── public/
│   └── game/
│       ├── assets/
│       │   ├── characters/       # Karakter spritesheet'leri
│       │   ├── tiles/            # Dünya tile'ları (çim, yol, su vs.)
│       │   ├── buildings/        # Bina sprite'ları (hasarlı + tamirli)
│       │   ├── lego-pieces/      # Toplanabilir LEGO parçaları
│       │   ├── ui/               # UI elementleri (çanta, minimap, butonlar)
│       │   └── audio/            # Ses efektleri + müzik
│       └── tilemaps/             # Tiled ile oluşturulmuş harita JSON'ları
├── lib/
│   └── game/
│       ├── scenes/
│       │   ├── BootScene.ts      # Asset yükleme
│       │   ├── MainMenuScene.ts  # Ana menü
│       │   ├── WorldScene.ts     # Ana dünya (explorasyon)
│       │   ├── BuildScene.ts     # İnşa/tamir mini-oyunu
│       │   └── CodingScene.ts    # Kodlama bulmaca sahası
│       ├── entities/
│       │   ├── Player.ts         # Oyuncu karakteri
│       │   ├── NPC.ts            # Yardımcı NPC'ler
│       │   └── LegoPiece.ts     # Toplanabilir parça
│       ├── systems/
│       │   ├── InventorySystem.ts  # Çanta/envanter
│       │   ├── MinimapSystem.ts    # Mini harita
│       │   ├── BuildSystem.ts      # İnşa mekaniği
│       │   ├── QuestSystem.ts      # Görev sistemi
│       │   └── CodingSystem.ts     # Kodlama blokları mantığı
│       ├── ui/
│       │   ├── HUD.ts             # Heads-up display
│       │   ├── InventoryUI.ts     # Çanta arayüzü
│       │   ├── MinimapUI.ts       # Mini harita UI
│       │   └── DialogUI.ts        # NPC diyalog baloncukları
│       ├── data/
│       │   ├── buildings.json     # Bina tanımları + gerekli parçalar
│       │   ├── quests.json        # Görev tanımları
│       │   └── levels.json        # Seviye/bölge tanımları
│       └── GameManager.ts         # Ana oyun yöneticisi
└── components/
    └── game/
        └── GameCanvas.tsx         # React wrapper — Phaser canvas'ı mount eder
```

### 1.2 Next.js Entegrasyonu

```tsx
// app/lego-world/page.tsx
"use client";

import dynamic from "next/dynamic";

// Phaser sadece client-side çalışır, SSR devre dışı
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => <LegoLoadingScreen />,
});

export default function LegoWorldPage() {
  return (
    <div className="w-full h-screen bg-sky-200">
      <GameCanvas />
    </div>
  );
}
```

### 1.3 Firebase Entegrasyonu

Mevcut Firebase instance kullanılır. Ek koleksiyonlar:

```
Firestore Koleksiyonları:
├── game_profiles/{userId}
│   ├── displayName: string
│   ├── characterId: string
│   ├── level: number
│   ├── totalPiecesCollected: number
│   ├── buildingsRepaired: number
│   ├── codingPuzzlesSolved: number
│   └── lastPlayedAt: timestamp
│
├── game_inventory/{userId}
│   ├── pieces: Map<pieceType, count>
│   ├── capacity: number (başlangıç: 10)
│   └── upgrades: string[]
│
├── game_world_state/{userId}
│   ├── buildings: Map<buildingId, { repaired: boolean, progress: number }>
│   ├── discoveredAreas: string[]
│   └── activeQuests: string[]
│
└── game_leaderboard/{period}
    └── entries: Array<{ userId, displayName, score, timestamp }>
```

### 1.4 Vercel Deploy Notları

- `public/game/assets/` klasörü büyük olabilir → Vercel'in 100MB output limitine dikkat
- Büyük asset'ler için Firebase Storage veya CDN (örn. Cloudflare R2) kullanılabilir
- `next.config.js`'e Phaser için webpack config eklenmeli:

```js
// next.config.js eklentisi
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
  }
  return config;
},
```

---

## 2. Oyun Dünyası Tasarımı

### 2.1 Dünya Haritası Yapısı

```
┌─────────────────────────────────────────────┐
│                 ORMAN BÖLGESİ               │
│          🌳🌲 (Yeşil LEGO parçaları)        │
│                                             │
│    PARK        ┌──────────────┐    SAHİL    │
│   BÖLGESİ     │              │   BÖLGESİ   │
│  🌸🎠         │  ŞEHİR       │   🏖️🐚     │
│  (Renkli      │  MERKEZİ     │  (Mavi LEGO │
│   parçalar)   │              │   parçaları) │
│               │  🏗️🏢🏫🏥   │             │
│    ÇARŞI      │  (Hasarlı    │    KÖPRÜ    │
│   BÖLGESİ     │   binalar)   │   BÖLGESİ   │
│  🏪🎪         │              │   🌉        │
│  (Özel        └──────────────┘  (Gizli     │
│   parçalar)                      parçalar)  │
│                                             │
│               NEHIR BÖLGESİ                 │
│           🌊 (Nadir parçalar)               │
└─────────────────────────────────────────────┘
```

- **Toplam harita:** ~2000×2000 piksel (tile-based, 32×32 veya 64×64 tile)
- **Bölge sayısı:** 6 keşfedilebilir bölge
- **Şehir merkezi:** Haritanın ortasında, 5-8 tamir edilecek bina

### 2.2 Canlı Dünya Elementleri

Dünya sürekli hareketli ve yaşayan hissiyatı vermeli:

| Element | Animasyon | Detay |
|---------|-----------|-------|
| Ağaçlar | Rüzgarda sallanma | Sprite sheet 4 frame |
| Su/Nehir | Akan su efekti | Tile animasyonu |
| Bulutlar | Yavaş kayma | Parallax layer |
| Kuşlar | Uçma paterni | Random spawn, path takibi |
| Çiçekler | Hafif sallanma | Dekoratif |
| NPC'ler | İdle + yürüyüş | Kendi rotalarında gezme |
| LEGO parçaları | Parlama + zıplama | Toplanabilir, dikkat çekici |
| Kelebekler | Rastgele uçuş | Parçaların etrafında |
| Gün/Gece | Renk geçişi | Hafif ton değişimi (opsiyonel) |

### 2.3 Binalar (Şehir Merkezi)

Her bina hasarlı başlar, LEGO parçaları ile tamir edilir:

| # | Bina | Gerekli Parçalar | Zorluk | Ödül |
|---|------|-----------------|--------|------|
| 1 | Okul 🏫 | 5 Kırmızı + 3 Mavi | ⭐ | Kodlama bulmacası açılır |
| 2 | Hastane 🏥 | 4 Beyaz + 4 Kırmızı | ⭐ | Çanta kapasitesi +2 |
| 3 | İtfaiye 🚒 | 6 Kırmızı + 2 Sarı | ⭐⭐ | Yeni bölge açılır |
| 4 | Kütüphane 📚 | 3 Kahve + 5 Turuncu | ⭐⭐ | Hikaye sayfaları |
| 5 | Park Alanı 🎡 | 8 Karışık renk | ⭐⭐ | Mini oyun açılır |
| 6 | Köprü 🌉 | 10 Gri + 4 Siyah | ⭐⭐⭐ | Yeni bölgeye geçiş |
| 7 | Saat Kulesi ⏰ | 6 Kahve + 6 Altın | ⭐⭐⭐ | Özel karakter kostümü |
| 8 | Belediye 🏛️ | 15 Karışık (tümü) | ⭐⭐⭐⭐ | Final — Şehir canlanır |

---

## 3. Oyun Mekanikleri

### 3.1 Karakter Hareketi

- **Kontrol:** Ekranda sanal joystick (mobil) + Klavye ok tuşları / WASD (desktop)
- **Hareket hızı:** Sabit, çocuk dostu (çok hızlı değil)
- **Animasyonlar:** idle, walk_up, walk_down, walk_left, walk_right
- **Collision:** Binalara, ağaçlara, suya çarpma (geçememe)

### 3.2 LEGO Parça Toplama

```
Parça Tipleri ve Renkleri:
─────────────────────────
🔴 Kırmızı blok   — Orman + Park bölgesi     (yaygın)
🔵 Mavi blok      — Sahil + Nehir bölgesi    (yaygın)
🟡 Sarı blok      — Park bölgesi             (orta)
🟢 Yeşil blok     — Orman bölgesi            (orta)
🟠 Turuncu blok   — Çarşı bölgesi            (orta)
⚪ Beyaz blok     — Her yerde                (nadir)
🟤 Kahverengi     — Orman + Köprü            (nadir)
⚫ Siyah blok     — Köprü bölgesi            (nadir)
🥇 Altın blok     — Kodlama bulmaca ödülü    (çok nadir)
```

- Parçalar dünyada rastgele spawn olur (bölgeye göre renk dağılımı)
- Her parça toplandığında: **parlama efekti + "klik" sesi + +1 animasyonu**
- Parçalar belirli aralıklarla (30–60 sn) yeniden spawn olur
- Nadir parçalar daha az sıklıkla ve daha gizli yerlerde spawn olur

### 3.3 Çanta (Envanter) Sistemi

```
┌─────────────────────────────────┐
│  🎒 ÇANTAM         [8/10]      │
│  ───────────────────────────    │
│  🔴 ×3  🔵 ×2  🟡 ×1          │
│  🟢 ×1  ⚫ ×1                  │
│                                 │
│  ▓▓▓▓▓▓▓▓░░  %80 DOLU         │
│                                 │
│  💡 Çanta dolunca haritayı aç! │
└─────────────────────────────────┘
```

- **Başlangıç kapasitesi:** 10 parça
- **Kapasite artışı:** Bina tamiri ödülü olarak +2, +3 gibi artışlar
- **Çanta dolduğunda:** Ekranda nazik bir uyarı + mini harita otomatik açılır
- **Çanta UI:** Ekranın sağ altında küçük ikon, tıklanınca detay açılır
- **Sürükle-bırak yok** (küçük çocuklar için karmaşık) → basit butonlarla yönetim

### 3.4 Mini Harita

```
┌──────────────────────┐
│  🗺️ DÜNYA HARİTASI  │
│                      │
│    🌳    🏗️🏫  🏖️   │
│         🏥🏢        │
│    🎠   ⭐🚒   🌉   │
│         📚🎡        │
│    🏪    🏛️   🌊    │
│                      │
│  📍 Sen buradasın    │
│  🔴 Tamir bekliyor   │
│  ✅ Tamamlandı       │
│  🔒 Kilitli          │
└──────────────────────┘
```

- **Açılma koşulu:** Çanta kapasitesinin %80'i dolduğunda erişilebilir
- **Gösterilenler:** Oyuncunun konumu, tamir bekleyen binalar, tamamlanan binalar, kilitli bölgeler
- **Navigasyon:** Bir binaya tıkla → "Oraya git" butonu → Karakter otomatik yönlenir (ok işareti)
- Mini harita ekranın sol üstünde küçük versiyonu her zaman görünür

### 3.5 Bina Tamir Mekaniği (Build Scene)

Oyuncu hasarlı bir binaya yaklaşıp etkileşime geçtiğinde:

```
┌─────────────────────────────────────────┐
│  🏗️ OKUL TAMİRİ                        │
│                                         │
│  ┌─────────┐    Gereken:                │
│  │         │    🔴 ×5  (var: 3 ✅)      │
│  │  🏫     │    🔵 ×3  (var: 2 ⚠️)      │
│  │ %60     │                            │
│  │ tamir   │    Eksik:                   │
│  └─────────┘    🔴 ×2  🔵 ×1            │
│                                         │
│  [📦 Parçaları Yerleştir]  [🔙 Geri]   │
│                                         │
│  💡 Kırmızı parçaları ormanda bulabil-  │
│     irsin!                              │
└─────────────────────────────────────────┘
```

- Yeterli parça varsa → **"Parçaları Yerleştir"** butonu aktif
- Parçalar tek tek animasyonla binaya yerleşir (tatmin edici görsel + ses)
- Kısmi tamir desteklenir (bazı parçaları koy, eksikleri sonra getir)
- Tamamlandığında: **konfeti efekti + alkış sesi + ödül popup'ı**

### 3.6 Kodlama Bulmacaları (Eğitsel İçerik)

Okul binası tamirinden sonra açılan kodlama bulmacaları. Scratch/Blockly tarzı görsel bloklar:

**Seviye 1 — Sıralama (Sequencing):**
```
Robotu eve götür!
┌────────┐  ┌────────┐  ┌────────┐
│ İLERİ  │  │ İLERİ  │  │  SAĞ   │
│  ➡️    │  │  ➡️    │  │  ↩️    │
└────────┘  └────────┘  └────────┘
         [▶️ Çalıştır]
```

**Seviye 2 — Döngü (Loop):**
```
Tüm parçaları topla!
┌────────────────────┐
│ 3 KERE TEKRARLA:   │
│  ┌────────┐        │
│  │ İLERİ  │        │
│  └────────┘        │
│  ┌────────┐        │
│  │ TOPLA  │        │
│  └────────┘        │
└────────────────────┘
         [▶️ Çalıştır]
```

**Seviye 3 — Koşul (Condition):**
```
Engelden kaç!
┌──────────────────────────┐
│ EĞER yol açıksa:        │
│   ┌────────┐             │
│   │ İLERİ  │             │
│   └────────┘             │
│ DEĞİLSE:                │
│   ┌────────┐             │
│   │  DÖN   │             │
│   └────────┘             │
└──────────────────────────┘
         [▶️ Çalıştır]
```

- **Blok sayısı:** Seviye başına max 3-5 blok (anaokulu seviyesi)
- **Geri bildirim:** Yanlışta "Tekrar dene! 💪", doğruda "Harika! 🎉"
- **Ödül:** Her bulmaca = 1 Altın LEGO parçası

---

## 4. Karakter Sistemi

### 4.1 Ücretsiz Karakter Kaynakları

Aşağıdaki sitelerden ücretsiz 2D karakter sprite'ları alınabilir:

| Kaynak | URL | Lisans | Notlar |
|--------|-----|--------|--------|
| **Kenney.nl** | kenney.nl/assets | CC0 (Public Domain) | LEGO-benzeri mini karakterler mevcut |
| **OpenGameArt** | opengameart.org | Çeşitli (CC0, CC-BY) | Topluluk sprite'ları |
| **itch.io Free Assets** | itch.io/game-assets/free | Çeşitli | Çok sayıda ücretsiz karakter paketi |
| **Craftpix** | craftpix.net/freebies | Ücretsiz tier | 2D karakter sprite sheet'leri |
| **GameArt2D** | gameart2d.com/freebies | Ücretsiz | Çocuk dostu karakter setleri |
| **Kenney — Tiny Town** | kenney.nl/assets/tiny-town | CC0 | İzometrik şehir + karakterler |

**Önerilen paket:** Kenney "Tiny Town" + "Tiny Dungeon" serileri — LEGO estetiğine çok uygun, CC0 lisanslı, ticari kullanım serbest.

### 4.2 Karakter Seçim Ekranı

```
┌──────────────────────────────────────┐
│  👤 KARAKTERİNİ SEÇ!                │
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │  🧒  │  │  👧  │  │  🧒  │       │
│  │Kerem │  │ Elif │  │Burak │       │
│  │ ⭐   │  │  ⭐  │  │  ⭐  │       │
│  └──────┘  └──────┘  └──────┘       │
│                                      │
│  🔒 Robot Rex  (Okulu tamir et!)     │
│  🔒 Ninja Nil  (3 bulmaca çöz!)     │
│                                      │
│  [✅ Seç ve Başla]                   │
└──────────────────────────────────────┘
```

- **Başlangıç:** 3 ücretsiz karakter
- **Kilitli:** Oyun ilerlemesiyle açılan özel karakterler (kostümler)
- **Özelleştirme:** İleride şapka/aksesuar ekleme (opsiyonel genişleme)

---

## 5. Kullanıcı Arayüzü (HUD)

### 5.1 Ana Oyun Ekranı Düzeni

```
┌──────────────────────────────────────────────────┐
│ [🗺️]  ⭐ 1250    🧱 8/10              [⚙️] [❌]│
│  mini                                             │
│  map                                              │
│                                                   │
│                                                   │
│                   OYUN DÜNYASI                     │
│                                                   │
│                      🧒                           │
│                   (karakter)                       │
│                                                   │
│                                                   │
│                                                   │
│                                    ┌─────┐        │
│              💬 NPC balonu         │ 🎒  │        │
│                                    │çanta│        │
│                                    └─────┘        │
│                         ┌───┐                     │
│                         │ 🕹️│  (mobil joystick)   │
│                         └───┘                     │
└──────────────────────────────────────────────────┘
```

### 5.2 UI Elementleri

| Element | Konum | Detay |
|---------|-------|-------|
| Mini harita | Sol üst | Küçük, tıklanınca büyür |
| Yıldız (skor) | Üst orta | Toplam puan |
| Parça sayacı | Sağ üst | Çanta doluluk (X/kapasite) |
| Ayarlar | Sağ üst köşe | Ses, müzik, çıkış |
| Çanta butonu | Sağ alt | Tıkla → envanter aç |
| Joystick | Alt orta (mobil) | Sanal analog joystick |
| Diyalog kutusu | Alt | NPC konuşmaları |
| Görev işaretçisi | Ekranda ok | Aktif göreve yön gösterir |

### 5.3 Tasarım İlkeleri (Anaokulu Uyumlu)

- **Büyük butonlar:** Minimum 48×48px dokunma alanı
- **Az metin, çok ikon:** Her buton önce ikon, sonra kısa metin
- **Parlak renkler:** LEGO'nun orijinal renk paleti (kırmızı, mavi, sarı, yeşil)
- **Sesli geri bildirim:** Her etkileşimde ses efekti
- **Hata toleransı:** Yanlış basma cezası yok, her şey geri alınabilir
- **Okuma gerektirmeyen:** Tüm talimatlar sesli + görsel ipucu ile desteklenir
- **Emoji ve animasyonlar:** Ödül anlarında konfeti, yıldız patlaması
- **Font:** Rounded, çocuk dostu (Nunito, Baloo, Bubblegum Sans)

---

## 6. Ses Tasarımı

| Olay | Ses | Kaynak Önerisi |
|------|-----|---------------|
| Parça toplama | "Klik" + "bling" | Kenney Audio |
| Çanta dolu | Nazik zil sesi | freesound.org |
| Bina tamiri | Çekiç + alkış | freesound.org |
| Bulmaca doğru | Fanfar + "yaşa!" | Kenney Audio |
| Bulmaca yanlış | Yumuşak "boop" | — |
| Arka plan müzik | Neşeli, sakin | opengameart.org (CC0) |
| Adım sesi | Hafif "tap tap" | — |
| NPC konuşma | "Bla bla" gibberish | — |
| Yeni bölge keşfi | Keşif fanfarı | — |

**Ses politikası:** Tüm sesler ayarlardan açılıp kapatılabilir. Başlangıçta müzik açık, efektler açık.

---

## 7. Görev Sistemi

### 7.1 Ana Görev Zinciri (Hikaye)

```
1. "Hoş Geldin!"
   → LEGO ustası Arda seni karşılar
   → İlk 3 parçayı topla (tutorial)

2. "İlk Tamir"
   → Okulu tamir et (5 Kırmızı + 3 Mavi)
   → Kodlama bulmacaları açılır

3. "Doktor Gelsin!"
   → Hastaneyi tamir et
   → Çanta kapasitesi artar

4. "Yangın Var!"
   → İtfaiyeyi tamir et
   → Orman bölgesi tamamen açılır

5. "Bilgi Hazinesi"
   → Kütüphaneyi tamir et
   → Hikaye sayfaları açılır

6. "Eğlence Zamanı"
   → Parkı tamir et
   → Mini oyunlar açılır

7. "Köprüyü Kur"
   → Köprüyü tamir et
   → Nehir bölgesi açılır

8. "Zaman Beklemez"
   → Saat kulesini tamir et
   → Özel kostüm ödülü

9. "Şehrimiz Güzel!"
   → Belediyeyi tamir et (final)
   → Şehir tam canlılığına kavuşur
   → Kutlama animasyonu 🎉
```

### 7.2 Yan Görevler (Tekrarlanabilir)

- **"Parça Avcısı":** Belirli sürede X parça topla → Bonus yıldız
- **"Renkli Koleksiyon":** Her renkten 1 parça topla → Özel rozet
- **"Kod Ustası":** 5 bulmaca arka arkaya çöz → Altın parça
- **"Kaşif":** Tüm bölgeleri keşfet → Harita tamamlama rozeti

---

## 8. Teknik Gereksinimler

### 8.1 Bağımlılıklar (npm)

```json
{
  "dependencies": {
    "phaser": "^3.80.0",
    "firebase": "^10.x.x (mevcut)",
    "next": "^14.x.x veya ^15.x.x (mevcut)"
  },
  "devDependencies": {
    "@types/phaser": "^0.0.1"
  }
}
```

### 8.2 Performans Hedefleri

| Metrik | Hedef |
|--------|-------|
| FPS | 60fps (desktop), 30fps (mobil) |
| İlk yükleme | < 3 saniye (asset lazy loading) |
| Toplam asset boyutu | < 15MB (sıkıştırılmış) |
| Bellek kullanımı | < 200MB |
| Desteklenen tarayıcılar | Chrome, Safari, Firefox (son 2 versiyon) |
| Mobil destek | iOS Safari, Android Chrome |

### 8.3 Responsive Tasarım

```
Desktop (>1024px):    Tam ekran canvas, klavye kontrol
Tablet (768-1024px):  Tam ekran canvas, dokunmatik joystick
Mobil (<768px):       Yatay mod zorunlu, dokunmatik joystick, büyütülmüş UI
```

---

## 9. Firebase Güvenlik Kuralları (Ek)

```javascript
// firestore.rules eklentisi
match /game_profiles/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /game_inventory/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /game_world_state/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /game_leaderboard/{period} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && request.resource.data.userId == request.auth.uid;
}
```

---

## 10. Geliştirme Aşamaları

### Faz 1 — Temel Altyapı (1-2 hafta)
- [ ] Next.js sayfasına Phaser entegrasyonu
- [ ] Tile-based dünya haritası oluşturma (Tiled editör)
- [ ] Karakter hareketi + collision
- [ ] Temel kamera takibi

### Faz 2 — Toplama + Envanter (1 hafta)
- [ ] LEGO parça spawn sistemi
- [ ] Toplama mekaniği + animasyon
- [ ] Çanta UI + kapasite sistemi
- [ ] Firebase'e envanter kaydetme

### Faz 3 — Binalar + Tamir (1-2 hafta)
- [ ] Hasarlı bina sprite'ları
- [ ] Tamir arayüzü
- [ ] Kısmi + tam tamir mekaniği
- [ ] Bina tamamlama animasyonları + ödüller

### Faz 4 — Mini Harita + Navigasyon (1 hafta)
- [ ] Mini harita oluşturma
- [ ] Bina durumları görüntüleme
- [ ] Navigasyon ok sistemi
- [ ] Bölge kilitleme/açma

### Faz 5 — Kodlama Bulmacaları (1-2 hafta)
- [ ] Blok tabanlı bulmaca editörü
- [ ] Sıralama bulmacaları (5+ adet)
- [ ] Döngü bulmacaları (3+ adet)
- [ ] Koşul bulmacaları (3+ adet)

### Faz 6 — NPC + Görevler (1 hafta)
- [ ] NPC diyalog sistemi
- [ ] Görev zinciri implementasyonu
- [ ] Görev takip UI

### Faz 7 — Ses + Polish (1 hafta)
- [ ] Ses efektleri entegrasyonu
- [ ] Arka plan müziği
- [ ] Parçacık efektleri (konfeti, parlama)
- [ ] Tutorial / ilk açılış akışı

### Faz 8 — Test + Yayın
- [ ] Mobil test (dokunmatik kontroller)
- [ ] Performans optimizasyonu
- [ ] Firebase güvenlik kuralları
- [ ] Vercel production deploy

**Tahmini toplam süre: 8-12 hafta** (tek geliştirici, part-time)

---

## 11. Genişleme Fikirleri (v2+)

- **Çok oyunculu mod:** Aynı dünyada arkadaşlarla birlikte inşa etme
- **Sezonluk içerik:** Yeni binalar, yeni bölgeler, yeni bulmacalar
- **Ebeveyn paneli:** Çocuğun ilerlemesini Firebase'den takip
- **LEGO seti entegrasyonu:** Gerçek LEGO setlerinin dijital versiyonlarını inşa etme
- **Sesli komutlar:** Web Speech API ile Türkçe sesli kontrol
- **Yapay zeka NPC:** Basit chatbot NPC'ler (Claude API ile)
- **Liderlik tablosu:** Sınıf bazlı, okul bazlı sıralama
- **Öğretmen paneli:** Öğretmenin bulmaca ekleyip, öğrenci ilerlemesini görmesi

---

## 12. Asset Hazırlama Kontrol Listesi

- [ ] Kenney.nl'den Tiny Town asset paketi indir
- [ ] Kenney.nl'den karakter sprite sheet'leri indir
- [ ] Tiled Map Editor kur (mapeditor.org — ücretsiz)
- [ ] Dünya haritasını Tiled'da tasarla
- [ ] Bina sprite'ları hazırla (hasarlı + sağlam versiyon)
- [ ] LEGO parça ikonları hazırla (9 renk × 2 boyut)
- [ ] UI elementleri tasarla (Figma veya Canva)
- [ ] Ses efektlerini indir (Kenney Audio + freesound.org)
- [ ] CC0/ücretsiz müzik bul (opengameart.org)
- [ ] Tüm asset'leri optimize et (TinyPNG, sprite atlas)

---

*Bu döküman, Claude Code (Antigravity) ile geliştirme sürecinde referans belgesi olarak kullanılacaktır. Her faz tamamlandığında bu dosya güncellenmeli ve checklist işaretlenmelidir.*
