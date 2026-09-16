# Tasarım Sözleşmesi — "Çıkartma Kitabı Bahçesi" (Faz 2 / B0)

**Kaynak:** Claude Design çıktısı, 16 Eyl 2026 — `design/2026-09-16-claude-design/Bilnet Oyun Tasarim.dc.html` (tuval; `python server.py` → `http://localhost:8000/design/2026-09-16-claude-design/Bilnet%20Oyun%20Tasarim.dc.html`), bölüm ekran görüntüleri `docs/tasarim-2026-09-16/` (hub, kart durumları, kategori v2; tamamı tuvalde). Brief: `docs/tasarim-brief-claude-design.md`. Bu belge tuvalin **uygulanabilir özeti**dir; çelişkide tuval kazanır, kod bu belgeyi okur.
**Yön (tek cümle):** Tek dünya (gökyüzü, güneş, çimen); her kart, düğme ve rozet kalın beyaz konturlu bir çıkartma gibi sayfaya yapışır. Tek tema (açık), tek yarıçap sistemi, tek ikon seti, emoji simge yok.
**Mod:** redesign – preserve: slug'lar, `?oyun=` derin bağlantı, menü/sekme adları, `TR.games` adları, yıldız/kilit mantığı, KVKK metni, imza bandı **değişmez**.

## 1. Token'lar (`css/tokens.css` — B1)
### Renk (24; adlar tuvaldeki gibi)
| Token | Hex | Kullanım |
|---|---|---|
| `--mavi-500` | #4AABE0 | Marka; sekme dolgusu, vurgu (üstünde metin daima mürekkep) |
| `--mavi-700` | #2E8FC4 | Hover/basılı mavi |
| `--mavi-800` | #17739F | Dolgulu düğme zemini (beyaz metin AA), klavye odak halkası |
| `--mavi-050` | #E8F5FC | Açık mavi yüzey, rozet zemini |
| `--gok-ust` / `--gok-alt` | #87CEEB / #C9E8F7 | Gökyüzü gradyanı (üst → alt) |
| `--cim` / `--cim-koyu` | #7EC850 / #5DAA3A | Çimen zemin / kenar |
| `--gunes` | #FFD54A | Güneş |
| `--murekkep` | #1F3A4D | Tüm metin (saf siyah yok) |
| `--murekkep-orta` | #4E6272 | İkincil metin, "Yakında" grisi |
| `--beyaz` | #FFFFFF | Kart yüzeyi, çıkartma konturu |
| `--cizgi` | #DCE6EC | Ayırıcı, form kenarı |
| `--kat-harf` | #45B7D1 | Harfler ve Kelimeler şeridi/balonu |
| `--kat-sayi` | #4ECDC4 | Sayılar ve Matematik |
| `--kat-bulmaca` | #F7B731 | Bulmaca ve Mantık |
| `--kat-yaratici` | #FF78C4 | Yaratıcılık |
| `--kat-strateji` | #A4683A | Strateji ve Macera |
| `--kat-online` | #7B5BFF | Online |
| `--dogru` / `--dogru-zemin` | #1E8E4E / #DFF5E7 | Doğru geri bildirimi (+ tik simgesi) |
| `--yanlis` | #C0392B | Yanlış geri bildirimi (+ çarpı simgesi) |
| `--yildiz` / `--yildiz-bos` | #F4B400 / #D7DEE3 | Kazanılan / boş yıldız |

Kural: kategori renkleri yalnız kart üst şeridi, balon ve raf etiketinde; kart yüzeyi beyaz. Mavi-500 üstünde beyaz metin AA'yı geçmez → dolgulu düğme **mavi-800**. Koyu tema yok.

### Yazı
| Token | Değer | Yer |
|---|---|---|
| `--yazi-hub` | Fredoka 700 · 40 px | Hub ve giriş başlığı |
| `--yazi-raf` | Fredoka 700 · 30 px | Yaş rafı başlığı |
| `--yazi-baslik` | Fredoka 600 · 24 px | Modal, panel başlığı |
| `--yazi-kart` | Fredoka 600 · 20 px | Oyun kartı adı |
| `--yazi-dugme` | Fredoka 700 · 18 px | Düğme ve sekme |
| `--yazi-govde` | Nunito 400 · 18 px / 1,6 | Tüm gövde metni |
| `--yazi-rozet` | Nunito 700 · 13 px | Rozet (en küçük ölçü) |

Fontlar self-host (`css/fonts.css`, A9a). Türkçe karakterler her boyutta kontrol edilir.

