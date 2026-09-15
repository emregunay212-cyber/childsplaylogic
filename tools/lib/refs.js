/* ============================================
   Varlık başvurusu çıkarma (tools/build.js için)
   --------------------------------------------
   HTML: <script src>, <link rel="stylesheet|preload|modulepreload|prefetch" href> ve
         satır içi <script type="module"> gövdesindeki import belirteçleri.
   JS  : değeri baştan sona yerel bir .js/.mjs/.css/.html yolu olan dizge sabitleri
         (js/app.js `files: […]`, sarmalayıcı `iframe.src = 'games/…/index.html?v=N'`,
         `new URL('js/lib/stockfish.js', …)`, ES-modül `import … from './x.js?v=3'`).
   Dönen aralıklar (start, end) kaynak dizgedeki DEĞER sınırlarıdır; tırnak dışarıda kalır.
   Dış URL'ler (şema ya da `//` ile başlayan) çağıran tarafından ayıklanır.
   ============================================ */
'use strict';

const path = require('path');
const { findStringLiterals } = require('./js-strings');

const HASHABLE_EXT = new Set(['.js', '.mjs', '.css', '.html']);
const LINK_RELS = new Set(['stylesheet', 'preload', 'modulepreload', 'prefetch']);

// Tırnak içindeki BÜTÜN değer yerel bir varlık yolu mu? (JS dizgeleri için; sorgu yalnız ?v=/?h=)
const LOCAL_ASSET_RE = /^(?:\.{1,2}\/|\/)?(?:[\w.-]+\/)*[\w.-]+\.(?:m?js|css|html)(?:\?(?:v|h)=[\w.-]*)?$/;
// Değiştirilebilir sorgu: yok, ?v=… ya da ?h=… (başka sorgu → dokunulmaz)
const REPLACEABLE_QUERY_RE = /^(?:\?(?:v|h)=[\w.-]*)?$/;
// ES modülü mü? (üst düzey import/export bildirimi)
const ES_MODULE_RE = /^[ \t]*(?:import\s*[\w{*"']|export\s+[\w{*])/m;

function isExternal(ref) {
    return /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('//');
}

/** 'a/b.js?v=3#x' → { file: 'a/b.js', query: '?v=3', fragment: '#x' } */
function splitRef(value) {
    const h = value.indexOf('#');
    const fragment = h >= 0 ? value.slice(h) : '';
    const noFragment = h >= 0 ? value.slice(0, h) : value;
    const q = noFragment.indexOf('?');
    return {
        file: q >= 0 ? noFragment.slice(0, q) : noFragment,
        query: q >= 0 ? noFragment.slice(q) : '',
        fragment,
    };
}

function isHashableFile(file) {
    return HASHABLE_EXT.has(path.posix.extname(file).toLowerCase());
}

function isReplaceableQuery(query) {
    return REPLACEABLE_QUERY_RE.test(query);
}

function isEsModule(src) {
    return ES_MODULE_RE.test(src);
}

/**
 * Yerel yolu kök altında mutlak dosya yoluna çevirir.
 * '/x' → kök + x; 'x' ya da './x' → baseDir + x. Kök dışına çıkış → null.
 */
function resolveLocal(file, baseDir, root) {
    let decoded = file;
    try { decoded = decodeURIComponent(file); } catch (e) { /* ham değeri kullan */ }
    const abs = path.normalize(decoded.startsWith('/') ? path.join(root, decoded) : path.resolve(baseDir, decoded));
    if (abs !== root && !abs.startsWith(root + path.sep)) return null;
    return abs;
}

// ── HTML ──

// Etiket öznitelikleri: ad → { value, start, end } (start/end = değer sınırları, mutlak)
function parseAttrs(attrText, attrStart) {
    const attrs = {};
    const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let m;
    while ((m = re.exec(attrText))) {
        const name = m[1].toLowerCase();
        const value = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]);
        if (value === undefined) { attrs[name] = { value: '', start: -1, end: -1 }; continue; }
        const quoted = m[2] !== undefined || m[3] !== undefined;
        const end = attrStart + m.index + m[0].length - (quoted ? 1 : 0);
        attrs[name] = { value, start: end - value.length, end };
    }
    return attrs;
}

function commentRanges(src) {
    const ranges = [];
    const re = /<!--[\s\S]*?-->/g;
    let m;
    while ((m = re.exec(src))) ranges.push([m.index, m.index + m[0].length]);
    return ranges;
}

function inRanges(pos, ranges) {
    return ranges.some(([a, b]) => pos >= a && pos < b);
}

/**
 * @returns {{ start:number, end:number, value:string, kind:'html-attr'|'module-string' }[]}
 */
function htmlRefs(src) {
    const refs = [];
    const comments = commentRanges(src);
    const tagRe = /<(script|link)\b([^>]*)>/gi;
    const closeRe = /<\/script\s*>/gi;
    let m;
    while ((m = tagRe.exec(src))) {
        if (inRanges(m.index, comments)) continue;
        const tag = m[1].toLowerCase();
        const attrs = parseAttrs(m[2], m.index + 1 + m[1].length);
        if (tag === 'link') {
            if (!attrs.rel || !attrs.href || attrs.href.start < 0) continue;
            const rels = attrs.rel.value.toLowerCase().split(/\s+/);
            if (rels.some((r) => LINK_RELS.has(r))) refs.push({ ...attrs.href, kind: 'html-attr' });
            continue;
        }
        // <script>: src varsa başvuru; gövde (satır içi) her durumda atlanır — modülse import'ları taranır
        const bodyStart = tagRe.lastIndex;
        closeRe.lastIndex = bodyStart;
        const close = closeRe.exec(src);
        const bodyEnd = close ? close.index : src.length;
        if (attrs.src && attrs.src.start >= 0) {
            refs.push({ ...attrs.src, kind: 'html-attr' });
        } else if (attrs.type && attrs.type.value.trim().toLowerCase() === 'module') {
            for (const lit of findStringLiterals(src.slice(bodyStart, bodyEnd))) {
                if (!LOCAL_ASSET_RE.test(lit.value)) continue;
                refs.push({ start: bodyStart + lit.start, end: bodyStart + lit.end, value: lit.value, kind: 'module-string' });
            }
        }
        tagRe.lastIndex = close ? close.index + close[0].length : src.length;
    }
    return refs;
}

// ── JS ──

/** @returns {{ start:number, end:number, value:string, kind:'js-string' }[]} */
function jsRefs(src) {
    return findStringLiterals(src)
        .filter((lit) => LOCAL_ASSET_RE.test(lit.value))
        .map((lit) => ({ ...lit, kind: 'js-string' }));
}

module.exports = {
    HASHABLE_EXT,
    isExternal,
    splitRef,
    isHashableFile,
    isReplaceableQuery,
    isEsModule,
    resolveLocal,
    htmlRefs,
    jsRefs,
};
