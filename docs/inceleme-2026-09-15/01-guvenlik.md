# Güvenlik Denetimi — bilnetoyun.com

Ajan: `security-ai-generated-code-auditor` · Tarih: 15 Eylül 2026

**Yöntem:** Depo statik olarak okundu; canlı site başlıkları `curl -I` ile, veritabanı okuma kuralları anonim `GET …/lobbies.json?shallow=true` ile doğrulandı (saldırganın yapacağı işlemin aynısı; **yazma yapılmadı**). Yollar depo köküne göredir.

## Özet

1. **Veritabanı üç ana düğümde herkese yazılabilir/silinebilir.** `lobbies`, `players`, `rooms` düğümlerinde `.write: true` var; kimliksiz biri tek istekle tüm lobileri silebilir, başkasının adını değiştirebilir, sınırsız veri yığabilir. Canlıda 1.480 eski lobi ve ~700 oda hâlâ duruyor ve içlerindeki **çocuk isimleri dünyaya açık**.
2. **Depolanmış XSS:** Rakip oyuncunun Firebase'den gelen adı ve lobi alanları dört dosyada `innerHTML`'e ham basılıyor; kurallar bu alanların bir kısmını hiç doğrulamıyor → sınırsız uzunlukta zararlı kod her oyuncunun tarayıcısında çalıştırılabilir.
3. **Canlı site Vercel'de, Firebase Hosting'de değil.** `firebase.json`'daki güvenlik başlıkları ve dosya gizleme listesi **devre dışı**; canlıda yalnız HSTS var; `database.rules.json`, `server/ws-server.js`, planlama `.md` dosyaları herkese açık (HTTP 200 doğrulandı).

## Bulgular

