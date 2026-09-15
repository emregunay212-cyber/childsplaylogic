/* ============================================
   Ölçüm sunucusu — tests/static-server.js'in gzip'li kopyası (yalnız Lighthouse kanıtı için).
   Neden: tests/static-server.js kasten sıkıştırmaz (duman testi için gereksiz); Lighthouse'un
   simüle 4G'si (1,6 Mbps) sıkıştırılmamış CSS/JS'i olduğundan 3-4 kat pahalı gösterir. Vercel
   metin varlıklarını gzip/brotli ile sunar; bu sunucu gzip (seviye 6) ile ona yaklaşır.
   Kullanım: node tests/kanit/gzip-server.js --port 8792 [--root <dizin>]
   ============================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { resolvePath } = require('../static-server');

const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
    '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff': 'font/woff',
    '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm',
    '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

function parseArgs(argv) {
    const opts = { port: 8792, root: process.cwd() };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--port') opts.port = Number(argv[i + 1]);
        if (argv[i] === '--root') opts.root = path.resolve(argv[i + 1]);
    }
    return opts;
}

function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8', ...headers });
    res.end(body);
}

function serveFile(file, req, res) {
    fs.readFile(file, (err, buf) => {
        if (err) return send(res, 404, 'Not Found');
        const ext = path.extname(file).toLowerCase();
        const headers = { 'Cache-Control': 'no-store', 'Content-Type': MIME[ext] || 'application/octet-stream', Vary: 'Accept-Encoding' };
        const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
        const body = (acceptsGzip && COMPRESSIBLE.has(ext)) ? zlib.gzipSync(buf, { level: 6 }) : buf;
        if (body !== buf) headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = body.length;
        res.writeHead(200, headers);
        res.end(req.method === 'HEAD' ? undefined : body);
    });
}

const { port, root } = parseArgs(process.argv.slice(2));
http.createServer((req, res) => {
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
}).listen(port, '127.0.0.1', () => console.log(`[gzip-server] http://127.0.0.1:${port}/  kök: ${root}`));
