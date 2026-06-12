#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Natural Earth (world-atlas) TopoJSON -> oyun verisi (gamedata.json)
- Arc paylasimindan kara komsulugu
- Izole ulkeler icin en yakin merkez bazli deniz komsulugu + tam baglanti garantisi
- Kure yuzey alanindan sehir sayisi (manuel override'larla)
- Equirectangular projeksiyonla onceden hesaplanmis SVG path'leri
"""
import json, math
from collections import defaultdict

topo = json.load(open('node_modules/world-atlas/countries-110m.json', encoding='utf-8'))
tr = topo['transform']
sx, sy = tr['scale']; tx, ty = tr['translate']

# Arc'lari coz (delta-decoded lon/lat)
arcs = []
for arc in topo['arcs']:
    pts, x, y = [], 0, 0
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)

geoms = topo['objects']['countries']['geometries']

def arc_indices(g):
    out = set()
    def walk(a):
        for el in a:
            if isinstance(el, list): walk(el)
            else: out.add(el if el >= 0 else ~el)
    walk(g.get('arcs', []))
    return out

def rings_of(g):
    """Poligon halkalarini (lon,lat listeleri) dondur."""
    rings = []
    def ring_coords(arclist):
        pts = []
        for ai in arclist:
            seg = arcs[ai] if ai >= 0 else arcs[~ai][::-1]
            if pts and seg and pts[-1] == seg[0]: seg = seg[1:]
            pts.extend(seg)
        return pts
    t = g['type']
    if t == 'Polygon':
        for ring in g['arcs']: rings.append(ring_coords(ring))
    elif t == 'MultiPolygon':
        for poly in g['arcs']:
            for ring in poly: rings.append(ring_coords(ring))
    return rings

def sph_area_km2(ring):
    """Kuresel yaklasik alan (km2), kucuk poligonlar icin yeterli."""
    R = 6371.0
    if len(ring) < 3: return 0.0
    s = 0.0
    for i in range(len(ring)):
        lon1, lat1 = ring[i]; lon2, lat2 = ring[(i+1) % len(ring)]
        s += math.radians(lon2 - lon1) * (2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2)))
    return abs(s) * R * R / 2

# Ulkeleri topla (Antarktika haric)
SKIP = {'Antarctica'}
countries = []
for g in geoms:
    name = g.get('properties', {}).get('name', '?')
    if name in SKIP or not g.get('arcs'): continue
    if 'id' not in g:
        g['id'] = 'X_' + name.replace(' ', '_').replace('.', '')
    rs = rings_of(g)
    area = sum(sph_area_km2(r) for r in rs if len(r) >= 3)
    # merkez: en buyuk halkanin ortalamasi
    big = max(rs, key=len)
    cx = sum(p[0] for p in big) / len(big); cy = sum(p[1] for p in big) / len(big)
    countries.append({'id': g['id'], 'name': name, 'g': g, 'rings': rs,
                      'area': area, 'cen': (cx, cy)})

# Turkce isimler
TR_NAMES = {
 'Turkey':'Türkiye','United States of America':'ABD','United Kingdom':'Birleşik Krallık','Germany':'Almanya',
 'France':'Fransa','Italy':'İtalya','Spain':'İspanya','Portugal':'Portekiz','Greece':'Yunanistan','Russia':'Rusya',
 'China':'Çin','Japan':'Japonya','India':'Hindistan','Brazil':'Brezilya','Canada':'Kanada','Mexico':'Meksika',
 'Australia':'Avustralya','Egypt':'Mısır','Iran':'İran','Iraq':'Irak','Syria':'Suriye','Saudi Arabia':'Suudi Arabistan',
 'Israel':'İsrail','Jordan':'Ürdün','Lebanon':'Lübnan','Cyprus':'Kıbrıs','Bulgaria':'Bulgaristan','Romania':'Romanya',
 'Hungary':'Macaristan','Austria':'Avusturya','Switzerland':'İsviçre','Belgium':'Belçika','Netherlands':'Hollanda',
 'Poland':'Polonya','Ukraine':'Ukrayna','Belarus':'Belarus','Czechia':'Çekya','Slovakia':'Slovakya','Slovenia':'Slovenya',
 'Croatia':'Hırvatistan','Serbia':'Sırbistan','Bosnia and Herz.':'Bosna-Hersek','Albania':'Arnavutluk',
 'North Macedonia':'Kuzey Makedonya','Macedonia':'Kuzey Makedonya','Montenegro':'Karadağ','Kosovo':'Kosova','Moldova':'Moldova',
 'Lithuania':'Litvanya','Latvia':'Letonya','Estonia':'Estonya','Finland':'Finlandiya','Sweden':'İsveç','Norway':'Norveç',
 'Denmark':'Danimarka','Iceland':'İzlanda','Ireland':'İrlanda','Morocco':'Fas','Algeria':'Cezayir','Tunisia':'Tunus',
 'Libya':'Libya','Sudan':'Sudan','S. Sudan':'Güney Sudan','Ethiopia':'Etiyopya','Somalia':'Somali','Kenya':'Kenya',
 'Tanzania':'Tanzanya','Uganda':'Uganda','Nigeria':'Nijerya','Ghana':'Gana','South Africa':'Güney Afrika',
 'Dem. Rep. Congo':'Demokratik Kongo','Congo':'Kongo','Angola':'Angola','Mozambique':'Mozambik','Madagascar':'Madagaskar',
 'Zambia':'Zambiya','Zimbabwe':'Zimbabve','Botswana':'Botsvana','Namibia':'Namibya','Cameroon':'Kamerun','Chad':'Çad',
 'Niger':'Nijer','Mali':'Mali','Mauritania':'Moritanya','Senegal':'Senegal','Guinea':'Gine','Ivory Coast':"Fildişi Sahili",
 "Côte d'Ivoire":'Fildişi Sahili','Burkina Faso':'Burkina Faso','Benin':'Benin','Togo':'Togo','Liberia':'Liberya',
 'Sierra Leone':'Sierra Leone','Gambia':'Gambiya','Guinea-Bissau':'Gine-Bissau','Gabon':'Gabon','Eq. Guinea':'Ekvator Ginesi',
 'Central African Rep.':'Orta Afrika Cum.','Eritrea':'Eritre','Djibouti':'Cibuti','Rwanda':'Ruanda','Burundi':'Burundi',
 'Malawi':'Malavi','Lesotho':'Lesotho','eSwatini':'Esvatini','Swaziland':'Esvatini','W. Sahara':'Batı Sahra',
 'Afghanistan':'Afganistan','Pakistan':'Pakistan','Bangladesh':'Bangladeş','Nepal':'Nepal','Bhutan':'Butan',
 'Sri Lanka':'Sri Lanka','Myanmar':'Myanmar','Thailand':'Tayland','Laos':'Laos','Vietnam':'Vietnam','Cambodia':'Kamboçya',
 'Malaysia':'Malezya','Indonesia':'Endonezya','Philippines':'Filipinler','Papua New Guinea':'Papua Yeni Gine',
 'New Zealand':'Yeni Zelanda','Mongolia':'Moğolistan','North Korea':'Kuzey Kore','South Korea':'Güney Kore',
 'Taiwan':'Tayvan','Kazakhstan':'Kazakistan','Uzbekistan':'Özbekistan','Turkmenistan':'Türkmenistan',
 'Kyrgyzstan':'Kırgızistan','Tajikistan':'Tacikistan','Azerbaijan':'Azerbaycan','Armenia':'Ermenistan','Georgia':'Gürcistan',
 'United Arab Emirates':'BAE','Qatar':'Katar','Kuwait':'Kuveyt','Bahrain':'Bahreyn','Oman':'Umman','Yemen':'Yemen',
 'Argentina':'Arjantin','Chile':'Şili','Peru':'Peru','Bolivia':'Bolivya','Paraguay':'Paraguay','Uruguay':'Uruguay',
 'Colombia':'Kolombiya','Venezuela':'Venezuela','Ecuador':'Ekvador','Guyana':'Guyana','Suriname':'Surinam',
 'Panama':'Panama','Costa Rica':'Kosta Rika','Nicaragua':'Nikaragua','Honduras':'Honduras','El Salvador':'El Salvador',
 'Guatemala':'Guatemala','Belize':'Belize','Cuba':'Küba','Haiti':'Haiti','Dominican Rep.':'Dominik Cum.',
 'Jamaica':'Jamaika','Trinidad and Tobago':'Trinidad ve Tobago','Bahamas':'Bahamalar','Puerto Rico':'Porto Riko',
 'Greenland':'Grönland','Fiji':'Fiji','Solomon Is.':'Solomon Adaları','Vanuatu':'Vanuatu','New Caledonia':'Yeni Kaledonya',
 'Timor-Leste':'Doğu Timor','Brunei':'Brunei','Singapore':'Singapur','Luxembourg':'Lüksemburg','Malta':'Malta',
 'Falkland Is.':'Falkland Adaları','Fr. S. Antarctic Lands':'Fransız Güney Toprakları','Palestine':'Filistin',
 'N. Cyprus':'Kuzey Kıbrıs','Somaliland':'Somaliland','Kashmir':'Keşmir','Western Sahara':'Batı Sahra',
}

# Sehir sayisi: manuel (eyalet orani kurali uygulanmis) + alan bazli fallback
CITY_OVERRIDE = {
 'Türkiye':81,'ABD':150,'Almanya':48,'Rusya':170,'Çin':160,'Hindistan':140,'Brezilya':108,
 'Kanada':40,'Avustralya':32,'Fransa':96,'İtalya':80,'İspanya':50,'Birleşik Krallık':60,
 'Japonya':47,'Endonezya':76,'Meksika':64,'Arjantin':48,'İran':31,'Mısır':27,'Nijerya':74,
 'Pakistan':45,'Bangladeş':30,'Suudi Arabistan':26,'Güney Afrika':36,'Polonya':32,'Ukrayna':24,
 'Kazakistan':28,'Yunanistan':25,'Suriye':14,'Irak':18,'Azerbaycan':14,'Gürcistan':10,'Ermenistan':8,
 'Bulgaristan':28,'Romanya':41,'Hollanda':12,'Belçika':10,'İsviçre':26,'Avusturya':9,'Güney Kore':17,
 'Kuzey Kore':9,'Vietnam':34,'Tayland':38,'Filipinler':40,'Malezya':16,
}

def cities_from_area(a):
    if a < 25000: return 4
    if a < 80000: return 7
    if a < 200000: return 12
    if a < 500000: return 18
    if a < 1000000: return 26
    if a < 2500000: return 38
    return 55

# Komsuluk: arc paylasimi
arc_owner = defaultdict(set)
for c in countries:
    for ai in arc_indices(c['g']):
        arc_owner[ai].add(c['id'])
neigh = defaultdict(set)
for ai, owners in arc_owner.items():
    for a in owners:
        for b in owners:
            if a != b: neigh[a].add(b)

byid = {c['id']: c for c in countries}

def dist(a, b):
    ax, ay = byid[a]['cen']; bx, by = byid[b]['cen']
    dx = min(abs(ax - bx), 360 - abs(ax - bx)) * math.cos(math.radians((ay + by) / 2))
    return math.hypot(dx, ay - by)

# 1) Izole ulkeler: en yakin 2 ulkeye baglan
ids = list(byid.keys())
for cid in ids:
    if not neigh[cid]:
        nearest = sorted((dist(cid, o) for o in ids if o != cid))
        near = sorted((o for o in ids if o != cid), key=lambda o: dist(cid, o))[:2]
        for n in near:
            neigh[cid].add(n); neigh[n].add(cid)

# 2) Tam baglanti: bilesenler arasi en yakin ciftleri birlestir
def components():
    seen, comps = set(), []
    for s in ids:
        if s in seen: continue
        stack, comp = [s], set()
        while stack:
            v = stack.pop()
            if v in comp: continue
            comp.add(v); seen.add(v)
            stack.extend(neigh[v] - comp)
        comps.append(comp)
    return comps

comps = components()
while len(comps) > 1:
    main = max(comps, key=len)
    for comp in comps:
        if comp is main: continue
        best = min(((a, b, dist(a, b)) for a in comp for b in main), key=lambda t: t[2])
        neigh[best[0]].add(best[1]); neigh[best[1]].add(best[0])
    comps = components()

# Projeksiyon: equirectangular, y ekseni ters; viewBox 0..1000 x 0..520
W, H = 1000, 520
def proj(lon, lat):
    x = (lon + 180) / 360 * W
    y = (90 - lat) / 180 * (H * 180 / 156)  # lat -66..84 araligini siksin
    return x, y

# lat araligini kirp: -60..85 arasini H'ye oturt
LAT_MIN, LAT_MAX = -58, 84
def proj2(lon, lat):
    x = (lon + 180) / 360 * W
    y = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * H
    return round(x, 1), round(y, 1)

out = []
for c in countries:
    paths = []
    for ring in c['rings']:
        if len(ring) < 3: continue
        if sph_area_km2(ring) < 600: continue  # minik adalari at
        pts = [proj2(lon, lat) for lon, lat in ring]
        d = 'M' + ' '.join(f'{x},{y}' for x, y in pts) + 'Z'
        paths.append(d)
    if not paths: continue
    name_tr = TR_NAMES.get(c['name'], c['name'])
    cities = CITY_OVERRIDE.get(name_tr, cities_from_area(c['area']))
    px, py = proj2(*c['cen'])
    out.append({'id': str(c['id']), 'n': name_tr, 'p': paths, 'c': cities,
                'x': px, 'y': py, 'nb': sorted(str(n) for n in neigh[c['id']])})

# id'leri stringe cevirip komsuluklari filtrele
valid = {o['id'] for o in out}
for o in out:
    o['nb'] = [n for n in o['nb'] if n in valid]

print(f"Ulke sayisi: {len(out)}")
print(f"Toplam sehir: {sum(o['c'] for o in out)}")
print(f"Komsusuz ulke: {sum(1 for o in out if not o['nb'])}")
tr_c = next(o for o in out if o['n'] == 'Türkiye')
print(f"Türkiye komsulari: {[next(x['n'] for x in out if x['id']==n) for n in tr_c['nb']]}")
json.dump(out, open('gamedata.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
import os
print(f"gamedata.json: {os.path.getsize('gamedata.json')//1024} KB")
