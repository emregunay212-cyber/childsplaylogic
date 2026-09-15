# Konsol sertleştirme — 15 Eylül 2026 akşam (kanıt)

Kod dışı, proje ayarı düzeyindeki dört madde. Uygulayan: Claude Code, Senior SecOps Engineer kimliğiyle;
Google API'leri `firebase-tools` oturumu (emregunay212@gmail.com) ile, Vercel `vercel api` ile.
Yedek: `~/.claude/backups/gcp-20260915/apikey.onceki.json` (repo dışı).

## 1. Firebase Auth — e-posta numaralandırma koruması: ZATEN AÇIKTI
`GET identitytoolkit.googleapis.com/admin/v2/projects/childsplaylogic/config`
```
"emailPrivacyConfig": { "enableImprovedEmailPrivacy": true }
"client": { "permissions": {} }        ← kayıt olma (sign-up) kapatılmadı, bilerek
"signIn": { "email": { "enabled": true, "passwordRequired": true } }
```
Değişiklik yapılmadı. "Kayıt olmayı kapat" anahtarı **tüm sağlayıcılar** için geçerli
(GCIP Config `disabledUserSignup`: "cannot sign up … through any of our API methods"); açılsaydı
ilk kez Google ile giren öğrenci hesap oluşturamazdı. `js/admin.js:161` `auth/invalid-credential`
kodunu zaten karşılıyor.

Not (yapılmadı, sahip kararı): `authorizedDomains` listesinde 15 bayat Firebase Hosting önizleme
kanalı (`childsplaylogic--zindan*.web.app`, `--zipla-coop-test-*`) + `childsplaylogic.web.app`
(hosting kapalı) + `localhost` duruyor.

## 2. Google Cloud API anahtarı — HTTP referrer kısıtı: UYGULANDI
Anahtar: "Browser key (auto created by Firebase)" `cb2f3e96-…`, keyString kodla aynı
(`js/firebase-config.js:9`). API Keys API ve Cloud Billing API projede kapalıydı → etkinleştirildi
(yönetim API'leri, ücretsiz).

`PATCH apikeys.googleapis.com/v2/projects/27619900067/locations/global/keys/cb2f3e96-…?updateMask=restrictions`
```
allowedReferrers: bilnetoyun.com/*  ·  *.bilnetoyun.com/*  ·  childsplaylogic.firebaseapp.com/*
apiTargets: 27 (öncekiyle aynı, Firebase servisleri)   updateTime: 2026-09-15T19:24:04Z
```
`GET identitytoolkit.googleapis.com/v1/projects?key=…` (curl, Referer başlığına göre):

| Referer | Önce | Sonra |
|---|---|---|
| https://evil.example/ | 200 | **403** "Requests from referer https://evil.example/ are blocked." |
| (başlık yok — curl/bot) | 200 | **403** |
| https://bilnetoyun-git-x.vercel.app/ (önizleme) | 200 | **403** (kabul: önizlemede Google girişi yok) |
| https://bilnetoyun.com/ | 200 | 200 |
| https://bilnetoyun.com/games/kelimelik/ (iframe) | 200 | 200 |
| https://www.bilnetoyun.com/ | 200 | 200 |
| https://childsplaylogic.firebaseapp.com/__/auth/handler | 200 | 200 |

Gerçek tarayıcı (bilnetoyun.com sekmesinden `fetch`): identitytoolkit 200; securetoken 400
`MISSING_GRANT_TYPE` (referrer geçti, boş gövdeye takıldı — beklenen). Site `Referrer-Policy:
strict-origin-when-cross-origin` (vercel.json:20) → Google'a origin gider, `no-referrer` değil.
"Google ile Giriş" tıklanınca pencere `childsplaylogic.firebaseapp.com`'a açılmaya çalıştı
(ön adım geçti; pencere yalnız tarayıcı kısıtı yüzünden açılmadı). Konsolda hata yok.
Yerel `npx playwright test tests/smoke.spec.js` (localhost, misafir modu): **60/60**.

## 3. Vercel `www.bilnetoyun.com` → 308: UYGULANDI
Önce: `www` projede kayıtlı değildi; Vercel otomatik `307 Temporary Redirect` → `https://bilnetoyun.com/`.
`POST /v10/projects/childsplaylogic/domains` `{"name":"www.bilnetoyun.com","redirect":"bilnetoyun.com","redirectStatusCode":308}`
→ `verified: true`.
```
https://www.bilnetoyun.com/          → 308 → https://bilnetoyun.com/
https://www.bilnetoyun.com/oyunlar/  → 308 → https://bilnetoyun.com/oyunlar/
http://www.bilnetoyun.com/           → 308 → https://www.bilnetoyun.com/ → 308 → apex
```
Ek (15 Eyl gece, sahip: "childsplaylogic.com'u hiç kullanmıyorum"): `childsplaylogic.com` → 307 →
`www.childsplaylogic.com` idi ve orası siteyi **200 ile kopya** sunuyordu. `PATCH /v9/projects/childsplaylogic/domains/<d>`
`{"redirect":"bilnetoyun.com","redirectStatusCode":308}` ikisine de uygulandı:
```
https://childsplaylogic.com/                        → 308 → https://bilnetoyun.com/
https://www.childsplaylogic.com/                    → 308 → https://bilnetoyun.com/
https://www.childsplaylogic.com/oyunlar/kelimelik/  → 308 → https://bilnetoyun.com/oyunlar/kelimelik/ → 200
```
Domain silinmedi (eski bağlantı/yer imi/Google kaydı kırılmasın, sinyal bilnetoyun.com'a aksın).

## 4. Firebase bütçe alarmı: GEREKMİYOR (Spark)
`GET cloudbilling.googleapis.com/v1/projects/childsplaylogic/billingInfo`
```
"billingAccountName": "", "billingEnabled": false
```
Faturalandırma hesabı yok → Spark planı → bütçe kurulamaz, kota dolunca servis durur, ücret çıkmaz.