| Önem | Bulgu | Kanıt | Etki | Önerilen düzeltme |
|---|---|---|---|---|
| KRİTİK | `lobbies`/`players`/`rooms` düğüm seviyesinde herkese yazma; `.validate` yalnız 4 alanda, silmede (null) hiç çalışmaz | `database.rules.json:48-50, 59-61, 69-71`; canlı: anonim GET ile 1.480 lobi, 344 altin-avi, 322 son-kart, 42 kelimelik odası okundu | Tüm lobilerin silinmesi (griefing), spam/fatura, isim taklidi, çocuk isimlerinin ifşası | Aşağıdaki kural taslağı: `.write` bir seviye aşağı (`$lobbyId`/`$playerId`/`$code`), anahtar biçimi ve tip doğrulaması. Faz 2: `signInAnonymously()` + `auth.uid === $playerId` |
| YÜKSEK | Depolanmış XSS – lobi listesi: Firebase'den gelen `id`, `wordLength`, `gridSize`, `maxTurns` ham basılıyor; kuralda bu alanlar doğrulanmıyor → sınırsız payload | `js/lobby.js:266` (`l.wordLength+' harf …'`), `:268` (`data-id="${l.id}"`); kaynak `js/multiplayer.js:242-248` | Lobi listesini açan her çocuğun tarayıcısında kod çalışır; Google oturumu olan kullanıcının token'ı çalınabilir | `lobby.js:8`'deki `escapeHTML()` ile sar, sayısal alanları `Number()`'a zorla; kuralda `isNumber()` |
| YÜKSEK | Depolanmış XSS – rakip adı `innerHTML`'e ham | `js/games/kod-macerasi-mp.js:224-227, :393`; `js/games/satranc-mp.js:95`; `js/games/penalti-mp.js:244→251→223/232, 441/446` (`gameData.opponentName`) | 24 karakter sınırı yeterli değil (`<svg/onload=…>` sığar) | Üç dosyada `escapeHTML(gameData.opponentName)` ya da `textContent` (`kod-macerasi-mp.js:181`'deki gibi) |
| YÜKSEK | Vercel'de hiç güvenlik başlığı yok; `firebase.json` başlıkları etkisiz; `vercel.json` yok | Canlı yanıt: yalnız `Strict-Transport-Security`; `firebase.json:18-26` | XSS'e karşı CSP yok, clickjacking (admin paneli dâhil), MIME sniffing | Aşağıdaki `vercel.json` |
| YÜKSEK | Depo dosyaları canlıda açık | `.vercelignore:1` yalnız `fabrika/`; HTTP 200: `/database.rules.json`, `/firebase.json`, `/server/ws-server.js`, `/_bank_tmp.txt`, `/BASLAT-SERVER.bat`, `*.md`, `games/*/tools/*.py`, `games/*/CLAUDE.md` | Saldırgana hazır kural haritası + admin e-postası; kaynak/plan sızıntısı (sır bulunmadı) | Aşağıdaki `.vercelignore` |
| YÜKSEK | Çok oyunculu hile: altın/eller istemcide, kural doğrulamıyor | `js/games/altin-avi.js:971-972, :996` (gold istemci transaction'ı; kural `rules.json:76-80` yalnız `name`); `games/son-kart/js/main.js:166` (`hands`, `deck` odada, `rooms` herkese okunur); `games/kelimelik/game.js:311,317` (`racks`,`bag`) | Konsoldan istenen altın yazılır, rakibin eli görülür | Kısa vade: `gold` için `isNumber() 0..999999`. Uzun vade: sunucu-otoriter mantık (Cloud Functions). Çocuk sitesi için kabul edilebilir risk olabilir — bilinçli karar verin |
| ORTA | Çocuk kişisel verisi: serbest metin ad → herkese açık düğümler, süresiz saklama; gizlilik/KVKK metni yok | `js/lobby.js:47` ("Adını yaz…") → `players/*/name`, `lobbies/*/hostName\|guestName`, `rooms/*/names`; 659 yetim alt düğüm (`games/ates-buz/js/network.js:63` `/ab`, `games/hava-hokeyi/index.html:158` `/hh`, `js/games/zipla-topla.js:1186` `/zt`); Google girişi `js/auth.js:10,188`; takip aracı YOK (olumlu); Google Fonts IP'yi Google'a iletir | 4-10 yaş kullanıcıların adları + yazdıkları kelimeler (`hostWord/guestWord`) anonim indirilebilir | Aydınlatma metni + veli bilgilendirmesi; takma ad/emoji seçici (serbest metin yerine); oyun bitince kaydı sil; günlük TTL temizliği (`createdAt < now-24h`); fontları self-host |
| ORTA | Admin: asıl kapı RTDB kuralı (doğru tasarım), panel `innerHTML` kullanmıyor (iyi). Ancak e-posta 3 yerde açık, `email_verified` yok, MFA yok, XFO yok | `admin.html:22`, `js/admin.js:11`, `database.rules.json:7` (Vercel'de herkese açık) | Hedefli parola denemesi; clickjacking ile "Tüm Cihazları Sıfırla" | Kuralda `auth.token.email_verified == true`; Firebase Auth'ta "e-posta numaralandırma koruması" açık; güçlü parola; XFO/`frame-ancestors` |
| ORTA | Üçüncü taraf betiklerde SRI yok | `index.html:177` (cdnjs chess.js), `:182` (cdnjs three.js), `:183` (unpkg GLTFLoader), `:179-181` (gstatic Firebase); depoda 0 `integrity=` | CDN ele geçirilirse tüm site | cdnjs/unpkg için `integrity`+`crossorigin` ekle ya da dosyaları `js/lib/` altına al |
| ORTA | WS sunucusu: kimlik/origin/hız sınırı yok; tanımsız `data` → ReferenceError ile **süreç çöker**; tip kontrolsüz `.trim()`; sınırsız dizi | `server/ws-server.js:4, 33-47`; `:108` imza vs `:120-121`; `:269`; `:615-621` | Yayına alınırsa tek mesajla uzaktan çökertme | Şu an **hiçbir istemci bağlanmıyor** (depoda `ws://` yok) → ölü kod; silin ya da düzeltmeden yayınlamayın |
| DÜŞÜK | `users/$uid` şekil/boyut sınırsız | `database.rules.json:93-97`; `js/auth.js:73` `set(data)` | Oturum açmış biri kendi düğümüne MB'larca veri yazar (fatura) | `.validate: newData.hasChildren()` + alan sınırları |
| DÜŞÜK | `leaderboards/tetris` kuralda yok → yazma reddediliyor; `rooms/kelimelik` için `.indexOn` yok | `js/games/tetris.js:503`; `games/kelimelik/net.js:58` | Tetris skor tablosu çalışmıyor; her listelemede alt ağacın tamamı iner | Taslakta düzeltildi |
| DÜŞÜK | `X-XSS-Protection` eski/etkisiz | `firebase.json:21` | Yok | Kaldır; yerine CSP |
| BİLGİ | Firebase web API anahtarı — tasarım gereği herkese açık, **gizli değil** | `js/firebase-config.js:5` | RTDB REST okuması anahtarsız da çalışıyor → tek kapı kurallar | Google Cloud'da HTTP referrer kısıtı; depoda `createUserWithEmailAndPassword` yok, Email/Password self-signup konsolda kapalı olmalı |

## database.rules.json — düzeltilmiş taslak (minimal, oyun akışını bozmaz)

Depoda kök seviyede `ref('lobbies').set/update` çağrısı yok (grep ile doğrulandı); tüm yazmalar `lobbies/<kod>`, `players/<id>`, `rooms/<oyun>/<kod>` altına gidiyor, bu yüzden `.write` bir seviye aşağı inebilir.

```json
{
  "rules": {
    ".read": false, ".write": false,
    "adminConfig": {
      ".read": true,
      ".write": "auth != null && auth.token.email_verified == true && auth.token.email === 'admin@bilnetoyun.com'"
    },
    "leaderboards": {
      ".read": false,
      "space-waves": { "…mevcut hâliyle aynı…": true },
      "egim":        { "…mevcut hâliyle aynı…": true },
      "tetris":      { "…egim ile birebir aynı blok…": true }
    },
    "lobbies": {
      ".read": true, ".indexOn": ["state"],
      "$lobbyId": {
        ".write": "$lobbyId.matches(/^[A-Z0-9]{4,8}$/)",
        "id":          { ".validate": "newData.isString() && newData.val().matches(/^[A-Z0-9]{4,8}$/)" },
        "hostName":    { ".validate": "newData.isString() && newData.val().length <= 24" },
        "guestName":   { ".validate": "newData.isString() && newData.val().length <= 24" },
        "state":       { ".validate": "newData.isString() && newData.val().length <= 24" },
        "gameType":    { ".validate": "newData.isString() && newData.val().length <= 32" },
        "wordLength":  { ".validate": "newData.isNumber() && newData.val() >= 3 && newData.val() <= 8" },
        "maxTurns":    { ".validate": "newData.isNumber()" },
        "gridSize":    { ".validate": "newData.isNumber() && newData.val() >= 3 && newData.val() <= 7" },
        "totalRounds": { ".validate": "newData.isNumber()" }
      }
    },
    "players": {
      ".read": true,
      "$playerId": {
        ".write": "$playerId.matches(/^P[a-z0-9]{8,20}$/)",
        "name":     { ".validate": "newData.isString() && newData.val().length <= 24" },
        "online":   { ".validate": "newData.isBoolean()" },
        "lastSeen": { ".validate": "newData.isNumber()" },
        "$other":   { ".validate": false }
      }
    },
    "rooms": {
      ".read": true,
      "altin-avi": { ".indexOn": ["state"], "$code": {
        ".write": "$code.matches(/^[A-Z0-9]{4,8}$/)",
        "state": { ".validate": "newData.isString() && newData.val().length <= 24" },
        "players": { "$playerId": {
          "name": { ".validate": "newData.isString() && newData.val().length <= 24" },
          "gold": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999999" }
        } }
      } },
      "son-kart":  { ".indexOn": ["state"], "$code": {
        ".write": "$code.matches(/^[A-Z0-9]{4,8}$/)",
        "state": { ".validate": "newData.isString() && newData.val().length <= 24" },
        "names": { "$pid": { ".validate": "newData.isString() && newData.val().length <= 24" } }
      } },
      "kelimelik": { ".indexOn": ["state"], "$code": {
        ".write": "$code.matches(/^[A-Z0-9]{4,8}$/)",
        "state": { ".validate": "newData.isString() && newData.val().length <= 24" },
        "names": { "$pid": { ".validate": "newData.isString() && newData.val().length <= 24" } }
      } }
    },
    "users": { "$uid": {
      ".read":  "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid"
    } }
  }
}
```

Ne değişti: koleksiyonun tamamı silinemez/üzerine yazılamaz; anahtar biçimi zorunlu; `innerHTML`'e giden sayısal alanlar sayı olmak zorunda; `gold` sınırlı; `tetris` ve `kelimelik` indeksi eklendi. Ne değişmedi: isim taklidi hâlâ mümkün (anonim auth gerektirir, faz 2). Eski hatalı kayıtlar (24 karakteri aşan adlar, yetim `ab/hh/zt` düğümleri) temizlenmeli.

> Uygulamadan önce `$playerId` deseninin (`^P[a-z0-9]{8,20}$`) ve lobi kodu deseninin gerçek üretilen kimliklerle eşleştiği `js/multiplayer.js` / `js/lobby.js` üzerinde doğrulanmalı; Firebase konsolundaki **Rules Playground** ile kayıt-oluştur/katıl/bitir akışı test edilmeli.

## vercel.json (yeni dosya, depo kökü)

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" },
      { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
      { "key": "Content-Security-Policy-Report-Only", "value": "default-src 'self'; script-src 'self' https://www.gstatic.com https://cdnjs.cloudflare.com https://unpkg.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.firebasedatabase.app wss://*.firebasedatabase.app https://*.googleapis.com https://childsplaylogic.firebaseapp.com; frame-src 'self' https://childsplaylogic.firebaseapp.com https://accounts.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" }
    ] },
    { "source": "/admin.html", "headers": [ { "key": "X-Robots-Tag", "value": "noindex, nofollow" } ] }
  ]
}
```

CSP önce **Report-Only** — `games/bil-ve-fethet/index.html` ve `games/zindan-okcusu/index.html` satır içi `onclick=` kullanıyor (24 adet); bunlar taşınmadan zorlayıcı moda geçilirse o iki oyun kırılır. `index.html`'deki 3 satır içi blok JSON-LD olduğu için sorun değil.

## .vercelignore (mevcut tek satırın yerine)

```
fabrika/
server/
seo/
docs/
.git/
.claude/
*.md
*.bat
*.py
_bank_tmp.txt
database.rules.json
firebase.json
.firebaserc
games/*/tools/
games/*/kaynak/
games/cevap-kosusu/index-3d.html
```

`llms.txt`, `robots.txt`, `sitemap.xml`, `BingSiteAuth.xml` ve IndexNow anahtar dosyası (`1cbb4632-….txt`) **açık kalmalı** — hepsi tasarım gereği herkese açık doğrulama dosyaları. `games/kelimelik/words.txt` oyun verisidir, kalır.

## Doğrulanamadı / bilgi gerekiyor

- Google Cloud'da Firebase API anahtarına HTTP referrer kısıtı var mı (depodan görülemez).
- Firebase Auth'ta Email/Password sağlayıcısında **self-signup** açık mı; "e-posta numaralandırma koruması" açık mı.
- Canlıdaki `.validate` kurallarının depodakiyle birebir aynı olup olmadığı: canlıda 24 karakteri aşan `hostName` kayıtları var — ya kural sonradan sıkılaştırıldı ya da yayınlanan kural farklı. Firebase konsolundan karşılaştırın.
- Firebase faturalandırma planı (Spark/Blaze) ve bütçe alarmı — spam yazma riskinin maliyeti buna bağlı.
- Admin hesabının parola gücü ve Google Workspace tarafında 2FA olup olmadığı.
- Vercel projesinde başlıkların dashboard'dan tanımlanıp tanımlanmadığı.