### Aralık, yarıçap, gölge, süre
- `--ara-1…8`: 4 · 8 · 12 · 16 · 24 · 32 · 40 · 64 px (yalnız 4 ve 8 katları).
- `--r-kart` 24 px · `--r-giris` 16 px (giriş alanı, ikon karesi) · `--r-hap` 999 px (tüm düğme ve çipler). Başka yarıçap yok.
- `--kontur` 4 px #FFFFFF (çıkartma konturu; dolgulu yüzeylerde taşıyıcı, dekor değil).
- `--golge-1` 0 2px 6px rgba(31,58,77,.10) · `--golge-2` 0 6px 16px rgba(31,58,77,.16) · `--golge-3` 0 14px 32px rgba(31,58,77,.20).
- `--hedef-min` 52 px (dokunma hedefi).
- `--sure-bas` 120 ms (basma, ölçek 0,97) · `--sure-gecis` 220 ms · `--sure-kutlama` 600 ms sonra durur · `--egri-out` cubic-bezier(.23,1,.32,1) · `--egri-yay` cubic-bezier(.34,1.56,.64,1) (yalnız yıldız yapışması).
- Hareketi azalt: yalnız opaklık/renk geçişleri kalır; ölçek, konfeti, balon uçuşu kapanır; iskelet nabızsız.

