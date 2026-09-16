# B6 — CSP provası: köprü kullanan 4 iframe sayfası (16 Eyl 2026)

Yöntem (tests/edu-kit.spec.js ile aynı; `tests/bridge.spec.js` "CSP provası"): sayfa yanıtına `page.route` ile
GEÇİCİ `<meta http-equiv="Content-Security-Policy" content="script-src 'self'">` enjekte edilir (dosyaya
yazılmaz), konsoldaki "Refused to execute inline script" sayılır; belgedeki `script:not([src])` sayısı da okunur.

| Sayfa | Satır içi `<script>` (B6 öncesi) | B6 sonrası | CSP ihlali | Not |
|---|---|---|---|---|
| `games/kelimelik/index.html` | 1 (Firebase config bloğu) | **0** | **0** | SDK + config silindi; db köprüden |
| `games/son-kart/index.html` | 1 (Firebase config + `window.storage` shim) | **0** | **0** | SDK + config silindi; shim'i hiçbir Son Kart dosyası okumuyordu → silindi |
| `games/ates-buz/index.html` | 1 (`<script type="module">` başlatıcı, 2 satır) | **0** | **0** | → `games/ates-buz/js/boot.js` (`<script type="module" src>`); build `?h=` ekliyor |
| `games/hava-hokeyi/index.html` | 1 (oyunun tamamı, ~560 satır) | 1 | **1** | **B9 envanteri** — görev 1: blok → `games/hava-hokeyi/game.js` |

`on*="` satır içi olay yok (4 sayfada 0). Toplam satır içi `<script>` (`grep -c "<script>" games/*/index.html`, 0 hariç):
`bil-ve-fethet` 2 · `zindan-okcusu` 2 · `kelime-madeni-3d` 2 (kapalı oyun) · `hava-hokeyi` 1 → **B9 kalanı 4 sayfa / 7 blok**
(B5 ölçümüyle aynı; B6 kelimelik + son-kart + ates-buz'u düşürdü).

Prova kontrolü: `hava-hokeyi` satırı testin kendisini doğrular (1 blok → 1 ihlal; harness çalışıyor). Envanter
değişince (`B9`) `tests/bridge.spec.js` `CSP_INLINE` tablosu güncellenir; artış = gerileme, CI kırmızı.

Ayrıca `vercel.json` Report-Only `script-src` artık `'self' 'wasm-unsafe-eval' https://www.gstatic.com https://apis.google.com`
(cdnjs düştü, B9 görev 2'deki nihai değerle aynı).
