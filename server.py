#!/usr/bin/env python3
"""Geliştirme için statik sunucu — tarayıcı cache'ini kapatır (no-store) ve eş zamanlı
istekleri thread'lerle işler (ThreadingHTTPServer). Böylece JS/CSS değişiklikleri anında
yansır ve çok sayıda paralel istek sayfayı kilitlemez. Yalnız yerel geliştirme içindir;
canlıda Firebase Hosting kullanılır. Kullanım: python server.py"""
import http.server

PORT = 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        http.server.SimpleHTTPRequestHandler.end_headers(self)


if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('', PORT), NoCacheHandler)
    print(f'No-cache dev server (threading): http://localhost:{PORT}/')
    server.serve_forever()
