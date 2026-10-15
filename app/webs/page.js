"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const POR_PAGINA = 50;

const base = (cols = "*", opts) =>
  supabase
    .from("negocios")
    .select(cols, opts)
    .not("sitio_web", "is", null)
    .neq("sitio_web", "");

export default function Webs() {
  const [filtro, setFiltro] = useState("todas");
  const [pagina, setPagina] = useState(0);
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ web: 0, activas: 0, caidas: 0, ultima: "—" });
  const [error, setError] = useState("");

  useEffect(() => {
    async function contar() {
      const head = { count: "exact", head: true };
      const [web, act, cai, ult] = await Promise.all([
        base("id", head),
        base("id", head).eq("web_activa", true),
        base("id", head).eq("web_activa", false),
        supabase
          .from("negocios")
          .select("web_revisada")
          .not("web_revisada", "is", null)
          .order("web_revisada", { ascending: false })
          .limit(1),
      ]);
      const f = ult.data?.[0]?.web_revisada;
      setStats({
        web: web.count || 0,
        activas: act.count || 0,
        caidas: cai.count || 0,
        ultima: f ? new Date(f).toLocaleDateString("es-MX") : "—",
      });
    }
    contar();
  }, []);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      let q = base("*", { count: "exact" });
      if (filtro === "activas") q = q.eq("web_activa", true);
      if (filtro === "caidas") q = q.eq("web_activa", false);
      const { data, count, error } = await q
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
  }, [filtro, pagina]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const fmt = (n) => n.toLocaleString("es-MX");
  const cambiar = (f) => {
    setFiltro(f);
    setPagina(0);
  };

  return (
    <main>
      <h1>Estado de los sitios web</h1>

      <div className="barra">
        {["todas", "activas", "caidas"].map((f) => (
          <button key={f} className={filtro === f ? "activo" : ""} onClick={() => cambiar(f)}>
            {f === "todas" ? "Todas" : f === "activas" ? "Activas" : "Caídas"}
          </button>
        ))}
      </div>

      <div className="cajas">
        <div className="caja">
          <span>Negocios con web</span>
          <strong>{fmt(stats.web)}</strong>
        </div>
        <div className="caja">
          <span>Activas</span>
          <strong>{fmt(stats.activas)}</strong>
        </div>
        <div className="caja">
          <span>Caídas</span>
          <strong>{fmt(stats.caidas)}</strong>
        </div>
        <div className="caja">
          <span>Última revisión</span>
          <strong>{stats.ultima}</strong>
        </div>
      </div>

      {error && <div className="vacio">Error: {error}</div>}
      <div className="total">{fmt(total)} resultados</div>

      <div className="lista">
        {filas.length === 0 && !error && <div className="vacio">Sin resultados.</div>}
        {filas.map((n) => (
          <div className="fila" key={n.id}>
            <div className="info">
              <div className="nombre">{n.nombre}</div>
              <div className="sub">{[n.actividad, n.colonia].filter(Boolean).join(" · ")}</div>
            </div>
            <a
              href={n.sitio_web.startsWith("http") ? n.sitio_web : `https://${n.sitio_web}`}
              target="_blank"
              rel="noreferrer"
            >
              {n.sitio_web}
            </a>
            <span
              className={
                n.web_activa === true ? "badge ok" : n.web_activa === false ? "badge mal" : "badge"
              }
            >
              {n.web_activa === true ? "Activa" : n.web_activa === false ? "Caída" : "Sin revisar"}
            </span>
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
