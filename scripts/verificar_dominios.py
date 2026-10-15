import os
import socket
import time
from concurrent.futures import ThreadPoolExecutor

import requests
import tldextract
from supabase import create_client

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
extraer = tldextract.TLDExtract(suffix_list_urls=())

RDAP = {}
for tlds, urls in requests.get("https://data.iana.org/rdap/dns.json", timeout=30).json()["services"]:
    base = next((u for u in urls if u.startswith("https")), urls[0])
    for t in tlds:
        RDAP[t.lower()] = base


def dominio(url):
    v = (url or "").strip().split()[0] if (url or "").strip() else ""
    v = v.replace("https://", "").replace("http://", "").lstrip(":/")
    r = extraer(v.split("/")[0])
    d = getattr(r, "top_domain_under_public_suffix", None) or r.registered_domain
    return (d.lower(), r.suffix.split(".")[-1].lower()) if d else None


def consultar(par):
    d, tld = par
    base = RDAP.get(tld)
    if base:
        for _ in range(3):
            try:
                r = requests.get(f"{base}domain/{d}", timeout=15)
                if r.status_code == 404:
                    return False, None
                if r.status_code == 200:
                    vence = None
                    for e in r.json().get("events", []):
                        if e.get("eventAction") == "expiration":
                            vence = e.get("eventDate", "")[:10]
                    return True, vence
                if r.status_code == 429:
                    time.sleep(5)
                    continue
                break
            except (requests.RequestException, ValueError):
                time.sleep(2)
    try:
        socket.gethostbyname(d)
        return True, None
    except socket.gaierror:
        return None, None


filas, desde = [], 0
while True:
    lote = (
        sb.table("negocios")
        .select("id,sitio_web")
        .eq("web_activa", False)
        .range(desde, desde + 999)
        .execute()
        .data
    )
    filas += lote
    if len(lote) < 1000:
        break
    desde += 1000

pares = {p for p in (dominio(f["sitio_web"]) for f in filas) if p}
print(f"{len(filas)} webs caídas, {len(pares)} dominios únicos")

with ThreadPoolExecutor(max_workers=5) as ex:
    estado = dict(zip(pares, ex.map(consultar, pares)))

registros = []
for f in filas:
    p = dominio(f["sitio_web"])
    reg, vence = estado.get(p, (None, None))
    registros.append({"id": f["id"], "dominio_registrado": reg, "dominio_vence": vence})

for i in range(0, len(registros), 200):
    sb.table("negocios").upsert(registros[i : i + 200]).execute()

print("Listo")