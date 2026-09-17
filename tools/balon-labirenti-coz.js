#!/usr/bin/env node
/* ============================================
   Balon Labirenti — çözüm tarayıcı (yazım aracı)
   --------------------------------------------
   Saf fizik + seviye dosyalarını tarayıcısız yükler (tests/balon-labirenti.spec.js ile aynı yol) ve her
   labirent için açı × kuvvet ızgarasını tarayıp 3×3 toleransta (açı ±1°, kuvvet ±2) HEPSİ temizleyen,
   ayrıca 5×5 komşulukta en çok geçen "dayanıklı merkez" atışı önerir → `cozum` alanına yapıştırılır.
   Kullanım:
     node tools/balon-labirenti-coz.js                 # tüm labirentler için öneri
     node tools/balon-labirenti-coz.js b1-3 --ascii    # tek labirent + ASCII çizim (duvar #, balon o, yol .)
     node tools/balon-labirenti-coz.js --check         # kayıtlı cozum'ları 3×3 ile doğrula (çıkış 1 = hata)
     node tools/balon-labirenti-coz.js b2-3 --yaz      # öneriyi levels dosyasındaki cozum alanına yaz
   Deterministik olduğu için sonuç oyunla birebir aynıdır; bağımlılık yok.
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/games/balon-labirenti-fizik.js', 'js/games/balon-labirenti-levels.js'];

function loadPure() {
    const window = {};
    const sandbox = { window };
    for (const rel of FILES) vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
    return { F: window.BALON_LABIRENTI_FIZIK, LEVELS: window.BALON_LABIRENTI_LEVELS };
}

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const ASCII = args.includes('--ascii');
const YAZ = args.includes('--yaz');     // önerilen cozum'u levels dosyasına yaz
const LEVELS_PATH = path.join(ROOT, 'js/games/balon-labirenti-levels.js');
function cozumYaz(id, aci, kuvvet) {
    const src = fs.readFileSync(LEVELS_PATH, 'utf8');
    const guvenliId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');   // id'de regex metakarakteri olmasın
    const re = new RegExp("(id: '" + guvenliId + "'[\\s\\S]*?cozum: \\{ aci: )\\d+(, kuvvet: )\\d+( \\})");
    if (!re.test(src)) { console.error('cozum satırı bulunamadı: ' + id); return false; }
    fs.writeFileSync(LEVELS_PATH, src.replace(re, '$1' + aci + '$2' + kuvvet + '$3'));
    return true;
}
const wanted = args.filter((a) => !a.startsWith('--'));

const { F, LEVELS } = loadPure();
const { SABIT } = F;

const gecti = (m, aci, kuvvet) => {
    if (kuvvet < 0 || kuvvet > 100) return false;
    const r = F.simulate(m, { aci: ((aci % 360) + 360) % 360, kuvvet });
    return r.hepsi && r.sure <= 10;
};
// 3×3 komşuluk: 9/9 mu?
function dokuz(m, aci, kuvvet) {
    let n = 0;
    for (const da of [-1, 0, 1]) for (const dk of [-2, 0, 2]) if (gecti(m, aci + da, kuvvet + dk)) n++;
    return n;
}
// 5×5 geniş komşuluk (açı ±2, kuvvet ±4): dayanıklılık ölçüsü
function yirmibes(m, aci, kuvvet) {
    let n = 0;
    for (const da of [-2, -1, 0, 1, 2]) for (const dk of [-4, -2, 0, 2, 4]) if (gecti(m, aci + da, kuvvet + dk)) n++;
    return n;
}

function ascii(m, shot) {
    const CW = 100, CH = 40;
    const sx = SABIT.W / CW, sy = SABIT.H / CH;
    const g = Array.from({ length: CH }, () => new Array(CW).fill(' '));
    const put = (x, y, ch) => {
        const cx = Math.floor(x / sx), cy = Math.floor(y / sy);
        if (cx >= 0 && cx < CW && cy >= 0 && cy < CH) g[cy][cx] = ch;
    };
    const kutu = (r, ch) => {
        for (let y = r.y; y < r.y + r.h; y += sy / 2) for (let x = r.x; x < r.x + r.w; x += sx / 2) put(x, y, ch);
    };
    for (const z of m.hava || []) kutu(z, '~');
    for (const d of m.duvarlar || []) kutu(d, '#');
    for (const p of m.hareketli || []) { kutu(p, '='); kutu({ x: p.hedef.x, y: p.hedef.y, w: p.w, h: p.h }, '-'); }
    if (shot) {
        const r = F.simulate(m, shot, { yol: true });
        for (const [x, y] of r.yol) put(x, y, '.');
    }
    m.balonlar.forEach((b, i) => put(b.x, b.y, String(i % 10)));
    put(m.baslangic.x, m.baslangic.y, 'S');
    return g.map((row) => row.join('')).join('\n');
}

let hata = 0;
const secili = wanted.length ? LEVELS.filter((m) => wanted.includes(m.id)) : LEVELS;
if (!secili.length) { console.error('Labirent bulunamadı: ' + wanted.join(', ')); process.exit(2); }

for (const m of secili) {
    const t0 = Date.now();
    if (CHECK) {
        const n = m.cozum ? dokuz(m, m.cozum.aci, m.cozum.kuvvet) : 0;
        const ok = n === 9;
        if (!ok) hata++;
        console.log(`${ok ? 'OK ' : 'HATA'} ${m.id.padEnd(5)} ${m.ad.padEnd(20)} cozum=${JSON.stringify(m.cozum)} 3×3: ${n}/9`);
        continue;
    }
    // Kaba tarama: açı 0..359 adım 3, kuvvet 12..98 adım 3
    const adaylar = [];
    for (let aci = 0; aci < 360; aci += 3) {
        for (let kuvvet = 12; kuvvet <= 98; kuvvet += 3) {
            if (gecti(m, aci, kuvvet)) adaylar.push({ aci, kuvvet });
        }
    }
    // İnce tarama: adayların ±1 açı / ±1 kuvvet çevresinde 9/9 ve 25'lik dayanıklılık
    // Adayları düşük kuvvetten yükseğe sırala (çocuk için daha az çekiş) ve ilk 25/25'te dur.
    // Orta kuvvet (35-90) önce: çocuğun doğal atışı; sonra düşük, sonra yüksek. Aynı bantta düşükten yükseğe.
    const bant = (k) => (k >= 35 && k <= 90 ? 0 : k < 35 ? 1 : 2);
    adaylar.sort((a, b) => bant(a.kuvvet) - bant(b.kuvvet) || a.kuvvet - b.kuvvet || a.aci - b.aci);
    const gorulen = new Set();
    let enIyi = null;
    tarama:
    for (const a of adaylar) {
        for (let da = -1; da <= 1; da++) {
            for (let dk = -1; dk <= 1; dk++) {
                const aci = ((a.aci + da) % 360 + 360) % 360, kuvvet = a.kuvvet + dk;
                if (kuvvet < 12 || kuvvet > 98) continue;
                const k = aci + ':' + kuvvet;
                if (gorulen.has(k)) continue;
                gorulen.add(k);
                const n9 = dokuz(m, aci, kuvvet);
                if (n9 < 9) continue;
                const n25 = yirmibes(m, aci, kuvvet);
                const sure = F.simulate(m, { aci, kuvvet }).sure;
                if (!enIyi || n25 > enIyi.n25 || (n25 === enIyi.n25 && sure < enIyi.sure)) enIyi = { aci, kuvvet, n25, sure };
                if (n25 === 25) break tarama;
            }
        }
    }
    const ms = Date.now() - t0;
    if (!enIyi) {
        hata++;
        console.log(`YOK  ${m.id.padEnd(5)} ${m.ad.padEnd(20)} kaba geçen: ${adaylar.length}, 9/9 dayanıklı merkez bulunamadı (${ms} ms)`);
    } else {
        const mevcut = m.cozum && dokuz(m, m.cozum.aci, m.cozum.kuvvet);
        console.log(`${m.id.padEnd(5)} ${m.ad.padEnd(20)} öneri cozum: { aci: ${enIyi.aci}, kuvvet: ${enIyi.kuvvet} }  25'lik: ${enIyi.n25}/25  süre ${enIyi.sure.toFixed(2)} s  kaba geçen: ${adaylar.length}  mevcut: ${m.cozum ? JSON.stringify(m.cozum) + ' ' + mevcut + '/9' : '—'} (${ms} ms)`);
        if (YAZ && cozumYaz(m.id, enIyi.aci, enIyi.kuvvet)) console.log(`      → yazıldı: ${m.id} cozum { aci: ${enIyi.aci}, kuvvet: ${enIyi.kuvvet} }`);
    }
    if (ASCII) console.log(ascii(m, enIyi ? { aci: enIyi.aci, kuvvet: enIyi.kuvvet } : m.cozum) + '\n');
}
process.exit(hata ? 1 : 0);
