/* ============================================
   FABRİKA ÇEKİRDEK — SDK soketleri + Storage + i18n
   Portal spesifikasyonu: EGITSEL-OYUN-FABRIKASI/CLAUDE.md
   Tarayıcı kalıcı deposu kullanılmaz; SDK_STORAGE → in-memory fallback.
   ============================================ */

const _mem = {};
const Storage = {
    get(k) {
        try {
            const v = window.SDK_STORAGE ? window.SDK_STORAGE.get(k) : undefined;
            return (v !== undefined && v !== null) ? v : (_mem[k] !== undefined ? _mem[k] : null);
        } catch (e) { return _mem[k] !== undefined ? _mem[k] : null; }
    },
    set(k, v) {
        try { if (window.SDK_STORAGE) window.SDK_STORAGE.set(k, v); } catch (e) {}
        _mem[k] = v;
    },
    clear() { for (const k in _mem) delete _mem[k]; },
};

/* Portal SDK soketleri — portal entegrasyonunda doldurulur, yokken sessiz no-op. */
const SDK = window.SDK || {
    gameLoadingStart() {},
    gameLoadingFinished() {},
    gameplayStart() {},
    gameplayStop() {},
    showRewardedAd(onSuccess) { try { onSuccess && onSuccess(); } catch (e) {} },
    happyMoment() {},
};
window.SDK = SDK;

/* i18n — öncelik: ?lang > <html data-lang> (build varsayılanı) > navigator.language */
const STRINGS = ___STRINGS___;
const LANG = (() => {
    try {
        const q = new URLSearchParams(location.search).get('lang');
        if (q && STRINGS[q]) return q;
    } catch (e) {}
    const d = document.documentElement.dataset.lang;
    if (d && STRINGS[d]) return d;
    return (navigator.language || 'en').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en';
})();
function T(key, vars) {
    let s = (STRINGS[LANG] && STRINGS[LANG][key] !== undefined) ? STRINGS[LANG][key]
        : (STRINGS.tr && STRINGS.tr[key] !== undefined) ? STRINGS.tr[key] : key;
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
}
