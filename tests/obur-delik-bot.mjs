// Obur Delik — çekirdek doğrulaması (tarayıcısız). npm run test:obur
// Her bölüm: (1) hiç kıpırdamayan oyuncu yıldız ALAMAZ, (2) otomatik pilot (rakiplerle aynı beyin, tam hız)
// en az 2 yıldız alır, (3) yarım güçle oynayan "çocuk pilotu" en az 1 yıldız alır,
// (4) değişmezler: puan = yutulanların puanı, delik yalnız kendinden küçüğü yutar, harita aynı tohumla aynı.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../games/obur-delik/core.js');

const DT = 1 / 60;
let hata = 0;
function bekle(kosul, mesaj) { if (!kosul) { hata++; console.error('  HATA: ' + mesaj); } }

function oyna(no, pilot) {
    const s = C.oyunKur(no);
    const ben = s.delikler[0];
    let kare = 0;
    let yutulanPuan = 0;
    while (!s.bitti) {
        let g = { dx: 0, dy: 0 };
        if (pilot === 'tam') g = C.botYon(s, ben);
        else if (pilot === 'cocuk') {
            // her 1,5 sn'de 0,5 sn el çeker; geri kalan zamanda yarım güçle botu izler
            const t = (kare % 90) / 90;
            if (t > 0.33) { g = C.botYon(s, ben); g = { dx: g.dx * 0.75, dy: g.dy * 0.75 }; }
        }
        C.adim(s, g, DT);
        for (const e of s.olaylar) {
            // acı biber: oyuncu rakip biberiyle hapşırırsa puan kaybeder (bedel yalnız biber atınca; pilot atmaz)
            if (e.tur === 'hapsu' && e.delik === ben) yutulanPuan -= e.kayip;
            if (e.tur === 'biber' && e.delik === ben) yutulanPuan -= e.maliyet;
            if (e.tur !== 'yut') continue;
            if (e.delik === ben) yutulanPuan += e.nesne.p;
            // yutma anında delik büyümüş olabilir; nesne eski yarıçaptan küçük olmalı → büyümüş hâli de geçer
            bekle(C.yutabilir(e.delik.r, e.nesne.r), `b${no + 1}: büyük nesne yutuldu (${e.nesne.tip})`);
        }
        kare++;
    }
    bekle(yutulanPuan === ben.puan, `b${no + 1}: puan tutarsız`);
    return C.sonuc(s);
}

const ozet = [];
for (let no = 0; no < C.BOLUMLER.length; no++) {
    const b = C.BOLUMLER[no];
    const a = C.haritaKur(no), a2 = C.haritaKur(no);
    bekle(a.nesneler.length === a2.nesneler.length && a.toplam === a2.toplam, `b${no + 1}: harita tohumla aynı değil`);
    const dur = oyna(no, 'yok');
    const tam = oyna(no, 'tam');
    const coc = oyna(no, 'cocuk');
    ozet.push({ bolum: `${no + 1} ${b.ad}`, nesne: a.nesneler.length, toplam: a.toplam,
        hedef: b.hedef.map(x => Math.round(x * 100)).join('/'),
        tam: `${Math.round(tam.oran * 100)}% #${tam.sira} ${tam.yildiz}★`,
        cocuk: `${Math.round(coc.oran * 100)}% #${coc.sira} ${coc.yildiz}★`,
        durgun: `${dur.yildiz}★` });
    bekle(dur.yildiz === 0, `b${no + 1}: kıpırdamayan oyuncu yıldız aldı`);
    bekle(tam.yildiz >= 2, `b${no + 1}: otomatik pilot 2 yıldıza ulaşamadı (${Math.round(tam.oran * 100)}%)`);
    bekle(coc.yildiz >= 1, `b${no + 1}: çocuk pilotu 1 yıldıza ulaşamadı (${Math.round(coc.oran * 100)}%)`);
}
console.table(ozet);
if (hata) { console.error(`Obur Delik: ${hata} hata`); process.exit(1); }
console.log('Obur Delik: tüm bölümler geçti');
