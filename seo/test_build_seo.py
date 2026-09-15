#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Birim testleri — seo/build_seo.py (saf fonksiyonlar; dosya yazmaz, git cagirmaz).
Calistir:  python seo/test_build_seo.py
"""
import json
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_seo as b  # noqa: E402

SAMPLE = dict(slug="ornek-oyun", name="Örnek Oyun", cat="Matematik", age="7-10", players="Tek kişilik",
              teaches="Toplama ve çıkarma", short="Kısa bir tanıtım cümlesi.", about="Uzun açıklama metni.")


def game(**over):
    return {**SAMPLE, **over}


class TitleTests(unittest.TestCase):
    def test_full_template_when_it_fits(self):
        self.assertEqual(b.build_title(game()), "Örnek Oyun Oyna – Ücretsiz Matematik Oyunu | Bilnet Oyun")

    def test_drops_category_part_first_when_too_long(self):
        t = b.build_title(game(cat="Çok Uzun Bir Kategori Adı Buraya"))
        self.assertEqual(t, "Örnek Oyun Oyna – Ücretsiz Oyun | Bilnet Oyun")

    def test_falls_back_to_brand_only_for_very_long_names(self):
        t = b.build_title(game(name="Otuz Karakterden Uzun Bir Oyun Adı X"))
        self.assertEqual(t, "Otuz Karakterden Uzun Bir Oyun Adı X Oyna | Bilnet Oyun")

    def test_inactive_title_says_coming_soon(self):
        self.assertEqual(b.build_title(game(active=False)), "Örnek Oyun – Çok Yakında | Bilnet Oyun")

    def test_all_real_titles_within_limit(self):
        for g in b.GAMES:
            self.assertLessEqual(len(b.build_title(g)), b.TITLE_MAX, g["slug"])


class DescriptionTests(unittest.TestCase):
    def test_appends_age_and_free_suffix(self):
        self.assertEqual(b.build_description(game()), "Kısa bir tanıtım cümlesi. 7-10 yaş için ücretsiz, üyeliksiz.")

    def test_caps_at_limit_on_word_boundary_and_keeps_suffix(self):
        d = b.build_description(game(short="kelime " * 40))
        self.assertLessEqual(len(d), b.DESC_MAX)
        self.assertTrue(d.endswith("… 7-10 yaş için ücretsiz, üyeliksiz."))
        self.assertNotIn("kelim…", d)   # kelime ortasindan kesilmedi

    def test_all_real_descriptions_within_limit(self):
        for g in b.GAMES:
            self.assertLessEqual(len(b.build_description(g)), b.DESC_MAX, g["slug"])


class ParsingTests(unittest.TestCase):
    def test_age_range(self):
        self.assertEqual(b.age_range(game(age="7-10")), (7, 10))
        with self.assertRaises(ValueError):
            b.age_range(game(age="7+"))

    def test_players_range_derivations(self):
        self.assertEqual(b.players_range(game(players="Tek kişilik (AI'ya karşı)")), (1, 1))
        self.assertEqual(b.players_range(game(players="Online (5-30 kişi)")), (5, 30))
        self.assertEqual(b.players_range(game(players="Online 2 kişilik")), (2, 2))
        self.assertEqual(b.players_range(game(players="2 kişilik / online")), (2, 2))
        self.assertEqual(b.players_range(game(players="Online çok oyunculu")), (2, None))
        self.assertEqual(b.players_range(game(players="belirsiz")), None)

    def test_players_range_override_wins(self):
        self.assertEqual(b.players_range(game(players="online 2-4 kişi", players_range=(1, 4))), (1, 4))

    def test_play_modes(self):
        self.assertEqual(b.play_modes(game(players="Tek kişilik")), "SinglePlayer")
        self.assertEqual(b.play_modes(game(players="Online 2 kişilik")), "MultiPlayer")
        self.assertEqual(b.play_modes(game(players="Tek kişilik (bota karşı) ya da online 2-4 kişi")),
                         ["SinglePlayer", "MultiPlayer"])


class JsonLdTests(unittest.TestCase):
    def graph(self, g):
        return json.loads(b.jsonld_page(g, b.page_url(g), "2026-09-15"))["@graph"]

    def test_graph_has_game_org_breadcrumb(self):
        nodes = self.graph(game())
        self.assertEqual([n["@type"] for n in nodes], ["VideoGame", "Organization", "BreadcrumbList"])

    def test_game_node_fields(self):
        vg = self.graph(game(players="Online (5-30 kişi)"))[0]
        self.assertEqual(vg["name"], "Örnek Oyun")            # "- Bilnet Oyun" eki yok
        self.assertEqual(vg["@id"], "https://bilnetoyun.com/oyunlar/ornek-oyun/#game")
        self.assertEqual(vg["publisher"], {"@id": "https://bilnetoyun.com/#org"})
        self.assertEqual(vg["audience"]["suggestedMinAge"], 7)
        self.assertEqual(vg["audience"]["suggestedMaxAge"], 10)
        self.assertEqual(vg["numberOfPlayers"], {"@type": "QuantitativeValue", "minValue": 5, "maxValue": 30})
        self.assertEqual(vg["dateModified"], "2026-09-15")
        self.assertEqual(vg["applicationCategory"], "GameApplication")

    def test_breadcrumb_last_item_has_no_url(self):
        crumbs = self.graph(game())[2]["itemListElement"]
        self.assertEqual([c["name"] for c in crumbs], ["Ana Sayfa", "Oyunlar", "Örnek Oyun"])
        self.assertNotIn("item", crumbs[-1])

    def test_script_close_tag_is_escaped(self):
        out = b.jsonld_page(game(about="kötü </script> metin"), b.page_url(game()), "2026-09-15")
        self.assertNotIn("</script>", out)
        self.assertIn("kötü <\\/script> metin", out)


class PageTests(unittest.TestCase):
    def test_active_page(self):
        html = b.build_page(game(), "2026-09-15")
        self.assertIn('<a class="play" href="/?oyun=ornek-oyun">', html)
        self.assertIn('content="index, follow, max-image-preview:large"', html)
        for needle in ("imza-band", "/css/landing.css", "/css/imza.css", '"@graph"', "fonts.googleapis.com"):
            self.assertIn(needle, html)
        self.assertTrue(html.rstrip().endswith("</div>\n</body>\n</html>"))
        self.assertLess(html.index("</footer>"), html.index("imza-band"))   # imza en altta

    def test_inactive_page(self):
        html = b.build_page(game(active=False), "2026-09-15")
        self.assertIn('content="noindex, follow"', html)
        self.assertNotIn("Hemen Oyna", html)
        self.assertIn("Çok yakında", html)
        self.assertIn("<h1>Örnek Oyun</h1>", html)

    def test_no_apostrophe_typo(self):
        html = b.build_page(game(), "2026-09-15") + b.build_hub([game()], "2026-09-15") + b.build_llms([game()])
        self.assertNotIn("Oyun'te", html)


class HubSitemapLlmsTests(unittest.TestCase):
    def test_hub_lists_only_given_games_and_itemlist(self):
        active = [game(), game(slug="ikinci", name="İkinci")]
        html = b.build_hub(active, "2026-09-15")
        self.assertEqual(html.count('class="g"'), 2)
        graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1))["@graph"]
        self.assertEqual(graph[0]["@type"], "CollectionPage")
        self.assertEqual(graph[0]["mainEntity"]["numberOfItems"], 2)
        self.assertEqual(graph[0]["mainEntity"]["itemListElement"][1]["url"], "https://bilnetoyun.com/oyunlar/ikinci/")
        self.assertIn("imza-band", html)

    def test_hub_title_and_description_within_limits(self):
        n = sum(1 for g in b.GAMES if b.is_active(g))
        self.assertLessEqual(len(b.hub_title(n)), b.TITLE_MAX)
        self.assertLessEqual(len(b.hub_description(n)), b.DESC_MAX)

    def test_sitemap_has_only_loc_and_lastmod(self):
        xml = b.build_sitemap([("https://bilnetoyun.com/", "2026-06-17"), ("https://bilnetoyun.com/oyunlar/", "2026-09-15")])
        self.assertEqual(xml.count("<loc>"), 2)
        self.assertIn("<lastmod>2026-06-17</lastmod>", xml)
        self.assertNotIn("changefreq", xml)
        self.assertNotIn("priority", xml)

    def test_llms_one_line_per_game_with_turkish_chars(self):
        txt = b.build_llms([game(short="Çğışöü korunur.")])
        self.assertIn("- [Örnek Oyun](https://bilnetoyun.com/oyunlar/ornek-oyun/): Çğışöü korunur.", txt)
        self.assertIn("https://bilnetoyun.com/sitemap.xml", txt)
        self.assertIn("https://bilnetoyun.com/oyunlar/", txt)

    def test_llms_total_counts_also_online(self):
        txt = b.build_llms([game(also_online=True), game(slug="b", name="B")])
        self.assertIn("3 oyun", txt)
        self.assertIn("2 sayfa; Örnek Oyun için", txt)


class DataTests(unittest.TestCase):
    def test_real_data_validates(self):
        b.validate_data()

    def test_exactly_one_inactive_and_new_records_present(self):
        slugs = {g["slug"] for g in b.GAMES}
        self.assertTrue({"son-kart", "hava-hokeyi", "zipla-topla-coop"} <= slugs)
        self.assertEqual([g["slug"] for g in b.GAMES if not b.is_active(g)], ["kelime-madeni-3d"])

    def test_fresh_render_falls_back_to_today_for_untracked_file(self):
        text, date, source = b.render_fresh("oyunlar/boyle-bir-dosya-yok/index.html", lambda d: "x" + d)
        self.assertEqual((text, date, source), ("x" + b.TODAY, b.TODAY, "bugun"))


if __name__ == "__main__":
    unittest.main(verbosity=1)
