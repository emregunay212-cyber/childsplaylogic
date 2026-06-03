# Çıkmış Sorular — Veri Şeması ve Entegrasyon Kılavuzu

Bu klasör, **gerçek (MEB kaynaklı) çıkmış / örnek LGS sorularının** sisteme
girişini düzenler. Amaç: öğrenciye "2024 Çıkmış Soru" gibi bir etiket
gösterildiğinde bunun **gerçekten doğru** olması.

## 1. Soru şeması (çıkmış soru alanları)

Çıkmış sorular, normal soru şemasına ek olarak şu alanları taşır:

```json
{
  "id": "lgs-mat-carpanlar-katlar-c2024-01",
  "zorluk": "zor",
  "cikmis": true,
  "cikmisYil": 2024,
  "kaynak": "MEB LGS 2024 — Merkezî Sınav, Matematik, Soru 7",
  "kaynakGerekli": true,
  "dogrulandi": false,
  "soru": "...",
  "siklar": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "dogruCevap": "B",
  "cozum": "...",
  "kazanim": "..."
}
```

| Alan | Anlamı |
|------|--------|
| `cikmis: true` | Bu bir çıkmış/örnek sınav sorusudur. Quiz ekranında **sağ üstte rozet** çıkar. |
| `cikmisYil: 2024` | Rozette gösterilen yıl ("2024 Çıkmış Soru"). |
| `kaynak` | Tam kaynak (yıl, ders, soru no). Rozetin üzerine gelince görünür. |
| `kaynakGerekli: true` | Olgusal/kaynaklı içerik bayrağı (verify-yapisal tarih uyarısını susturur). |
| `zorluk: "zor"` | Çıkmış sorular **her zaman zor** kategorisinde değerlendirilir. |
| `dogrulandi` | **false = onay bekliyor (öğrenciye GÖSTERİLMEZ).** Öğretmen resmî PDF ile birebir teyit edince `true` yapılır → yayına girer. |

## 2. Doğrulama kapısı (önemli)

`js/quiz.js` ve `js/icerik.js` artık `dogrulandi: false` olan soruları
öğrenciye **göstermez** (ne testte ne ön-testte). Yani çıkmış sorular,
öğretmen kontrolünden geçene kadar güvenle "taslak" olarak bekletilebilir.

**İş akışı:** taslak ekle (`dogrulandi:false`) → öğretmen MEB resmî kitapçığıyla
birebir karşılaştırır → doğruysa `dogrulandi:true` → öğrenci karşısına
rozetiyle çıkar.

## 3. Soruyu nereye eklemeli?

Çıkmış soru, **ilgili konunun JSON dosyasına** (`icerik/lgs/<ders>/<slug>.json`
içindeki `sorular` dizisine) eklenir; böylece o konunun testinde rozetiyle
çıkar. id çakışmasın diye `-c<yil>-NN` eki kullanılır (ör.
`lgs-mat-carpanlar-katlar-c2024-01`).

## 4. Resmî kaynaklar (2018–2024)

Sorular **yalnızca** aşağıdaki resmî MEB kaynaklarından birebir alınmalıdır
(görsel PDF olduklarından elle/öğretmence aktarılır):

- MEB ÖDSGM — Örnek Sorular (tüm yıllar): https://odsgm.meb.gov.tr/www/ornek-sorular/icerik/1011
- MEB — LGS merkezî sınava yönelik örnek sorular duyurusu: https://www.meb.gov.tr/lgs-merkezi-sinavina-yonelik-yeni-ornek-sorulari-yayimlandi/haber/35444/tr
- MEB ÖDSGM ana sayfa (geçmiş sınav soru/cevap anahtarları): https://odsgm.meb.gov.tr

> NOT: Çıkmış sorular telif açısından kamuya açık MEB yayınlarıdır; ancak
> **birebir doğru aktarım** şarttır. Otomatik (web kazıma) aktarım bu projede
> KULLANILMAZ; çünkü kaynaklar taranmış görsel PDF olup hatasız metne
> çevrilemez. Aktarım resmî PDF'ten elle yapılır, `dogrulandi:false` ile
> başlar, öğretmen onayıyla `true` olur.
