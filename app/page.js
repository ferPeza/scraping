"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const POR_PAGINA = 50;
const VISTA = "negocios_unicos";

const limpiar = (s) => s.replace(/[,()%]/g, " ").trim();

function filtrar(q, t, f) {
  if (t) q = q.or(`nombre.ilike.%${t}%,colonia.ilike.%${t}%,actividad.ilike.%${t}%,host.ilike.%${t}%`);
  if (f.tel) q = q.not("telefono", "is", null).neq("telefono", "");
  if (f.web) q = q.neq("host", "");
  if (f.estado === "activa") q = q.eq("web_activa", true);
  if (f.estado === "caida") q = q.eq("web_activa", false);
  return q;
}

export default function Home() {
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [f, setF] = useState({ tel: false, web: false, estado: "" });
  const [pagina, setPagina] = useState(0);
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ tel: 0, web: 0, activas: 0, caidas: 0, ultima: "—" });
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
      const { data, count, error } = await filtrar(
        supabase.from(VISTA).select("*", { count: "exact" }),
        limpiar(busqueda),
        f
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
  }, [busqueda, pagina, f]);

  useEffect(() => {
    let activo = true;
    async function contar() {
      const t = limpiar(busqueda);
      const head = { count: "exact", head: true };
      const q0 = () => filtrar(supabase.from(VISTA).select("id", head), t, f);
      const [tel, web, act, cai, ult] = await Promise.all([
        q0().not("telefono", "is", null).neq("telefono", ""),
        q0().neq("host", ""),
        q0().eq("web_activa", true),
        q0().eq("web_activa", false),
        filtrar(supabase.from(VISTA).select("fecha_alta").not("fecha_alta", "is", null), t, f)
          .order("fecha_alta", { ascending: false })
          .limit(1),
      ]);
      if (!activo) return;
      setStats({
        tel: tel.count || 0,
        web: web.count || 0,
        activas: act.count || 0,
        caidas: cai.count || 0,
        ultima: ult.data?.[0]?.fecha_alta || "—",
      });
    }
    contar();
    return () => {
      activo = false;
    };
  }, [busqueda, f]);

  const alternar = (k) => {
    setF((p) => ({ ...p, [k]: !p[k] }));
    setPagina(0);
  };
  const estado = (v) => {
    setF((p) => ({ ...p, estado: p.estado === v ? "" : v }));
    setPagina(0);
  };

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const fmt = (n) => n.toLocaleString("es-MX");
  const fecha = (v) => (v ? new Date(v + "T00:00:00").toLocaleDateString("es-MX") : "—");

  return (
    <main>
      <h1>
        &gt; NEGOCIOS_MONCLOVA<span className="cursor">_</span>
      </h1>

      <div className="barra">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="buscar: nombre, giro, colonia, web..."
        />
      </div>

      <div className="barra">
        <button className={f.tel ? "activo" : ""} onClick={() => alternar("tel")}>
          [ CON TELÉFONO ]
        </button>
        <button className={f.web ? "activo" : ""} onClick={() => alternar("web")}>
          [ CON WEB ]
        </button>
        <button className={f.estado === "activa" ? "activo" : ""} onClick={() => estado("activa")}>
          [ WEB ACTIVA ]
        </button>
        <button className={f.estado === "caida" ? "activo" : ""} onClick={() => estado("caida")}>
          [ WEB CAÍDA ]
        </button>
      </div>

      <div className="cajas">
        <div className="caja">
          <span>RESULTADOS</span>
          <strong>{fmt(total)}</strong>
        </div>
        <div className="caja">
          <span>CON TELÉFONO</span>
          <strong>{fmt(stats.tel)}</strong>
        </div>
        <div className="caja">
          <span>CON WEB</span>
          <strong>{fmt(stats.web)}</strong>
        </div>
        <div className="caja">
          <span>WEBS ACTIVAS</span>
          <strong>{fmt(stats.activas)}</strong>
        </div>
        <div className="caja">
          <span>WEBS CAÍDAS</span>
          <strong>{fmt(stats.caidas)}</strong>
        </div>
        <div className="caja">
          <span>ALTA MÁS RECIENTE</span>
          <strong>{stats.ultima}</strong>
        </div>
      </div>

      {error && <div className="vacio">ERROR: {error}</div>}

      <div className="scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>NEGOCIO</th>
              <th>TELÉFONO</th>
              <th>SITIO WEB</th>
              <th>ESTADO</th>
              <th>DOMINIO</th>
              <th>VENCE</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="vacio">
                  SIN RESULTADOS
                </td>
              </tr>
            )}
            {filas.map((n) => (
              <tr key={n.id}>
                <td>
                  <div className="nombre">{n.nombre}</div>
                  <div className="sub">
                    {[n.actividad, n.direccion, n.colonia].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td>{n.telefono || "—"}</td>
                <td>
                  {n.host ? (
                    <a href={`https://${n.host}`} target="_blank" rel="noreferrer">
                      {n.host}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {!n.host
                    ? "—"
                    : n.web_activa === true
                    ? "[ACTIVA]"
                    : n.web_activa === false
                    ? "[CAÍDA]"
                    : "[SIN REVISAR]"}
                </td>
                <td>
                  {n.web_activa !== false
                    ? "—"
                    : n.dominio_registrado === true
                    ? "REGISTRADO"
                    : n.dominio_registrado === false
                    ? "NO REGISTRADO"
                    : "—"}
                </td>
                <td>{fecha(n.dominio_vence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pag">
        <button onClick={() => setPagina((p) => p - 1)} disabled={pagina === 0}>
          &lt; ANTERIOR
        </button>
        <span>
          PÁGINA {pagina + 1} / {paginas}
        </span>
        <button onClick={() => setPagina((p) => p + 1)} disabled={pagina + 1 >= paginas}>
          SIGUIENTE &gt;
        </button>
      </div>
    </main>
  );
}
