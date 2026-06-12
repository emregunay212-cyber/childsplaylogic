#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SEO landing sayfa jeneratoru — bilnetoyun.com
Tek veri kaynagi (GAMES) + sablon -> her oyun icin /oyunlar/<slug>/index.html,
'Tum Oyunlar' hub'i /oyunlar/index.html, ve sitemap.xml.
Calistir:  python seo/build_seo.py
Icerik degisirse GAMES'i guncelle + tekrar calistir.
"""
import os, html, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://bilnetoyun.com"
TODAY = "2026-06-13"  # Date.now() ortamda yok; elle guncellenir

# slug = SPA oyun id'si (derin-link app.js'te ?oyun=<slug> ile eslenir)
# cat: kategori etiketi · age: yas · players: kac kisilik · teaches: ne kazandirir
GAMES = [
  dict(slug="satranc", name="Satranç", cat="Strateji", age="6-10", players="Tek kişilik (AI'ya karşı)",
       teaches="Strateji, planlama ve mantık",
       short="Yapay zekâya karşı 9 seviyede satranç oyna.",
       about="Bilnet Oyun Satranç, çocukların stratejik düşünme ve planlama becerisini geliştirmek için tasarlanmış, tarayıcıda ücretsiz çalışan bir satranç oyunudur. Yapay zekâya karşı kolaydan zora 9 farklı seviyede oynayabilir; taş hareketlerini ve temel açılışları eğlenerek öğrenirsin. Kurulum ya da üyelik gerekmez."),
  dict(slug="penalti", name="Penaltı", cat="Spor / Refleks", age="5-10", players="Tek kişilik",
       teaches="El-göz koordinasyonu ve zamanlama",
       short="Kaleciye penaltı at, 9 seviyede gol krallığına ulaş.",
       about="Penaltı, doğru zamanda ve yönde şut çekerek kaleciyi geçmeye çalıştığın hızlı bir refleks oyunudur. 9 seviye boyunca kaleci giderek daha zorlaşır; çocuklar el-göz koordinasyonunu ve zamanlamayı geliştirir. Ücretsiz, üyeliksiz, telefon ve tablette oynanır."),
  dict(slug="hafiza-kartlari", name="Hafıza Kartları", cat="Hafıza", age="4-9", players="Tek kişilik",
       teaches="Görsel hafıza ve dikkat",
       short="Eşleşen kartları bul, 10 seviyede hafızanı güçlendir.",
       about="Hafıza Kartları, kapalı kartları açıp eşlerini bulduğun klasik bir hafıza ve dikkat oyunudur. 10 artan seviyede kart sayısı çoğalır ve görsel hafıza giderek güçlenir. Anaokulu ve ilkokul çocukları için ideal; tamamen ücretsiz."),
  dict(slug="matematik", name="Matematik", cat="Matematik", age="5-9", players="Tek kişilik",
       teaches="Toplama, çıkarma ve hızlı işlem",
       short="Toplama-çıkarma alıştırmalarıyla dört işlemi eğlenerek öğren.",
       about="Matematik oyunu, çocuklara toplama ve çıkarma başta olmak üzere temel işlemleri oyunlaştırarak öğretir. Doğru cevaplarla yıldız toplar, hız ve doğruluğunu artırırsın. İlkokul matematik pratiği için ücretsiz ve eğlenceli bir kaynak."),
  dict(slug="kod-macerasi", name="Kod Macerası", cat="Kodlama", age="6-10", players="Tek kişilik",
       teaches="Algoritma ve kodlama mantığı",
       short="Karakteri komutlarla yönlendir, kodlamanın temelini öğren.",
       about="Kod Macerası, çocuklara blok/komut mantığıyla algoritma ve kodlamanın temellerini öğreten bir bulmaca oyunudur. Karakteri hedefe ulaştırmak için doğru komut dizisini kurarsın; problem çözme ve mantıksal sıralama gelişir. Kod öğrenmeye giriş için ücretsiz."),
  dict(slug="lego-world", name="LEGO World 3D", cat="3D / İnşa", age="6-10", players="Tek kişilik",
       teaches="Mekânsal düşünme ve yaratıcılık",
       short="3D açık dünyada keşfet ve inşa et, 9 seviye.",
       about="LEGO World 3D, çocukların 3 boyutlu bir dünyada keşfedip yapılar inşa ettiği yaratıcı bir oyundur. Mekânsal algı, planlama ve yaratıcılığı geliştirir. Tarayıcıda ücretsiz çalışır, indirme gerektirmez."),
  dict(slug="lego-macerasi", name="LEGO Macerası", cat="Kodlama / İnşa", age="6-10", players="Tek kişilik",
       teaches="Kodlama + inşa becerisi",
       short="LEGO temalı kodlama ve inşa görevleri, 3 seviye.",
       about="LEGO Macerası, kodlama mantığını LEGO temalı inşa görevleriyle birleştirir. Komutlarla parçaları yerleştirir, hedefleri tamamlarsın. Hem algoritma hem yaratıcılık geliştiren ücretsiz bir eğitici oyun."),
  dict(slug="renk-eslestirme", name="Renk Eşleştirme", cat="Okul Öncesi", age="4-7", players="Tek kişilik",
       teaches="Renk tanıma ve eşleştirme",
       short="Renkleri eşleştir, okul öncesi renk bilgini geliştir.",
       about="Renk Eşleştirme, küçük çocukların renkleri tanıyıp eşleştirdiği okul öncesi bir oyundur. Renk ayırt etme ve dikkat becerisini güçlendirir. Anaokulu yaş grubu için ücretsiz ve basit arayüzlü."),
  dict(slug="sayi-sayma", name="Sayı Sayma", cat="Okul Öncesi", age="4-7", players="Tek kişilik",
       teaches="Sayma ve sayı tanıma",
       short="Nesneleri say, sayıları eğlenerek öğren.",
       about="Sayı Sayma, çocukların ekrandaki nesneleri sayarak sayı kavramını öğrendiği okul öncesi bir oyundur. Sayı tanıma ve birebir eşleme becerisini geliştirir. Anaokulu için ücretsiz."),
  dict(slug="harf-tanima", name="Harf Tanıma", cat="Okul Öncesi", age="4-7", players="Tek kişilik",
       teaches="Harf tanıma ve okuma hazırlığı",
       short="Harfleri tanı, okumaya ilk adımı at.",
       about="Harf Tanıma, çocukların harfleri görsel olarak tanıyıp ayırt ettiği okuma-hazırlık oyunudur. Alfabe bilgisi ve okur-yazarlığa geçişi destekler. Anaokulu ve 1. sınıf için ücretsiz."),
  dict(slug="hece-birlestirme", name="Hece Birleştirme", cat="Okuma", age="5-8", players="Tek kişilik",
       teaches="Hece bilgisi ve okuma akıcılığı",
       short="Heceleri birleştirip kelime kur, okumayı pekiştir.",
       about="Hece Birleştirme, heceleri bir araya getirerek kelime oluşturduğun bir okuma oyunudur. Hece bilinci ve okuma akıcılığını geliştirir. İlkokul okuma çalışmaları için ücretsiz ve eğlenceli."),
  dict(slug="sekil-bulmaca", name="Şekil Bulmaca", cat="Bulmaca", age="4-8", players="Tek kişilik",
       teaches="Şekil-uzay ilişkisi ve dikkat",
       short="Şekilleri doğru yere yerleştir, bulmacayı çöz.",
       about="Şekil Bulmaca, çocukların şekilleri uygun boşluklara yerleştirdiği bir mantık ve dikkat oyunudur. Şekil tanıma ve uzamsal düşünmeyi geliştirir. Okul öncesi ve ilkokul için ücretsiz."),
  dict(slug="siralama", name="Sıralama", cat="Mantık", age="4-8", players="Tek kişilik",
       teaches="Sıralama ve karşılaştırma mantığı",
       short="Nesneleri doğru sıraya diz, mantığını geliştir.",
       about="Sıralama, nesneleri boyut/miktar gibi ölçütlere göre dizmeyi öğreten bir mantık oyunudur. Karşılaştırma ve sıralama becerisini geliştirir. Erken yaş matematik-mantık için ücretsiz."),
  dict(slug="boyama", name="Boyama", cat="Sanat", age="3-8", players="Tek kişilik",
       teaches="Yaratıcılık ve renk bilgisi",
       short="Resimleri istediğin gibi boya, 10 resim.",
       about="Boyama, çocukların hazır şablonları diledikleri renklerle boyadığı bir sanat oyunudur. Yaratıcılık, renk bilgisi ve ince motor becerisini destekler. Tüm yaşlara uygun, ücretsiz."),
  dict(slug="tuval", name="Tuval", cat="Sanat", age="5-10", players="Tek kişilik",
       teaches="Piksel sanatı ve yaratıcılık",
       short="Piksel piksel kendi resmini çiz.",
       about="Tuval, piksel tabanlı bir çizim/boyama oyunudur. Çocuklar kare kare kendi resimlerini oluşturur; yaratıcılık ve dikkat gelişir. Ücretsiz, üyeliksiz."),
  dict(slug="jigsaw", name="Jigsaw Bulmaca", cat="Bulmaca", age="5-10", players="Tek kişilik",
       teaches="Görsel algı ve sabır",
       short="Parçaları birleştirip resmi tamamla.",
       about="Jigsaw Bulmaca, dağılmış parçaları birleştirerek resmi tamamladığın klasik bir yapboz oyunudur. Görsel algı, sabır ve problem çözmeyi geliştirir. Çocuklar için ücretsiz."),
  dict(slug="desen", name="Desen Tamamlama", cat="Mantık", age="5-9", players="Tek kişilik",
       teaches="Örüntü ve mantıksal akıl yürütme",
       short="Eksik deseni bul, örüntüyü tamamla.",
       about="Desen Tamamlama, bir örüntünün eksik parçasını bulduğun mantık oyunudur. Örüntü algısı ve mantıksal akıl yürütmeyi geliştirir; matematiksel düşünmenin temelidir. Ücretsiz."),
  dict(slug="zindan-okcusu", name="Zindan Okçusu", cat="Aksiyon", age="7-10", players="Tek kişilik",
       teaches="Refleks, strateji ve karar verme",
       short="Okçunla zindanda hayatta kal, beceri ve ekipman geliştir.",
       about="Zindan Okçusu, dalga dalga gelen yaratıklara karşı okçunla hayatta kaldığın bir aksiyon-hayatta kalma oyunudur. Seviye atladıkça aktif/pasif beceriler seçer, ekipman geliştirir ve bölümleri geçersin. Refleks, strateji ve hızlı karar verme gelişir. Ücretsiz."),
  dict(slug="kelime-tahmin", name="Kelime Tahmin", cat="Kelime", age="7-10", players="Online çok oyunculu",
       teaches="Kelime bilgisi ve tümdengelim",
       short="Wordle tarzı: gizli kelimeyi arkadaşınla yarışarak bul.",
       about="Kelime Tahmin, Wordle tarzında gizli kelimeyi tahmin etmeye çalıştığın online bir kelime oyunudur. Arkadaşınla aynı anda yarışır, kelime dağarcığını ve mantıksal çıkarımı geliştirirsin. Ücretsiz, üyeliksiz online çok oyunculu."),
  dict(slug="harf-tahmin", name="Harf Tahmin", cat="Kelime", age="7-10", players="Online çok oyunculu",
       teaches="Kelime bilgisi ve tahmin",
       short="Adam asmaca tarzı: harf tahmin ederek kelimeyi çöz.",
       about="Harf Tahmin, adam asmaca mantığıyla harfleri tahmin ederek gizli kelimeyi bulduğun online bir oyundur. Kelime bilgisi ve tahmin stratejisini geliştirir. Arkadaşlarınla ücretsiz oyna."),
  dict(slug="altin-avi", name="Altın Avı", cat="Bilgi", age="7-10", players="Online (5-30 kişi)",
       teaches="Genel kültür ve hızlı düşünme",
       short="5-30 kişilik bilgi yarışı: sorularla altın topla, geliştir.",
       about="Altın Avı, 5-30 kişinin aynı anda katıldığı online bir bilgi yarışı oyunudur. Sorulara doğru cevap vererek altın toplar, saldırı/savunma geliştirir ve lider tablosunda yükselirsin. Genel kültür ve hızlı düşünmeyi geliştiren ücretsiz çok oyunculu oyun."),
  dict(slug="ates-buz", name="Ateş ve Buz", cat="İş birliği", age="6-10", players="2 kişilik / online",
       teaches="İş birliği ve koordinasyon",
       short="İki karakteri yönet, engelleri birlikte aş.",
       about="Ateş ve Buz, iki karakteri (ateş ve buz) birlikte yönlendirerek engelleri aştığın bir iş birliği oyunudur. Eş güdüm ve birlikte problem çözmeyi geliştirir. Ücretsiz oynanır."),
  dict(slug="tetris", name="Tetris", cat="Bulmaca", age="6-10", players="Tek kişilik",
       teaches="Mekânsal düşünme ve hızlı planlama",
       short="Blokları döndür, satırları doldur ve temizle.",
       about="Tetris, düşen blokları döndürüp yerleştirerek satırları tamamladığın klasik bir bulmaca-arcade oyunudur. Hız arttıkça mekânsal düşünme, planlama ve refleks gelişir. Tarayıcıda ücretsiz, üyeliksiz oynanır."),
  dict(slug="buz-kulesi", name="Buz Kulesi", cat="Arcade", age="6-10", players="Tek kişilik",
       teaches="Zamanlama, refleks ve denge",
       short="Platformdan platforma zıpla, düşmeden yüksel.",
       about="Buz Kulesi, Icy Tower tarzı dikey bir zıplama oyunudur; platformdan platforma sıçrayarak mümkün olduğunca yükselirsin. Zamanlama, refleks ve el-göz koordinasyonunu geliştirir. Ücretsiz, üyeliksiz, telefon ve tablette oynanır."),
  dict(slug="zipla-topla", name="Zıpla Topla", cat="Platform", age="5-10", players="Tek kişilik",
       teaches="Zamanlama, refleks ve koordinasyon",
       short="Mario tarzı platformlarda zıpla, topla ve ilerle.",
       about="Zıpla Topla, Mario tarzı 2 boyutlu bir platform macera oyunudur; engelleri aşar, eşyaları toplar ve bölümleri geçersin. Zamanlama, refleks ve el-göz koordinasyonunu geliştirir. Tarayıcıda ücretsiz oynanır."),
  dict(slug="egim", name="Eğim", cat="Arcade", age="6-10", players="Tek kişilik",
       teaches="Hızlı refleks ve odak",
       short="Eğimli sonsuz yolda topu yönet, engellerden kaç.",
       about="Eğim (Slope Ball), hız kazanan bir topu eğimli sonsuz bir yolda yönlendirerek engellerden kaçtığın bir refleks-arcade oyunudur. Hızlı tepki, odak ve el-göz koordinasyonunu geliştirir. Ücretsiz, üyeliksiz."),
  dict(slug="space-waves", name="SpaceWaves", cat="Arcade", age="6-10", players="Tek kişilik",
       teaches="Refleks ve odaklanma",
       short="Uzayda dalgalar ve geçitler arasından çarpmadan süzül.",
       about="SpaceWaves (Uzay Dalgaları), dar geçitler ve engel dalgaları arasından aracını çarpmadan süzdüğün hızlı bir refleks-arcade oyunudur. Odak, zamanlama ve hızlı tepkiyi geliştirir. Tarayıcıda ücretsiz oynanır."),
  dict(slug="sayilarla-boyama", name="Sayılarla Boyama", cat="Sanat", age="4-9", players="Tek kişilik",
       teaches="Sayı tanıma, dikkat ve ince motor beceri",
       short="Numarayı seç, aynı numaralı kutuları boya, resmi ortaya çıkar.",
       about="Sayılarla Boyama, her numaraya karşılık gelen kutuları boyayarak gizli resmi ortaya çıkardığın bir sanat ve sayı oyunudur. Sayı tanıma, dikkat ve ince motor becerisini geliştirir. Çocuklar için ücretsiz, üyeliksiz."),
  dict(slug="emoji-yapici", name="Emoji Yapıcı", cat="Sanat", age="4-10", players="Tek kişilik",
       teaches="Yaratıcılık ve görsel tasarım",
       short="Parçaları seç, kendi emoji yüzünü yarat.",
       about="Emoji Yapıcı, göz, ağız ve aksesuar parçalarını birleştirerek kendi emoji yüzünü tasarladığın yaratıcı bir oyundur. Yaratıcılık ve görsel tasarımı geliştirir. Tarayıcıda ücretsiz, üyeliksiz."),
  dict(slug="penalti-mp", name="Penaltı Online", cat="Spor", age="6-10", players="Online 2 kişilik",
       teaches="Zamanlama, refleks ve rekabet",
       short="Arkadaşınla online penaltı düellosu: at ve kurtar.",
       about="Penaltı Online, bir arkadaşınla aynı anda oynadığın çevrim içi penaltı düellosudur; sırayla şut çeker ve kaleyi korursun. Zamanlama, refleks ve rekabet duygusunu geliştirir. Üyeliksiz, ücretsiz online oynanır."),
  dict(slug="kelimelik", name="Kelimelik", cat="Kelime", age="7-10", players="Online 2 kişilik",
       teaches="Kelime bilgisi, strateji ve Türkçe yazım",
       short="Arkadaşınla 1v1 Türkçe kelime oyunu: harfleri diz, kelime kur, puan topla.",
       about="Kelimelik, Scrabble tarzında 1v1 oynanan online Türkçe kelime oyunudur. 15x15 tahtada harf taşlarını dizerek kelimeler kurar, harf ve kelime çarpanlı özel karelerle puan toplar, arkadaşına karşı yarışırsın. Kelime dağarcığı, strateji ve Türkçe yazımı geliştiren ücretsiz, üyeliksiz online çok oyunculu bir oyun."),
  dict(slug="bil-ve-fethet", name="Bil ve Fethet", cat="Bilgi / Strateji", age="8-12", players="Tek kişilik",
       teaches="Genel kültür, strateji ve hızlı karar verme",
       short="Soruları cevapla, ülkeleri fethet: dünya haritasında bilgi savaşı.",
       about="Bil ve Fethet, gerçek dünya haritası üzerinde oynanan soru-cevap temelli bir fetih oyunudur. Komşu ülkelere saldırır, 10 soruluk bilgi savaşlarıyla toprak kazanır, gelirini yönetip saldırı ve savunma seviyeni geliştirirsin. Anaokulundan liseye kademe seçimi ve matematik, fen, Türkçe, sosyal, coğrafya, İngilizce ders seçenekleriyle hem genel kültürü hem stratejik düşünmeyi geliştirir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="kelime-madeni-3d", name="Kelime Madeni 3D", cat="3D / İngilizce", age="8-12", players="Tek kişilik",
       teaches="İngilizce kelime dağarcığı ve mekânsal düşünme",
       short="Minecraft tarzı 3D madende kaz, üret — cevherler İngilizce soru sorar!",
       about="Kelime Madeni 3D, Minecraft tarzı blok dünyasında geçen eğitsel bir madencilik oyunudur. Ağaç kes, kazma üret, mağaralara in; kömür, demir, elmas ve kristal kazdığında İngilizce kelime sorusu gelir — doğru bilirsen cevher senindir. Üretim zinciri, 10 görevlik macera ve öğrendiğin kelimelerin defteriyle İngilizce kelime dağarcığını oyun içinde geliştirirsin. Dünya otomatik kaydedilir, kaldığın yerden devam edersin. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="bilgi-madencisi", name="Bilgi Madencisi", cat="Matematik", age="8-12", players="Tek kişilik",
       teaches="Dört işlem akıcılığı, kesirler ve hızlı karar verme",
       short="Soru yukarıda, cevaplar yerin altında — kancayı doğru taşa bırak!",
       about="Bilgi Madencisi, klasik altın madencisi mekaniğini matematikle birleştiren bir refleks ve işlem oyunudur. Ekranın üstünde bir soru görünür, yerin altında 4 cevap taşı durur; sallanan kancayı doğru taşa bırakırsan puan kazanırsın — yanlış taş ağırdır ve zamanını yer. Art arda doğrularda combo çarpanı, 5 doğruda dinamit! Etek'ten Zirve'ye 4 zorluk seviyesiyle toplama, çıkarma, çarpım tablosu, bölme, kesirler ve yüzdeler 60 saniyelik vardiyalarda akıcı hale gelir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="matematik-patlatma", name="Matematik Patlatma", cat="Matematik", age="8-12", players="Tek kişilik",
       teaches="Zihinden işlem akıcılığı ve sayı hissi",
       short="Komşu taşları sürükle, hedef sayıyı tuttur — zincir ne kadar uzun, puan o kadar dev!",
       about="Matematik Patlatma, sayı taşlarından zincir kurarak hedefi tutturduğun 60 saniyelik bir işlem akıcılığı oyunudur. Hedef üstte yazar (örneğin 'Toplamı 12 yap'); komşu taşları parmağınla sürükleyip zincirin toplamı hedefe tam ulaşınca taşlar patlar, üstten yenileri düşer. Puan taş sayısının karesiyle büyür — uzun zincir kurmak hep kazandırır. Etek'te kolay toplamalar, Tırmanış'ta fark soruları, Zirve'de çarpım hedefleriyle zihinden işlem hızı eğlenerek gelişir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="kelime-balonu", name="Kelime Balonu", cat="İngilizce", age="8-12", players="Tek kişilik",
       teaches="İngilizce kelime dağarcığı ve yazım (spelling)",
       short="İngilizce kelimenin harflerini balonlardan vur — kelime tamamlanınca büyük patlama!",
       about="Kelime Balonu, klasik balon patlatma (bubble shooter) mekaniğini İngilizce kelime öğrenimiyle birleştirir. Üstte hedef kelimenin resmi ve Türkçesi görünür (🐱 kedi); balonun içindeki doğru harfleri vurarak C-A-T gibi kelimeleri tamamlarsın. Doğru harf patlar ve yanındaki aynı harfli balonları da götürür; yanlış vuruş balonu kümeye yapıştırır — dikkat! Etek'te 3 harfli kolay kelimeler, Tırmanış'ta 6+ harf sıralı vurma, Zirve'de resim ipucu olmadan sadece Türkçe karşılıkla oynanır. Nişan alma, sekme ve zamanlama becerisiyle İngilizce yazım bir arada gelişir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
]

PAGE_TMPL = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#4AABE0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="keywords" content="{kw}">
<meta name="author" content="Bilnet Oyun">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:title" content="{ogt}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Bilnet Oyun">
<meta property="og:image" content="{site}/og-image.png">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ogt}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{site}/og-image.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<script type="application/ld+json">
{jsonld}
</script>
<style>
*{{box-sizing:border-box}}body{{margin:0;font-family:'Nunito',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
background:linear-gradient(160deg,#eaf4fb,#dcebf7);color:#1f2a44;line-height:1.7}}
.wrap{{max-width:760px;margin:0 auto;padding:18px}}
header a{{color:#1A5FB4;text-decoration:none;font-weight:800}}
.crumb{{font-size:13px;color:#5b6b86;margin:6px 0 18px}}
.crumb a{{color:#1A5FB4;text-decoration:none}}
.card{{background:#fff;border-radius:20px;padding:22px;box-shadow:0 10px 34px rgba(40,60,110,.12)}}
h1{{font-size:clamp(24px,6vw,38px);margin:.1em 0 .2em}}
.tagline{{color:#475569;font-size:16px;margin:0 0 16px}}
.play{{display:inline-block;background:linear-gradient(180deg,#ffd24a,#f5a623);color:#3a2a00;font-weight:900;
font-size:18px;padding:14px 30px;border-radius:14px;text-decoration:none;box-shadow:0 8px 22px rgba(245,166,35,.4);margin:6px 0 18px}}
.meta{{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}}
.meta span{{background:#eaf2fb;color:#1A5FB4;border:1px solid #c5dcf3;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700}}
.about{{font-size:16px;color:#27364f}}
.more{{margin-top:22px;font-size:15px}}.more a{{color:#1A5FB4;font-weight:700;text-decoration:none}}
footer{{margin-top:26px;font-size:13px;color:#64748b;text-align:center}}
footer a{{color:#1A5FB4;text-decoration:none}}
</style>
</head>
<body>
<div class="wrap">
<header><a href="/">🎮 Bilnet Oyun</a></header>
<div class="crumb"><a href="/">Ana Sayfa</a> › <a href="/oyunlar/">Oyunlar</a> › {name}</div>
<main class="card">
<h1>{h1}</h1>
<p class="tagline">{short}</p>
<a class="play" href="/?oyun={slug}">▶ Hemen Oyna (Ücretsiz)</a>
<div class="meta"><span>👤 {players}</span><span>🎯 {age} yaş</span><span>🏷️ {cat}</span><span>🧠 {teaches}</span></div>
<p class="about">{about}</p>
<p class="about"><strong>Nasıl oynanır?</strong> “Hemen Oyna” butonuna dokun — kurulum, indirme veya üyelik gerekmez. {name}, telefon, tablet ve bilgisayarda tarayıcıda ücretsiz çalışır.</p>
<div class="more">▸ <a href="/oyunlar/">Tüm eğitici oyunları gör</a></div>
</main>
<footer>Bilnet Oyun — Bilnet Okulları Eğitici Oyun Platformu · <a href="/">Ana Sayfa</a> · <a href="/oyunlar/">Oyunlar</a></footer>
</div>
</body>
</html>
"""

