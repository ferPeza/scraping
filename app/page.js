"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const POR_PAGINA = 50;

export default function Home() {
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
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
      let q = supabase
        .from("negocios")
        .select("*", { count: "exact" })
        .order("nombre")
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);

      const t = busqueda.replace(/[,()%]/g, " ").trim();
      if (t) {
        q = q.or(`nombre.ilike.%${t}%,colonia.ilike.%${t}%,actividad.ilike.%${t}%`);
      }

      const { data, count, error } = await q;
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
  }, [busqueda, pagina]);

  function exportarCSV() {
    const cols = ["nombre", "actividad", "direccion", "colonia", "cp", "telefono", "correo", "sitio_web"];
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

  return (
    <main>
      <h1>Negocios de Monclova</h1>

      <div className="barra">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre, giro o colonia"
        />
        <button onClick={exportarCSV} disabled={!filas.length}>
          Exportar CSV
        </button>
      </div>

      {error && <div className="vacio">Error: {error}</div>}
      <div className="total">{total.toLocaleString("es-MX")} resultados</div>

      <div className="lista">
        {filas.length === 0 && !error && <div className="vacio">Sin resultados.</div>}
        {filas.map((n) => (
          <div className="fila" key={n.id}>
            <div className="info">
              <div className="nombre">{n.nombre}</div>
              <div className="sub">
                {[n.actividad, n.direccion, n.colonia].filter(Boolean).join(" · ")}
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
