#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Portal-özel build üretir: SDK köprüsünü gömer + index.html'li zip çıkarır.

Kullanım:
    python make_portal_build.py gamemonetize <build.html> --gameid <ID> [--out ad.zip]

Köprü, oyundaki hazır soketleri (window.SDK: gameplayStart/Stop, happyMoment,
showRewardedAd) portal SDK'sına bağlar. shims/core.js `window.SDK || no-op`
desenli olduğundan köprü oyun kodundan ÖNCE tanımlanınca otomatik devreye girer.

NOT: Portal build'leri bilinçli olarak dış SDK script'i içerir — fabrika
validator'ından geçirilmez (offline kuralı yalnız portal-suz build'ler içindir).
"""
import argparse
import zipfile
from pathlib import Path

FABRIKA = Path(__file__).resolve().parent.parent

GM_SNIPPET = """<script>
/* GameMonetize SDK koprusu — oyun soketlerini gercek SDK'ya baglar */
window.SDK_OPTIONS = {
  gameId: "__GAMEID__",
  onEvent: function (a) {
    switch (a.name) {
      case "SDK_GAME_START": /* reklam bitti */
        try { var cb = window.__adCb; window.__adCb = null; cb && cb(); } catch (e) {}
        break;
      case "SDK_GAME_PAUSE": /* reklam basladi — oyun zaten overlay aninda */
        break;
    }
  }
};
(function (a, b, c) {
  var d = a.getElementsByTagName(b)[0];
  if (a.getElementById(c)) return;
  var s = a.createElement(b); s.id = c;
  s.src = "https://api.gamemonetize.com/sdk.js";
  d.parentNode.insertBefore(s, d);
})(document, "script", "gamemonetize-sdk");
window.SDK = {
  gameLoadingStart: function () {},
  gameLoadingFinished: function () {},
  gameplayStart: function () { try { typeof sdk !== "undefined" && sdk.gameplayStart && sdk.gameplayStart(); } catch (e) {} },
  gameplayStop: function () { try { typeof sdk !== "undefined" && sdk.gameplayStop && sdk.gameplayStop(); } catch (e) {} },
  happyMoment: function () { try { typeof sdk !== "undefined" && sdk.showBanner && sdk.showBanner(); } catch (e) {} },
  showRewardedAd: function (cb) {
    window.__adCb = cb;
    try {
      if (typeof sdk !== "undefined" && sdk.showBanner) sdk.showBanner();
      else { window.__adCb = null; cb && cb(); }
    } catch (e) { window.__adCb = null; try { cb && cb(); } catch (_) {} }
  }
};
</script>"""

PORTALS = {'gamemonetize': GM_SNIPPET}


def build(portal, src_name, gameid, out_name=None):
    snippet = PORTALS[portal].replace('__GAMEID__', gameid)
    src = FABRIKA / 'build' / src_name
    html = src.read_text(encoding='utf-8')
    marker = '</title>'
    if marker not in html:
        raise SystemExit('HATA: </title> bulunamadı — enjeksiyon noktası yok')
    html = html.replace(marker, marker + '\n' + snippet, 1)

    out_dir = FABRIKA / 'dist' / 'portal' / portal
    out_dir.mkdir(parents=True, exist_ok=True)
    zname = out_name or src_name.replace('.html', f'-{portal[:2]}.zip')
    dst = out_dir / zname
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('index.html', html)
    print(f'[OK] {dst.relative_to(FABRIKA)}  ({dst.stat().st_size // 1024} KB)')
    return dst


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('portal', choices=sorted(PORTALS))
    ap.add_argument('src', help='build/ içindeki html adı')
    ap.add_argument('--gameid', required=True)
    ap.add_argument('--out')
    a = ap.parse_args()
    build(a.portal, a.src, a.gameid, a.out)