def esc(s): return html.escape(s, quote=True)

def jsonld_for(g, url):
    import json
    data = {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": g["name"] + " - Bilnet Oyun",
        "url": url,
        "description": g["about"],
        "inLanguage": "tr",
        "genre": g["cat"],
        "gamePlatform": "Web Browser",
        "applicationCategory": "Game",
        "operatingSystem": "Web Browser",
        "playMode": "MultiPlayer" if "nline" in g["players"] or "kişi" in g["players"] else "SinglePlayer",
        "isAccessibleForFree": True,
        "audience": {"@type": "EducationalAudience", "educationalRole": "student", "suggestedMinAge": 4},
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "TRY"},
        "publisher": {"@type": "Organization", "name": "Bilnet Oyun", "url": SITE + "/"}
    }
    return json.dumps(data, ensure_ascii=False, indent=2)

def build_page(g):
    url = f"{SITE}/oyunlar/{g['slug']}/"
    # cat zaten "Online" iceriyorsa "Online" on-ekini ekleme (cift "Online" olmasin)
    online_pre = "" if "nline" in g['cat'].lower() else "Online "
    title = f"{g['name']} Oyna – Ücretsiz {online_pre}{g['cat']} | Bilnet Oyun"
    desc = f"{g['short']} {g['name']} — {g['age']} yaş çocuklar için ücretsiz eğitici oyun. Üyeliksiz, telefon/tablet/bilgisayarda oynanır. {g['teaches']}."
    kw = f"{g['name'].lower()}, {g['name'].lower()} oyna, {g['name'].lower()} ücretsiz, online {g['cat'].lower()} oyunu, çocuk oyunu, eğitici oyun, bilnet oyun"
    return PAGE_TMPL.format(
        title=esc(title), desc=esc(desc), kw=esc(kw), url=url, ogt=esc(g["name"] + " Oyna | Bilnet Oyun"),
        site=SITE, jsonld=jsonld_for(g, url), name=esc(g["name"]), h1=esc(g["name"] + " Oyna"),
        short=esc(g["short"]), slug=g["slug"], players=esc(g["players"]), age=esc(g["age"]),
        cat=esc(g["cat"]), teaches=esc(g["teaches"]), about=esc(g["about"]))

