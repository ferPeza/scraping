"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const POR_PAGINA = 50;

function filtrar(q, t, conTel, conWeb) {
  if (t) q = q.or(`nombre.ilike.%${t}%,colonia.ilike.%${t}%,actividad.ilike.%${t}%`);
  if (conTel) q = q.not("telefono", "is", null).neq("telefono", "");
  if (conWeb) q = q.not("sitio_web", "is", null).neq("sitio_web", "");
  return q;
}

export default function Home() {
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [conTel, setConTel] = useState(false);
  const [conWeb, setConWeb] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ tel: 0, web: 0, ultima: "—" });
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(texto);
      setPagina(0);
    }, 300);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const t = busqueda.replace(/[,()%]/g, " ").trim();
      const { data, count, error } = await filtrar(
        supabase.from("negocios").select("*", { count: "exact" }),
        t,
        conTel,
        conWeb
      )
        .order("nombre")
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
      if (!activo) return;
      if (error) {
        setError(error.message);
        return;
      }
      setError("");
      setFilas(data || []);
      setTotal(count || 0);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [busqueda, pagina, conTel, conWeb]);

  useEffect(() => {
    let activo = true;
    async function contar() {
      const t = busqueda.replace(/[,()%]/g, " ").trim();
      const base = () =>
        filtrar(
          supabase.from("negocios").select("id", { count: "exact", head: true }),
          t,
          conTel,
          conWeb
        );
      const [tel, web, ult] = await Promise.all([
        base().not("telefono", "is", null).neq("telefono", ""),
        base().not("sitio_web", "is", null).neq("sitio_web", ""),
        filtrar(
          supabase.from("negocios").select("fecha_alta").not("fecha_alta", "is", null),
          t,
          conTel,
          conWeb
        )
          .order("fecha_alta", { ascending: false })
          .limit(1),
      ]);
      if (!activo) return;
      setStats({
        tel: tel.count || 0,
        web: web.count || 0,
        ultima: ult.data?.[0]?.fecha_alta || "—",
      });
    }
    contar();
    return () => {
      activo = false;
    };
  }, [busqueda, conTel, conWeb]);

  function exportarCSV() {
    const cols = ["nombre", "actividad", "direccion", "colonia", "cp", "telefono", "correo", "sitio_web", "fecha_alta"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...filas.map((f) => cols.map((c) => esc(f[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "negocios_monclova.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const fmt = (n) => n.toLocaleString("es-MX");

  return (
    <main>
      <h1>Negocios de Monclova</h1>

      <div className="barra">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre, giro o colonia"
        />
        <button
          className={conTel ? "activo" : ""}
          onClick={() => {
            setConTel((v) => !v);
            setPagina(0);
          }}
        >
          Con teléfono
        </button>
        <button
          className={conWeb ? "activo" : ""}
          onClick={() => {
            setConWeb((v) => !v);
            setPagina(0);
          }}
        >
          Con web
        </button>
        <button onClick={exportarCSV} disabled={!filas.length}>
          Exportar CSV
        </button>
      </div>

      <div className="cajas">
        <div className="caja">
          <span>Resultados</span>
          <strong>{fmt(total)}</strong>
        </div>
        <div className="caja">
          <span>Con teléfono</span>
          <strong>{fmt(stats.tel)}</strong>
        </div>
        <div className="caja">
          <span>Con sitio web</span>
          <strong>{fmt(stats.web)}</strong>
        </div>
        <div className="caja">
          <span>Alta más reciente</span>
          <strong>{stats.ultima}</strong>
        </div>
      </div>

      {error && <div className="vacio">Error: {error}</div>}

      <div className="lista">
        {filas.length === 0 && !error && <div className="vacio">Sin resultados.</div>}
        {filas.map((n) => (
          <div className="fila" key={n.id}>
            <div className="info">
              <div className="nombre">{n.nombre}</div>
              <div className="sub">
                {[n.actividad, n.direccion, n.colonia, n.fecha_alta && `Alta: ${n.fecha_alta}`]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <div className="tel">{n.telefono || "Sin teléfono"}</div>
            {n.sitio_web && (
              <a
                href={n.sitio_web.startsWith("http") ? n.sitio_web : `https://${n.sitio_web}`}
                target="_blank"
                rel="noreferrer"
              >
                Web
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="pag">
        <button onClick={() => setPagina((p) => p - 1)} disabled={pagina === 0}>
          Anterior
        </button>
        <span>
          Página {pagina + 1} de {paginas}
        </span>
        <button onClick={() => setPagina((p) => p + 1)} disabled={pagina + 1 >= paginas}>
          Siguiente
        </button>
      </div>
    </main>
  );
}
