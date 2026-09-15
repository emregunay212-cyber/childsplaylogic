/* ============================================
   Test için statik sunucu (bağımlılıksız Node) — playwright.config.js webServer başlatır.
   Neden server.py değil: Python `socketserver.TCPServer` dinleme kuyruğu 5'tir; 4 paralel
   Chromium worker'ı × ~130 kaynak/sayfa bu kuyruğu taşırır ve Windows bağlantıyı
   REDDEDER (net::ERR_CONNECTION_REFUSED) → sahte kırmızı. Node http sunucusu 511 kuyruk +
   keep-alive ile deterministiktir. Davranış server.py ile aynı: no-store, dizin → index.html.
   Kullanım: node tests/static-server.js --port 8765 [--root <dizin>]
   ============================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',   // ES modülleri (games/ates-buz) doğru MIME ister
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.wasm': 'application/wasm',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
};

function parseArgs(argv) {
    const opts = { port: 8000, root: process.cwd() };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--port') opts.port = Number(argv[i + 1]);
        if (argv[i] === '--root') opts.root = path.resolve(argv[i + 1]);
    }
    if (!Number.isInteger(opts.port) || opts.port <= 0) throw new Error('--port geçersiz');
    return opts;
}

function send(res, status, body, headers = {}) {
    res.writeHead(status, {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
    });
    res.end(body);
}

// URL yolunu kök altında güvenli bir dosya yoluna çevirir; kök dışına çıkış → null.
function resolvePath(root, urlPath) {
    let decoded;
    try { decoded = decodeURIComponent(urlPath.split('?')[0]); } catch (e) { return null; }
    const full = path.resolve(root, '.' + path.posix.normalize('/' + decoded));
    if (full !== root && !full.startsWith(root + path.sep)) return null;
    return full;
}

function createServer(root) {
    return http.createServer((req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
        const target = resolvePath(root, req.url || '/');
        if (!target) return send(res, 403, 'Forbidden');

        fs.stat(target, (err, stat) => {
            if (err) return send(res, 404, 'Not Found');
            if (stat.isDirectory()) {
                const urlPath = (req.url || '/').split('?')[0];
                if (!urlPath.endsWith('/')) return send(res, 301, '', { Location: urlPath + '/' });
                return serveFile(path.join(target, 'index.html'), req, res);
            }
            return serveFile(target, req, res);
        });
    });
}

function serveFile(file, req, res) {
    fs.stat(file, (err, stat) => {
        if (err || !stat.isFile()) return send(res, 404, 'Not Found');
        res.writeHead(200, {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Content-Length': stat.size,
        });
        if (req.method === 'HEAD') return res.end();
        const stream = fs.createReadStream(file);
        stream.on('error', (e) => { console.error('[static-server] okuma hatası:', file, e.message); res.destroy(); });
        stream.pipe(res);
    });
}

if (require.main === module) {
    const { port, root } = parseArgs(process.argv.slice(2));
    const server = createServer(root);
    server.keepAliveTimeout = 15000;
    server.on('error', (e) => { console.error('[static-server]', e.message); process.exit(1); });
    server.listen(port, '127.0.0.1', () => {
        console.log(`[static-server] http://127.0.0.1:${port}/  kök: ${root}`);
    });
}

module.exports = { createServer, resolvePath };