HUB_TMPL = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#4AABE0">
<title>Tüm Oyunlar – {n} Ücretsiz Eğitici Çocuk Oyunu | Bilnet Oyun</title>
<meta name="description" content="Bilnet Oyun'da {n}+ ücretsiz eğitici çocuk oyunu: satranç, penaltı, matematik, kodlama, hafıza, LEGO World 3D ve daha fazlası. Üyeliksiz, telefon/tablet/bilgisayarda oynanır.">
<meta name="keywords" content="eğitici oyunlar, çocuk oyunları, ücretsiz online oyun, anaokulu oyunları, ilkokul oyunları, satranç oyna, matematik oyunu, kodlama oyunu, bilnet oyun">
<link rel="canonical" href="{site}/oyunlar/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:title" content="Tüm Oyunlar | Bilnet Oyun">
<meta property="og:description" content="{n}+ ücretsiz eğitici çocuk oyunu — satranç, matematik, kodlama, penaltı ve daha fazlası.">
<meta property="og:url" content="{site}/oyunlar/">
<meta property="og:image" content="{site}/og-image.png">
<meta property="og:locale" content="tr_TR">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
body{{margin:0;font-family:'Nunito',system-ui,sans-serif;background:linear-gradient(160deg,#eaf4fb,#dcebf7);color:#1f2a44}}
.wrap{{max-width:920px;margin:0 auto;padding:20px}}h1{{font-size:clamp(24px,6vw,40px)}}
a.home{{color:#1A5FB4;text-decoration:none;font-weight:800}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin-top:18px}}
.g{{background:#fff;border-radius:16px;padding:16px;box-shadow:0 8px 24px rgba(40,60,110,.1);text-decoration:none;color:inherit;display:block}}
.g h2{{font-size:18px;margin:0 0 6px;color:#1A5FB4}}.g p{{margin:0;font-size:14px;color:#475569}}
.g .t{{display:inline-block;margin-top:8px;font-size:12px;font-weight:800;color:#f5a623}}
footer{{margin-top:24px;text-align:center;font-size:13px;color:#64748b}}footer a{{color:#1A5FB4;text-decoration:none}}
</style>
</head>
<body>
<div class="wrap">
<p><a class="home" href="/">🎮 Bilnet Oyun</a></p>
<h1>Tüm Eğitici Oyunlar</h1>
<p>Anaokulu ve ilkokul çocukları için {n}+ ücretsiz, üyeliksiz eğitici oyun. Bir oyuna dokun, tarayıcıda hemen oyna.</p>
<div class="grid">
{cards}
</div>
<footer>Bilnet Oyun — Bilnet Okulları Eğitici Oyun Platformu · <a href="/">Ana Sayfa</a></footer>
</div>
</body>
</html>
"""

def build_hub():
    cards = []
    for g in GAMES:
        cards.append(
            f'<a class="g" href="/oyunlar/{g["slug"]}/"><h2>{esc(g["name"])}</h2>'
            f'<p>{esc(g["short"])}</p><span class="t">{esc(g["cat"])} · {esc(g["age"])} yaş ›</span></a>')
    return HUB_TMPL.format(n=len(GAMES), site=SITE, cards="\n".join(cards))

def build_sitemap():
    urls = [(SITE + "/", "1.0"), (SITE + "/oyunlar/", "0.9")]
    urls += [(f"{SITE}/oyunlar/{g['slug']}/", "0.8") for g in GAMES]
    items = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>{p}</priority>\n  </url>"
        for u, p in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{items}\n</urlset>\n'

def main():
    n = 0
    for g in GAMES:
        d = os.path.join(ROOT, "oyunlar", g["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(build_page(g))
        n += 1
    with open(os.path.join(ROOT, "oyunlar", "index.html"), "w", encoding="utf-8") as f:
        f.write(build_hub())
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(build_sitemap())
    print(f"OK: {n} oyun landing + /oyunlar/ hub + sitemap.xml ({n+2} URL) uretildi.")
    print("Slug listesi:", ", ".join(g["slug"] for g in GAMES))

if __name__ == "__main__":
    main()
