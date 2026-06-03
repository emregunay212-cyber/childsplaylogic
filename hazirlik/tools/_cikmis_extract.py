"""Çıkmış soru PDF'ini UTF-8 metne çevirir (PyMuPDF; font ToUnicode ile Türkçe doğru).
Kullanım: python tools/_cikmis_extract.py "<pdf yolu>" tools/_cikmis_tmp.txt
Görseller metne çıkmaz; metinle tam temsil edilebilen sorular elle aktarılır.
Çoğu MEB örnek soru kitapçığının son sayfasında CEVAP ANAHTARI bulunur."""
import sys, fitz
pdf, out = sys.argv[1], sys.argv[2]
d = fitz.open(pdf)
parts = []
for i in range(d.page_count):
    parts.append(f"===== SAYFA {i+1} =====")
    parts.append(d[i].get_text())
open(out, "w", encoding="utf-8").write("\n".join(parts))
print("OK", d.page_count, "sayfa ->", out)
