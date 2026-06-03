/* Çarpanlar ve Katlar — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   EBOB/EKOK/bölen sayısı/asal çarpan/bölünebilme hesaplarını kendisi yapıp cevap
   anahtarıyla karşılaştırır. (Orijinal 001-024 verify-carpanlar-katlar.ps1'dedir.)
   Kullanım: node verify-carpanlar-katlar2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'carpanlar-katlar.json'), 'utf8'));

const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a * b / gcd(a, b);
function factor(n) { const f = {}; let m = n; for (let p = 2; p * p <= m; p++) while (m % p === 0) { f[p] = (f[p] || 0) + 1; m /= p; } if (m > 1) f[m] = (f[m] || 0) + 1; return f; }
const divisorCount = n => Object.values(factor(n)).reduce((a, e) => a * (e + 1), 1);
const distinctPrimes = n => Object.keys(factor(n)).map(Number).sort((a, b) => a - b);
const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };

// "2³·5" -> product & all-prime check
const SUP = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7 };
function parseFact(s) {
  const toks = String(s).split(/[·×*]/).map(t => t.trim()).filter(Boolean);
  let prod = 1, allPrime = true;
  for (const t of toks) {
    const m = t.match(/^(\d+)([²³⁴⁵⁶⁷]?)$/);
    if (!m) return { ok: false };
    const base = parseInt(m[1], 10), exp = m[2] ? SUP[m[2]] : 1;
    if (!isPrime(base)) allPrime = false;
    prod *= Math.pow(base, exp);
  }
  return { prod, allPrime };
}

// her derinleştirme sorusu için tip + beklenen
const bek = {
  '025': { t: 'asalset', n: 24 }, '026': { t: 'carpanim', n: 50 }, '027': { t: 'sayi', v: divisorCount(12) },
  '028': { t: 'sayi', v: gcd(8, 12) }, '029': { t: 'sayi', v: lcm(6, 9) }, '030': { t: 'bolunen', d: 2 },
  '031': { t: 'asalset', n: 45 }, '032': { t: 'sayi', v: divisorCount(100) }, '033': { t: 'sayi', v: gcd(18, 24) },
  '034': { t: 'sayi', v: lcm(4, 10) }, '035': { t: 'carpanim', n: 72 }, '036': { t: 'sayi', v: divisorCount(36) },
  '037': { t: 'sayi', v: gcd(15, 20) }, '038': { t: 'sayi', v: lcm(8, 6) }, '039': { t: 'bolunen', d: 3 },
  '040': { t: 'sayi', v: distinctPrimes(60).length }, '041': { t: 'sayi', v: gcd(16, 24) }, '042': { t: 'sayi', v: lcm(9, 12) },
  '043': { t: 'sayi', v: divisorCount(84) }, '044': { t: 'sayi', v: gcd(30, 45) }, '045': { t: 'sayi', v: lcm(10, 15) },
  '046': { t: 'carpanim', n: 120 }, '047': { t: 'sayi', v: 6 * 36 }, '048': { t: 'sayi', v: gcd(50, 75) },
  // --- TUR-2 (049-072) ---
  '049': { t: 'sayi', v: gcd(10, 15) }, '050': { t: 'sayi', v: lcm(4, 6) }, '051': { t: 'sayi', v: divisorCount(16) },
  '052': { t: 'bolunen', d: 5 }, '053': { t: 'sayi', v: gcd(12, 18) }, '054': { t: 'sayi', v: lcm(5, 6) },
  '055': { t: 'sayi', v: distinctPrimes(30).length }, '056': { t: 'bolunen', d: 3 },
  '057': { t: 'sayi', v: gcd(24, 36) }, '058': { t: 'sayi', v: lcm(8, 12) }, '059': { t: 'sayi', v: divisorCount(24) },
  '060': { t: 'carpanim', n: 90 }, '061': { t: 'sayi', v: gcd(36, 48) }, '062': { t: 'sayi', v: lcm(6, 10) },
  '063': { t: 'asalset', n: 42 }, '064': { t: 'sayi', v: divisorCount(48) },
  '065': { t: 'carpanim', n: 180 }, '066': { t: 'sayi', v: gcd(48, 60) }, '067': { t: 'sayi', v: lcm(9, 15) },
  '068': { t: 'sayi', v: divisorCount(64) }, '069': { t: 'sayi', v: gcd(72, 108) }, '070': { t: 'sayi', v: lcm(12, 18) },
  '071': { t: 'bolunen', d: 9 }, '072': { t: 'carpanim', n: 200 },
  // --- TUR-3 (073-096) ---
  '073': { t: 'sayi', v: gcd(6, 8) }, '074': { t: 'sayi', v: lcm(2, 5) }, '075': { t: 'sayi', v: divisorCount(8) },
  '076': { t: 'sayi', v: gcd(9, 12) }, '077': { t: 'sayi', v: lcm(3, 4) }, '078': { t: 'bolunen', d: 6 },
  '079': { t: 'sayi', v: divisorCount(9) }, '080': { t: 'bolunen', d: 4 },
  '081': { t: 'sayi', v: gcd(20, 30) }, '082': { t: 'sayi', v: lcm(6, 14) }, '083': { t: 'sayi', v: divisorCount(18) },
  '084': { t: 'asalset', n: 63 }, '085': { t: 'sayi', v: lcm(6, 15) }, '086': { t: 'sayi', v: divisorCount(20) },
  '087': { t: 'sayi', v: gcd(40, 60) }, '088': { t: 'carpanim', n: 60 },
  '089': { t: 'sayi', v: lcm(12, 16) }, '090': { t: 'sayi', v: gcd(56, 84) }, '091': { t: 'sayi', v: divisorCount(72) },
  '092': { t: 'carpanim', n: 126 }, '093': { t: 'sayi', v: distinctPrimes(210).length }, '094': { t: 'sayi', v: gcd(90, 120) },
  '095': { t: 'sayi', v: lcm(15, 20) }, '096': { t: 'carpanim', n: 300 }
};

const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);
function harfBul(q, b) {
  const H = Object.keys(q.siklar);
  if (b.t === 'sayi') { const e = H.filter(h => pnum(q.siklar[h]) === b.v); return e.length === 1 ? e[0] : '?'; }
  if (b.t === 'bolunen') { const e = H.filter(h => pnum(q.siklar[h]) % b.d === 0); return e.length === 1 ? e[0] : '?çok'; }
  if (b.t === 'asalset') { const want = distinctPrimes(b.n).join(','); const e = H.filter(h => (String(q.siklar[h]).match(/\d+/g) || []).map(Number).sort((a, c) => a - c).join(',') === want); return e.length === 1 ? e[0] : '?'; }
  if (b.t === 'carpanim') { const e = H.filter(h => { const r = parseFact(q.siklar[h]); return r.ok !== false && r.allPrime && r.prod === b.n; }); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }
  return '?';
}

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { atla++; continue; }   // 001-024 (ps1'de)
  const h = harfBul(q, b);
  const ok = h === q.dogruCevap;
  if (ok) pass++; else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} (${b.t}${b.v !== undefined ? '=' + b.v : ''}) FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
