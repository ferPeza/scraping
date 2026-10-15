"""Carga negocios del DENUE (INEGI) a Supabase.

Uso:
  pip install supabase requests
  set DENUE_TOKEN=...  SUPABASE_URL=...  SUPABASE_SERVICE_KEY=...
  python scripts/cargar_denue.py
"""
import os
import requests
from supabase import create_client

TOKEN = os.environ["DENUE_TOKEN"]
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

# Puntos de búsqueda para cubrir Monclova (lat, lon, radio en metros)
PUNTOS = [
    (26.90, -101.42, 3000),
    (26.93, -101.45, 3000),
    (26.87, -101.40, 3000),
    (26.92, -101.38, 3000),
    (26.88, -101.46, 3000),
]


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


filas = {}
for lat, lon, radio in PUNTOS:
    url = (
        "https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/todos/"
        f"{lat},{lon}/{radio}/{TOKEN}"
    )
    for d in requests.get(url, timeout=60).json():
        filas[d["Id"]] = {
            "id": d.get("Id"),
            "nombre": d.get("Nombre"),
            "razon_social": d.get("Razon_social"),
            "actividad": d.get("Clase_actividad"),
            "direccion": f"{d.get('Calle', '')} {d.get('Num_Exterior', '')}".strip(),
            "colonia": d.get("Colonia"),
            "cp": d.get("CP"),
            "telefono": d.get("Telefono"),
            "correo": d.get("Correo_e"),
            "sitio_web": d.get("Sitio_internet"),
            "latitud": num(d.get("Latitud")),
            "longitud": num(d.get("Longitud")),
            "fecha_alta": d.get("Fecha_Alta"),
        }

lista = list(filas.values())
for i in range(0, len(lista), 500):
    sb.table("negocios").upsert(lista[i : i + 500]).execute()

print(f"{len(lista)} negocios cargados")
