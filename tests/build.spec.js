/* ============================================
   tools/build.js birim testleri — küçük sahte siteler geçici klasörde üretilir,
   build yerinde ya da --out ile çalıştırılır, çıktı ve çıkış kodu denetlenir.
   Tarayıcı gerekmez (Playwright yalnız koşucu olarak kullanılır).
   Çalıştırma: npm run test:build
   ============================================ */
'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const BUILD_JS = path.resolve(__dirname, '..', 'tools', 'build.js');
const HASH_RE = /\?h=[0-9a-f]{10}/;

// Sahte site: { 'göreli/yol': 'içerik' } → geçici kök
function makeSite(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bilnet-build-'));
    for (const [rel, content] of Object.entries(files)) {
        const abs = path.join(root, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, content);
    }
    return root;
}

function runBuild(root, ...args) {
    const r = spawnSync(process.execPath, [BUILD_JS, '--root', root, ...args], { encoding: 'utf8' });
    return { code: r.status, out: r.stdout + r.stderr };
}

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// Hub'ı temsil eden en küçük site: HTML etiketleri, kayıt defteri dizisi, iframe sarmalayıcı,
// ES modül döngüsü, dış URL, font preload, özel sorgu, yorum/seçici içindeki sahte yollar.
function hubSite() {
    return {
        'index.html': [
            '<!doctype html><html><head>',
            '<link rel="preload" href="assets/f.woff2" as="font" crossorigin>',
            '<link rel="stylesheet" href="css/main.css?v=10">',
            '<link rel="stylesheet" href="/css/imza.css">',
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X">',
            '<script defer src="https://www.gstatic.com/firebasejs/x.js"></script>',
            '<!-- <script src="js/eski.js"></script> -->',
            '<script defer src="js/app.js?v=23"></script>',
            '<script src="js/custom.js?feature=1"></script>',
            '</head><body></body></html>',
        ].join('\n'),
        'css/main.css': 'body{color:red}',
        'css/imza.css': '.imza{}',
        'css/tetris.css': '.tetris{}',
        'assets/f.woff2': 'font',
        'js/custom.js': 'window.custom = 1;',
        'js/app.js': [
            '// bkz. \'js/games/yok.js\' — yorumdaki yol dokunulmaz',
            'const sel = document.querySelector(\'link[href*="css/main.css"]\');',
            'const re = /\'css\\/main.css\'/;',
            'const FILES = [\'js/games/tetris.js\', \'css/tetris.css?v=3\', \'https://cdn.example.com/lib.js\'];',
            'const wrap = `games/x/index.html?role=${sel}`;',
            'window.load(FILES, wrap, re);',
        ].join('\n'),
        'js/games/tetris.js': 'iframe.src = \'games/x/index.html?v=7\';',
        'games/x/index.html': [
            '<script type="module">import { a } from "./js/a.js?v=1"; a();</script>',
            '<script>const inline = "./js/a.js"; console.log(inline);</script>',
        ].join('\n'),
        'games/x/js/a.js': 'import { b } from "./b.js";\nexport const a = () => b();',
        'games/x/js/b.js': 'import { a } from "./a.js?v=2";\nexport const b = () => a;',
    };
}