## 2. Bileşen envanteri (her biri: normal · basılı 0,97 · klavye odağı 3 px mavi-800 halka + 3 px boşluk · devre dışı)
- **Düğme** birincil (mavi-800 dolgu, beyaz metin) / ikincil (beyaz, mürekkep metin, kontur) / tehlike (her zaman onay ister); boyut 64 / 56 / 52 px; hap.
- **Çip** (kategori sekmesi: "Tümü" dolgulu; ikon 26 px'e kadar küçülen kategori karosu + ad) · **Rozet** (2 oyuncu, Yeni, Yakında, 4-6 yaş) · **Form alanı** (oda kodu; 16 px yarıçap).
- **Bant** (çevrimdışı: "Çevrimdışısın, tek kişilik oyunlar açık") · **Toast** (Kaydedildi) · **Geri bildirim** (Harika! tik / Bir daha dene çarpı — renk + simge birlikte).
- **Oyun kartı** (tek tip, 10 durum — bkz. §3.03): 1280'de 172 px, 375'te 152 px; ikon karosu 128 ızgara / 28 yarıçap, üstte 8 px kategori şeridi, ad 20 px, üç yıldız yuvası her zaman görünür.
- **Raf başlığı** (dolgulu çip, raf rengi) + "n oyun" rozeti; yatay ray.
- **Devam et satırı**: 3 geniş karo (ikon + ad + yıldızlar), sol kenarda kategori şeridi.
- **Üst şerit** 1280: ev karosu (mavi, beyaz kontur) + marka (Bilnet Oyun / Eğitici Oyunlar) + sekmeler + yıldız/elmas sayaçları + ses + hesap (Misafir). 1024: iki satır (marka+sayaçlar üstte, sekmeler altta). 375: marka + sayaç + ses; sekmeler altta yatay kayar.
- **Öğretmen anahtarı** (`role=switch`): açıkken kartlara kazanım etiketi (mavi-050 rozet) + süre ("10 dk"); kapalıyken kart 36 px kısadır.
- **Dialog/Modal** (kilit, panel, seviye tamamlama): 24 px yarıçap, konturlu, tek çıkış; 375'te alt kenara yapışır, düğme tam genişlik.
- **İkon seti** (2 px çizgi, yuvarlak uç, 24/32 ızgara): ev, geri, ses açık/kapalı, tam ekran, kilit, oyuncu, hesap, elmas (geometrik), yıldız dolu/boş. Emoji hiçbir yerde simge değildir.
- **Maskot "Bulut Bili"** (seçildi; Baykuş ve Filiz elendi — gerekçeler tuvalde): üç daire + iki göz + ağız, 5 ifade: mutlu, kutlayan, düşünen, üzgün, uyuyan. Giriş kartında selamlar; 404 düşünen; bağlantı koptu üzgün; çevrimdışı uyuyan. Uygulama: `assets/maskot/bulut-*.svg` (tuvaldeki div çizimi SVG'ye çevrilir; marka onayı gerekir).
- **İmza bandı**: her sayfanın en altında, `css/imza.css` aynen; ≤ %2 yükseklik.

## 3. Ekranlar (tuval bölümleri; her biri 1280 + 375, 1024 notu)
- **01 Giriş kartı** — misafir yolu tek dokunuş (birincil), Google girişi veli satırıyla; maskot; üç güven satırı (Reklam yok · Üyelik zorunlu değil · 57 oyun ücretsiz). 1024: kart 520 px sabit.
- **02 Hub** — birinci eksen **yaş rafı** (Anaokulu 4-6 · 1-2. Sınıf · 3-4. Sınıf · 5-6. Sınıf; oyun `age` aralığının kestiği her rafa girer), ikinci eksen kategori sekmesi; "Devam et" ilk satır; kart yüzeyi beyaz, kategori rengi üst şeritte; öğretmen anahtarı. 1024: üst şerit iki satır, kart 168 px.
- **03 Kart durumları** — normal, basılı, odak, 0/1/2/3 yıldız (köşeye yapışır), kilitli (eşik kartın üstünde yazılı: "5 yıldız"), yakında (gri, basılamaz), online (2 oyuncu rozeti sağ üst), çevrimdışı (gri, basılamaz). Durum asla yalnız renkle anlatılmaz.
- **04 Kilit modalı** — "Bu oyun için 5 yıldız gerekiyor · Şu an 2 yıldızın var · 2 / 5" + tek düğme "Tamam" + öğretmen notu.
- **05 Yıldız/rozet paneli** — iki büyük sayı (yıldız, elmas), "Bugün 18 / 50 elmas", rozet ızgarası (kazanılmayan gri konturla + ilerleme), bilgi satırı. 375: tam sayfa, iki sütun.
- **06 Seviye tamamlama** — konfeti + balon 600 ms sonra durur; yıldızlar 120 ms arayla yapışır; "Sonraki" birincil, "Tekrar"/"Ana ekran" ikincil. Hareketi azalt: konfeti yok.
- **07 Oyun çerçevesi** — 64 px şerit: geri (solda tek), oyun adı + seviye, yıldız sırası, ses, tam ekran; oyun alanı 1280×636; iframe oyunlar da aynı çerçevede, kendi başlığını çizmez. 1024: seviye etiketi kalkar.
- **08 Online akışı** — takma ad serbest metin **değil**: hazır isim + avatar seçici (A8b); lobi: Hızlı Oyun / Oda Kur / Kodla Katıl + açık odalar; bekleme odasında oda kodu ekranın en büyük öğesi; rakip bulundu; bağlantı koptu (maskot üzgün, hata kodu yok).
- **09 Sistem durumları** — çevrimdışı bandı, yükleniyor (kart iskeleti, 220 ms sonra, nabız yok), hata toast'ı, boş "Devam et". Maskot konuşur; teknik terim/suçlayıcı dil yok.
- **10 Oyun açılış sayfası** (`/oyunlar/<slug>/`) — kırıntı, başlık, bir cümle, **Hemen Oyna** en üstte ve en büyük, yaş/kategori/süre üç kutu, "ne öğretir", benzer oyunlar. 375: düğme tam genişlik, yapışık.
- **11 /oyunlar/** — raf yok; tek ızgara + solda kalıcı süzgeç (yaş × kategori); kartlar hub'la aynı, kazanım satırı hep açık. 1024: süzgeç üstte yatay, üç sütun.
- **12 404** — maskot düşünen, "Bu sayfa kaybolmuş", üç oyun kartı, "Ana Ekrana Dön".
- **13 Metin sayfaları** — tek sütun 680 px, gövde 18 px / 1,7; kontur ve büyük yarıçap yok; **içerik üreticiden (KVKK metni değişmez)**.
- **14 Yönetici paneli** — yetişkin aracı: kontur/gölge yok, yoğunluk yüksek, tablo satırı 56 px, yıkıcı işlemler onaylı; renk ve yazı ailesi aynı.

## 4. Varlıklar (v2)
- **Oyun görselleri v2**: `design/2026-09-16-claude-design/assets/hub-v2/<slug>.svg` (57): 128×128 ızgara, 28 yarıçap, sahne kurgusu, emoji yok → `assets/images/hub/<slug>.svg` yerine (B2b). Eski setin sorunu: viewBox'lar 96/100/128 karışık, bazıları emoji içeriyor.
- **Kategori simgeleri v2**: `design/2026-09-16-claude-design/assets/categories-v2/{letters,numbers,puzzles,creativity,strategy,online}.svg` → `assets/images/categories/*.png` yerine (B1/B2b; `js/app.js categoryIcons`, `seo/build_seo.py`). 26 px'te okunur.
- Maskot SVG'leri (B2b'de üretilir).

## 5. Plan eşlemesi (blueprint mutasyonu — Faz 2 planı bu belgeye göre güncellendi)
- B0 ✔ (bu belge; kullanıcı yönü Claude Design'da onayladı). B1: `css/tokens.css` bu belgedeki adlarla (plan taslağındaki `--paper/--ink/--subject-*` adları **kullanılmaz**; tuval adları tek kaynak). B2b: raf modeli §3.02, kart anatomisi §2/§3.03, v2 görseller. B3: dialog §2 + §3.04/05/06. B4: süre/easing token'ları + §3.06 kutlama. Online takma ad seçici §3.08 (A8b).
