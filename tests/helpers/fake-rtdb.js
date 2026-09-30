/* ============================================
   Bellek içi sahte Firebase Realtime Database — çok oyunculu oyun testleri için.
   --------------------------------------------
   tests/hub-ia.spec.js'teki stub yalnız adminConfig okur; Altın Avı gibi oda yazan oyunlar için
   gerçek RTDB davranışının test edilebilir çekirdeği burada: ağaç, on/off/once, set/update/remove,
   transaction, onDisconnect (kayıt), ServerValue.TIMESTAMP, `.info/connected`,
   `.info/serverTimeOffset` (saat kayması testi) ve basit orderByChild().equalTo().
   Canlı RTDB'ye HİÇ dokunulmaz: gstatic CDN spec'te engellenir, `window.firebase` bu betikle kurulur.

   Test tarafı `window.__rtdb` ile başka oyuncuyu taklit eder:
     __rtdb.set(path, value) · __rtdb.get(path) · __rtdb.writes (yazım günlüğü) · __rtdb.serverNow()
   Olaylar mikro görevde (Promise) tetiklenir → page.clock sahte zamanlayıcılarından etkilenmez.
   ============================================ */
'use strict';

/**
 * @param {{ offset?: number }} [opts]  offset = sunucu saati − istemci saati (ms); RTDB `.info/serverTimeOffset`
 * @returns {string} context.addInitScript(...) ile verilecek betik
 */
function fakeFirebaseScript(opts = {}) {
    const offset = Number(opts.offset || 0);
    return `(() => {
        const OFFSET = ${offset};
        const serverNow = () => Date.now() + OFFSET;
        const TS = { '.sv': 'timestamp' };
        let tree = {};
        const listeners = [];   // { path, cb }
        const writes = [];      // { path, value }
        const clone = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
        const split = (p) => String(p).split('/').filter(Boolean);
        const join = (a, b) => split(a + '/' + b).join('/');
        const resolve = (v) => {
            if (v && typeof v === 'object') {
                if (v['.sv'] === 'timestamp') return serverNow();
                const o = Array.isArray(v) ? [] : {};
                for (const k of Object.keys(v)) { const r = resolve(v[k]); if (r !== null) o[k] = r; }
                return o;
            }
            return v === undefined ? null : v;
        };
        const getAt = (path) => {
            let n = tree;
            for (const k of split(path)) { if (n === null || typeof n !== 'object') return null; n = n[k]; }
            return n === undefined ? null : n;
        };
        const setAt = (path, val) => {
            const ks = split(path);
            if (!ks.length) { tree = val && typeof val === 'object' ? val : {}; return; }
            const chain = [tree];
            let n = tree;
            for (let i = 0; i < ks.length - 1; i++) {
                if (n[ks[i]] === null || typeof n[ks[i]] !== 'object') n[ks[i]] = {};
                n = n[ks[i]]; chain.push(n);
            }
            const last = ks[ks.length - 1];
            if (val === null) delete n[last]; else n[last] = val;
            for (let i = chain.length - 1; i > 0; i--) {   // boş düğümleri buda (RTDB boş nesne saklamaz)
                if (Object.keys(chain[i]).length === 0) delete chain[i - 1][ks[i - 1]]; else break;
            }
        };
        const related = (a, b) => { a = split(a).join('/'); b = split(b).join('/'); return a === b || a === '' || b === '' || a.startsWith(b + '/') || b.startsWith(a + '/'); };
        const snap = (path) => ({
            key: split(path).slice(-1)[0] || null,
            val: () => clone(getAt(path)),
            exists: () => getAt(path) !== null,
            forEach(cb) {
                const v = getAt(path);
                if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (cb(snap(join(path, k))) === true) return true; }
                return false;
            },
        });
        const notify = (path) => {
            for (const l of listeners.slice()) {
                if (!related(l.path, path)) continue;
                Promise.resolve().then(() => { if (listeners.includes(l)) l.cb(snap(l.path)); });
            }
        };
        const write = (path, value) => {
            value = resolve(value);
            writes.push({ path: split(path).join('/'), value: clone(value) });
            setAt(path, value);
            notify(path);
        };
        const special = (path) => {
            if (path === '.info/connected') return true;
            if (path === '.info/serverTimeOffset') return OFFSET;
            return undefined;
        };
        const makeRef = (path) => {
            const ref = {
                key: split(path).slice(-1)[0] || null,
                child: (p) => makeRef(join(path, p)),
                on(ev, cb) {
                    const l = { path, cb };
                    listeners.push(l);
                    const sp = special(path);
                    Promise.resolve().then(() => { if (listeners.includes(l)) cb(sp !== undefined ? { val: () => sp, exists: () => true } : snap(path)); });
                    return cb;
                },
                off(ev, cb) {
                    for (let i = listeners.length - 1; i >= 0; i--) if (listeners[i].path === path && (!cb || listeners[i].cb === cb)) listeners.splice(i, 1);
                },
                once() {
                    const sp = special(path);
                    return Promise.resolve(sp !== undefined ? { val: () => sp, exists: () => true } : snap(path));
                },
                set(v) { write(path, v); return Promise.resolve(); },
                remove() { write(path, null); return Promise.resolve(); },
                update(obj) {
                    for (const k of Object.keys(obj)) write(join(path, k), obj[k]);
                    return Promise.resolve();
                },
                transaction(fn) {
                    const cur = clone(getAt(path));
                    const res = fn(cur);
                    if (res === undefined) return Promise.resolve({ committed: false, snapshot: snap(path) });
                    write(path, res);
                    return Promise.resolve({ committed: true, snapshot: snap(path) });
                },
                onDisconnect() { return { remove() { return Promise.resolve(); }, set() { return Promise.resolve(); } }; },
                orderByChild(k) {
                    let eq;
                    const q = {
                        equalTo(v) { eq = v; return q; }, endAt() { return q; }, limitToFirst() { return q; },
                        once() {
                            const v = getAt(path) || {};
                            const keep = Object.keys(v).filter((c) => eq === undefined || (v[c] && v[c][k] === eq));
                            return Promise.resolve({
                                val: () => clone(keep.reduce((o, c) => { o[c] = v[c]; return o; }, {})),
                                exists: () => keep.length > 0,
                                forEach(cb) { for (const c of keep) { if (cb(snap(join(path, c))) === true) return true; } return false; },
                            });
                        },
                    };
                    return q;
                },
            };
            return ref;
        };
        const auth = () => ({ onAuthStateChanged(cb) { setTimeout(() => cb(null), 0); }, signOut() { return Promise.resolve(); } });
        auth.GoogleAuthProvider = function () {};
        const database = () => ({ ref: (p) => makeRef(p || '') });
        database.ServerValue = { TIMESTAMP: TS };
        window.firebase = { initializeApp() {}, database, auth };
        window.__rtdb = {
            OFFSET, serverNow, writes,
            get: (p) => clone(getAt(p)),
            set: (p, v) => write(p, v),
            tree: () => clone(tree),
        };
    })();`;
}

module.exports = { fakeFirebaseScript };