test.describe('tools/build.js', () => {
    test('yerinde build: yerel js/css/html başvuruları ?h= alır, dışlar/fontlar/yorumlar/seçiciler dokunulmaz', async () => {
        const root = makeSite(hubSite());
        const r = runBuild(root, '--check');
        expect(r.code, r.out).toBe(0);

        const html = read(root, 'index.html');
        expect(html).toMatch(/href="css\/main\.css\?h=[0-9a-f]{10}"/);
        expect(html).toMatch(/href="\/css\/imza\.css\?h=[0-9a-f]{10}"/);
        expect(html).toMatch(/src="js\/app\.js\?h=[0-9a-f]{10}"/);
        expect(html).toContain('href="assets/f.woff2"');                       // font preload: hash yok
        expect(html).toContain('href="https://fonts.googleapis.com/css2?family=X"');
        expect(html).toContain('src="https://www.gstatic.com/firebasejs/x.js"');
        expect(html).toContain('<!-- <script src="js/eski.js"></script> -->');  // HTML yorumu
        expect(html).toContain('src="js/custom.js?feature=1"');                // özel sorgu

        const app = read(root, 'js/app.js');
        expect(app).toContain('// bkz. \'js/games/yok.js\'');                   // JS yorumu
        expect(app).toContain('[href*="css/main.css"]');                        // seçici dizgesi
        expect(app).toContain('/\'css\\/main.css\'/');                          // regex sabiti
        expect(app).toMatch(/'js\/games\/tetris\.js\?h=[0-9a-f]{10}'/);
        expect(app).toMatch(/'css\/tetris\.css\?h=[0-9a-f]{10}'/);
        expect(app).toContain('\'https://cdn.example.com/lib.js\'');
        expect(app).toContain('`games/x/index.html?role=${sel}`');            // ${} şablonu

        expect(read(root, 'js/games/tetris.js')).toMatch(/'games\/x\/index\.html\?h=[0-9a-f]{10}'/);
        const gameHtml = read(root, 'games/x/index.html');
        expect(gameHtml).toMatch(/from "\.\/js\/a\.js\?h=[0-9a-f]{10}"/);       // satır içi modül
        expect(gameHtml).toContain('const inline = "./js/a.js"');              // klasik satır içi betik: dokunulmaz
        expect(read(root, 'games/x/js/a.js')).toMatch(/"\.\/b\.js\?h=[0-9a-f]{10}"/);
        expect(read(root, 'games/x/js/b.js')).toMatch(/"\.\/a\.js\?h=[0-9a-f]{10}"/);   // döngü çözüldü
        expect(r.out).toContain('[check] OK');
    });

    test('idempotent ve deterministik: ikinci koşu hiçbir dosyayı değiştirmez, ayrı kopya aynı hash\'leri üretir', async () => {
        const rootA = makeSite(hubSite());
        const rootB = makeSite(hubSite());
        expect(runBuild(rootA).code).toBe(0);
        const first = read(rootA, 'index.html');
        const second = runBuild(rootA, '--check');
        expect(second.code, second.out).toBe(0);
        expect(second.out).toMatch(/yazılan dosya: 0 \//);
        expect(read(rootA, 'index.html')).toBe(first);
        expect(runBuild(rootB).code).toBe(0);
        expect(read(rootB, 'index.html')).toBe(first);
        expect(read(rootB, 'js/app.js')).toBe(read(rootA, 'js/app.js'));
    });

    test('bağımlılık değişince zincirdeki her URL değişir (css → app.js → index.html)', async () => {
        const rootA = makeSite(hubSite());
        const changed = hubSite();
        changed['css/tetris.css'] = '.tetris{color:blue}';
        const rootB = makeSite(changed);
        expect(runBuild(rootA).code).toBe(0);
        expect(runBuild(rootB).code).toBe(0);
        const hashOf = (text, re) => re.exec(text)[1];
        const appRe = /src="js\/app\.js\?h=([0-9a-f]{10})"/;
        const cssRe = /'css\/tetris\.css\?h=([0-9a-f]{10})'/;
        const mainRe = /href="css\/main\.css\?h=([0-9a-f]{10})"/;
        expect(hashOf(read(rootB, 'js/app.js'), cssRe)).not.toBe(hashOf(read(rootA, 'js/app.js'), cssRe));
        expect(hashOf(read(rootB, 'index.html'), appRe)).not.toBe(hashOf(read(rootA, 'index.html'), appRe));
        expect(hashOf(read(rootB, 'index.html'), mainRe)).toBe(hashOf(read(rootA, 'index.html'), mainRe));   // ilgisiz dosya sabit
    });

    test('eksik hedef → çıkış 1 ve dosya adıyla hata; hiçbir şey yazılmaz', async () => {
        const site = hubSite();
        site['index.html'] += '\n<script src="js/yok.js"></script>';
        const root = makeSite(site);
        const before = read(root, 'js/app.js');
        const r = runBuild(root);
        expect(r.code).toBe(1);
        expect(r.out).toContain('dosya yok: js');
        expect(r.out).toContain('yok.js');
        expect(read(root, 'js/app.js')).toBe(before);
    });

    test('büyük/küçük harf uyuşmazlığı (Windows\'ta bulunur, Linux\'ta 404) → çıkış 1', async () => {
        const site = hubSite();
        site['index.html'] = site['index.html'].replace('css/main.css?v=10', 'css/Main.css?v=10');
        const root = makeSite(site);
        const r = runBuild(root);
        // Linux'ta dosya bulunamaz ("dosya yok"), Windows/macOS'ta harf uyuşmazlığı — ikisi de hata.
        expect(r.code).toBe(1);
        expect(r.out).toMatch(/harf uyuşmazlığı|dosya yok/);
    });

    test('--out: kaynak dokunulmaz kalır, kopya hash\'lidir, ikinci koşu kopyayı yeniler', async () => {
        const root = makeSite(hubSite());
        const out = path.join(root, '.build-check');
        const r = runBuild(root, '--out', out, '--check');
        expect(r.code, r.out).toBe(0);
        expect(read(root, 'index.html')).toContain('css/main.css?v=10');       // kaynak olduğu gibi
        expect(read(root, '.build-check/index.html')).toMatch(HASH_RE);
        expect(fs.existsSync(path.join(out, '.bilnetoyun-build.json'))).toBe(true);
        expect(runBuild(root, '--out', out).code).toBe(0);                      // işaretli klasör yeniden üretilir
        fs.rmSync(path.join(out, '.bilnetoyun-build.json'));
        expect(runBuild(root, '--out', out).code).toBe(1);                      // işaretsiz dolu klasör silinmez
    });

    test('iframe oyunu (B5): game.js ve ../_shared/edu-kit.{js,css} göreli başvuruları hash\'lenir; kit değişince oyun URL\'si değişir', async () => {
        // games/<slug>/index.html belgeye göre çözülür (kök değil): "game.js" → games/<slug>/game.js, "../_shared/…" → games/_shared/…
        const kitSite = () => ({
            ...hubSite(),
            'js/games/oyun.js': 'iframe.src = \'games/oyun/index.html?v=1\';',
            'games/oyun/index.html': [
                '<link rel="stylesheet" href="../_shared/edu-kit.css">',
                '<script src="../_shared/edu-kit.js"></script>',
                '<script src="game.js"></script>',
            ].join('\n'),
            'games/oyun/game.js': 'EduKit.tone(440, 0.1);',
            'games/_shared/edu-kit.js': 'window.EduKit = { tone() {} };',
            'games/_shared/edu-kit.css': ':root{--ara-1:4px}',
        });
        const rootA = makeSite(kitSite());
        const r = runBuild(rootA, '--check');
        expect(r.code, r.out).toBe(0);
        const html = read(rootA, 'games/oyun/index.html');
        expect(html).toMatch(/href="\.\.\/_shared\/edu-kit\.css\?h=[0-9a-f]{10}"/);
        expect(html).toMatch(/src="\.\.\/_shared\/edu-kit\.js\?h=[0-9a-f]{10}"/);
        expect(html).toMatch(/src="game\.js\?h=[0-9a-f]{10}"/);
        expect(read(rootA, 'games/oyun/game.js')).toBe('EduKit.tone(440, 0.1);');            // yaprak: dokunulmaz
        // Kit değişince: oyun sayfasındaki kit URL'si ve sarmalayıcıdaki sayfa URL'si değişir; game.js URL'si sabit
        const changed = kitSite();
        changed['games/_shared/edu-kit.js'] = 'window.EduKit = { tone() {}, version: \'1.0.1\' };';
        const rootB = makeSite(changed);
        expect(runBuild(rootB).code).toBe(0);
        const hashOf = (text, re) => re.exec(text)[1];
        const kitRe = /src="\.\.\/_shared\/edu-kit\.js\?h=([0-9a-f]{10})"/;
        const gameRe = /src="game\.js\?h=([0-9a-f]{10})"/;
        const pageRe = /'games\/oyun\/index\.html\?h=([0-9a-f]{10})'/;
        const htmlB = read(rootB, 'games/oyun/index.html');
        expect(hashOf(htmlB, kitRe)).not.toBe(hashOf(html, kitRe));
        expect(hashOf(htmlB, gameRe)).toBe(hashOf(html, gameRe));
        expect(hashOf(read(rootB, 'js/games/oyun.js'), pageRe)).not.toBe(hashOf(read(rootA, 'js/games/oyun.js'), pageRe));
    });

    test('--check: kapsam dışı kalmış ?v= kalıntısını yakalar (klasik oyun betiğindeki dinamik yükleme)', async () => {
        const site = hubSite();
        site['games/x/js/klasik.js'] = 'document.head.appendChild(Object.assign(document.createElement("script"), { src: "ek.js?v=4" }));';
        site['games/x/index.html'] += '\n<script src="js/klasik.js"></script>';
        site['games/x/js/ek.js'] = '1;';
        const root = makeSite(site);
        const r = runBuild(root, '--check');
        expect(r.code).toBe(1);
        expect(r.out).toContain('games/x/js/klasik.js:1: hash\'lenmemiş ?v= kalıntısı "ek.js?v=4"');
    });
});
