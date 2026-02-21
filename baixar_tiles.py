#!/usr/bin/env python3
"""
Script para baixar os tiles de Jaboatão dos Guararapes offline.
Execute no seu computador: python3 baixar_tiles.py

Requer: pip install requests
"""

import math, os, time, sys
import requests

# === ÁREA: Jaboatão dos Guararapes - PE ===
LAT_MIN = -8.2800
LAT_MAX = -8.0800
LON_MIN = -35.0800
LON_MAX = -34.8600
ZOOMS   = range(10, 17)   # zoom 10 até 16

# Tiles escuros (CartoCDN dark)
TILE_URL = "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
OUT_DIR  = "tiles"

def tile_xy(lat, lon, z):
    lr = math.radians(lat)
    n  = 2 ** z
    x  = int((lon + 180) / 360 * n)
    y  = int((1 - math.log(math.tan(lr) + 1/math.cos(lr)) / math.pi) / 2 * n)
    return x, y

headers = {"User-Agent": "ReiEntregasApp/1.0 (jaboatao-offline-map)"}
session = requests.Session()
session.headers.update(headers)

downloaded = skipped = errors = 0
total_bytes = 0

for z in ZOOMS:
    x0, y1 = tile_xy(LAT_MAX, LON_MIN, z)
    x1, y0 = tile_xy(LAT_MIN, LON_MAX, z)
    count = (x1-x0+1) * (y1-y0+1)
    print(f"\nZoom {z}: {count} tiles")

    for x in range(x0, x1+1):
        os.makedirs(f"{OUT_DIR}/{z}/{x}", exist_ok=True)
        for y in range(y0, y1+1):
            path = f"{OUT_DIR}/{z}/{x}/{y}.png"
            if os.path.exists(path) and os.path.getsize(path) > 0:
                skipped += 1
                continue
            url = TILE_URL.replace("{z}",str(z)).replace("{x}",str(x)).replace("{y}",str(y))
            try:
                r = session.get(url, timeout=15)
                if r.status_code == 200:
                    with open(path,"wb") as f: f.write(r.content)
                    total_bytes += len(r.content)
                    downloaded  += 1
                    if downloaded % 200 == 0:
                        mb = total_bytes/1024/1024
                        print(f"  ✅ {downloaded} baixados | {skipped} pulados | {mb:.1f} MB")
                else:
                    errors += 1
                    print(f"  ⚠️  HTTP {r.status_code}: {url}")
            except Exception as e:
                errors += 1
                print(f"  ❌ Erro: {e}")
            time.sleep(0.04)   # ~25 req/s — respeita servidor

print(f"\n{'='*50}")
print(f"✅ Concluído!")
print(f"   Baixados : {downloaded}")
print(f"   Pulados  : {skipped}")
print(f"   Erros    : {errors}")
print(f"   Tamanho  : {total_bytes/1024/1024:.1f} MB")
print(f"\nPasta gerada: ./{OUT_DIR}/")
print("Agora suba a pasta 'tiles/' junto com os outros arquivos no GitHub.")
