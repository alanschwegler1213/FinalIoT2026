"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  BookOpen,
  ChartLine,
  Droplet,
  Droplets,
  Hourglass,
  Leaf,
  Moon,
  Sprout,
  Sun,
  TriangleAlert,
  Waves,
} from "lucide-react";
import { INTERVALO_MIN, UMBRAL_EMPAPADA, type Lectura } from "@/lib/humedad";
import type { EstadoPlanta } from "@/lib/estado";
import { decimal, enCuanto, fechaCorta, fechaLarga, hace, haceTitulo, plazo } from "@/lib/formato";
import Historial, { RANGOS, type RangoId } from "./Historial";

const Planta3D = dynamic(() => import("./Planta3D"), { ssr: false });

type Datos = Exclude<EstadoPlanta, { vacio: true }>;
type Visual = "regar" | "secando" | "bien" | "empapada";

const ESTADOS: Record<Visual, { texto: string; Icono: typeof Sprout }> = {
  regar: { texto: "Le toca agua", Icono: TriangleAlert },
  secando: { texto: "Se está secando", Icono: Hourglass },
  bien: { texto: "Bien de agua", Icono: Sprout },
  empapada: { texto: "Recién regada", Icono: Waves },
};
const SIN_DATOS_MIN = 45; // si no llega nada en este tiempo, el sensor está caído

/** Anima un número desde su valor anterior hasta el nuevo. */
function useCuenta(objetivo: number) {
  const [valor, setValor] = useState(0);
  const desde = useRef(0);
  useEffect(() => {
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const inicio = performance.now();
    const origen = desde.current;
    let id = 0;
    const paso = (t: number) => {
      const k = quieto ? 1 : Math.min(1, (t - inicio) / 1100);
      const v = Math.round(origen + (objetivo - origen) * (1 - (1 - k) ** 4));
      setValor(v);
      desde.current = v;
      if (k < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [objetivo]);
  return valor;
}

function frase(d: Datos, visual: Visual, ahora: number) {
  if (visual === "regar") return <>La tierra está seca. <strong>Regala hoy</strong>.</>;
  if (visual === "empapada") return <>Recién regada. Dejá que drene y <strong>no vuelvas a regar</strong> hasta que baje.</>;
  const prox = d.proximoRiego && d.proximoRiego !== "ya" ? plazo(d.proximoRiego, ahora) : null;
  if (visual === "secando")
    return prox ? <>Todavía aguanta, pero va a pedir agua en <strong>{prox}</strong>.</> : <>Todavía aguanta, pero <strong>vigilala</strong>.</>;
  return prox ? <>Tierra húmeda y cómoda. Próximo riego en <strong>{prox}</strong>.</> : <>Tierra húmeda y cómoda.</>;
}

function Resumen({ d, ahora }: { d: Datos; ahora: number }) {
  const visual: Visual = d.pct >= UMBRAL_EMPAPADA ? "empapada" : d.estado;
  const { texto, Icono } = ESTADOS[visual];
  const cifra = useCuenta(d.pct);
  const atrasado = ahora - new Date(d.medido_en).getTime() > SIN_DATOS_MIN * 60_000;

  return (
    <section id="resumen" className="tarjeta heroe" aria-labelledby="t-resumen" data-estado={visual}>
      <div className="heroe-datos">
        <span className="ceja" id="t-resumen">
          Humedad de la tierra ahora
        </span>
        <p className="cifra" aria-label={`${d.pct} por ciento`}>
          {cifra}
          <small>%</small>
        </p>
        <span className="chip-estado">
          <Icono size={18} aria-hidden /> {texto}
        </span>
        <p className="frase">{frase(d, visual, ahora)}</p>

        <div className="escala">
          <div
            className="escala-barra"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={d.pct}
            aria-label="Humedad en la escala de la albahaca"
          >
            <span data-estado="regar" />
            <span data-estado="secando" />
            <span data-estado="bien" />
            <span data-estado="empapada" />
            <i className="escala-marca" style={{ left: `${d.pct}%` }} />
          </div>
          <div className="escala-rotulos" aria-hidden>
            <span>Le toca agua</span>
            <span>Ideal</span>
            <span>Recién regada</span>
          </div>
        </div>

        <dl className="meta">
          <div>
            <dt>Última lectura</dt>
            <dd title={fechaLarga(d.medido_en)}>{hace(d.medido_en, ahora)}</dd>
          </div>
          <div>
            <dt>Frecuencia</dt>
            <dd>cada {INTERVALO_MIN} min</dd>
          </div>
        </dl>

        {atrasado && (
          <div className="aviso" data-estado="secando" role="status">
            <TriangleAlert size={18} aria-hidden />
            <p>
              El sensor no manda datos desde {fechaLarga(d.medido_en)}. Revisá que la placa esté enchufada y con WiFi.
            </p>
          </div>
        )}
      </div>
      <div className="heroe-escena">
        <Planta3D pct={d.pct} />
        <span className="pista-3d">Arrastrá para girarla</span>
      </div>
    </section>
  );
}

function Dato({ Icono, rotulo, valor, sub }: { Icono: typeof Sprout; rotulo: string; valor: string; sub: string }) {
  return (
    <article className="tarjeta dato">
      <span className="dato-icono">
        <Icono size={18} aria-hidden />
      </span>
      <span className="dato-rotulo">{rotulo}</span>
      <span className="dato-valor">{valor}</span>
      <span className="dato-sub">{sub}</span>
    </article>
  );
}

function Pronostico({ d, ahora }: { d: Datos; ahora: number }) {
  const prox = d.proximoRiego;
  const c = d.cambioUltimaHora;
  return (
    <section id="pronostico" className="pronostico revelar" aria-label="Pronóstico">
      <Dato
        Icono={Droplets}
        rotulo="Próximo riego"
        valor={prox === "ya" ? "Ahora" : prox ? enCuanto(prox, ahora) : "Sin estimar"}
        sub={prox === "ya" ? "la humedad bajó del 30 %" : prox ? `aprox. ${fechaCorta(prox)}` : "falta medir unas horas más"}
      />
      <Dato
        Icono={Droplet}
        rotulo="Último riego"
        valor={d.ultimoRiego ? haceTitulo(d.ultimoRiego, ahora) : "Sin registrar"}
        sub={d.ultimoRiego ? fechaCorta(d.ultimoRiego) : "se registra solo al regar"}
      />
      <Dato
        Icono={Hourglass}
        rotulo="Se seca"
        valor={d.secadoPorDia !== null ? `${decimal(d.secadoPorDia)} % por día` : "—"}
        sub={d.secadoPorDia !== null ? "desde el último riego" : "necesita 6 h de datos"}
      />
      <Dato
        Icono={Activity}
        rotulo="Última hora"
        valor={c === null ? "—" : `${c > 0 ? "+" : ""}${c} pts`}
        sub={c === null ? "falta 1 h de datos" : c === 0 ? "sin cambios" : c < 0 ? "se secó un poco" : "subió la humedad"}
      />
    </section>
  );
}

function Riegos({ d, ahora }: { d: Datos; ahora: number }) {
  return (
    <section id="riegos" className="tarjeta revelar" aria-labelledby="t-riegos">
      <div className="cabecera-tarjeta">
        <h2 id="t-riegos" className="tarjeta-titulo">
          <Droplet size={20} aria-hidden /> Riegos de la última semana
        </h2>
        <span className="muy-tenue">Se detectan solos por el salto de humedad</span>
      </div>
      {d.riegos.length === 0 ? (
        <p className="vacio">
          <Droplet size={18} aria-hidden /> Ninguno en los últimos 7 días.
        </p>
      ) : (
        <ul className="lista-riegos">
          {d.riegos.map((r) => (
            <li key={r.en} className="riego">
              <span className="riego-icono">
                <Droplet size={18} aria-hidden />
              </span>
              <span className="riego-cuando">
                <b>{fechaLarga(r.en)}</b>
                <span>{hace(r.en, ahora)}</span>
              </span>
              <span className="riego-salto" aria-label={`de ${r.antes} a ${r.despues} por ciento`}>
                <span className="mini-barra" aria-hidden>
                  <i style={{ left: `${r.antes}%`, width: `${r.despues - r.antes}%` }} />
                </span>
                {r.antes} % → <b>{r.despues} %</b>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const SECCIONES = [
  { id: "resumen", nombre: "Ahora", Icono: Sprout },
  { id: "pronostico", nombre: "Pronóstico", Icono: Hourglass },
  { id: "historial", nombre: "Historial", Icono: ChartLine },
  { id: "riegos", nombre: "Riegos", Icono: Droplet },
  { id: "planta", nombre: "Planta", Icono: BookOpen },
];

function Navegacion({ listo }: { listo: boolean }) {
  const [activa, setActiva] = useState("resumen");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.isIntersecting && setActiva(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECCIONES.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [listo]); // las secciones con datos aparecen recién después de la primera carga
  return (
    <nav className="dock" aria-label="Secciones">
      {SECCIONES.map(({ id, nombre, Icono }) => (
        <a key={id} href={`#${id}`} aria-current={activa === id}>
          <Icono size={19} aria-hidden />
          {nombre}
        </a>
      ))}
    </nav>
  );
}

function cambiarTema() {
  const raiz = document.documentElement;
  const nuevo = raiz.dataset.tema === "claro" ? "oscuro" : "claro";
  raiz.dataset.tema = nuevo;
  try {
    localStorage.setItem("tema", nuevo);
  } catch {}
}

export default function Panel({ children }: { children?: React.ReactNode }) {
  const [est, setEst] = useState<EstadoPlanta | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [rango, setRango] = useState<RangoId>("24h");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const [ahora, setAhora] = useState(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const horas = RANGOS.find((r) => r.id === rango)!.horas;
      const [e, p] = await Promise.all([
        fetch("/api/estado").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
        fetch(`/api/lecturas?horas=${horas}`).then((r) => r.json()),
      ]);
      setEst(e);
      setLecturas(Array.isArray(p) ? p : []);
      setAhora(Date.now());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [rango]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial y al cambiar el rango
    cargar();
  }, [cargar]);

  // Realtime: cada lectura nueva refresca el panel sin consultas periódicas.
  useEffect(() => {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const canal = sb
      .channel("lecturas")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lecturas" }, cargar)
      .subscribe((s) => setEnVivo(s === "SUBSCRIBED"));
    return () => void sb.removeChannel(canal);
  }, [cargar]);

  // Mantiene frescos los "hace X min" sin volver a consultar.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
  }, []);

  const d = est && !est.vacio ? est : null;
  const atrasado = d ? ahora - new Date(d.medido_en).getTime() > SIN_DATOS_MIN * 60_000 : true;
  const senal = !est ? "conectando" : enVivo && !atrasado ? "vivo" : "sin-senal";

  return (
    <>
      <header className="encabezado">
        <div className="contenedor">
          <a className="marca" href="#resumen">
            <span className="marca-logo">
              <Leaf size={20} aria-hidden />
            </span>
            <span className="marca-nombre">
              Albahaca
              <span className="marca-sub">Monitor de humedad</span>
            </span>
          </a>
          <span className="pastilla-vivo" data-estado={senal} role="status">
            <span className="punto" aria-hidden />
            {senal === "vivo" ? "En vivo" : senal === "conectando" ? "Conectando…" : "Sin datos recientes"}
          </span>
          <button type="button" className="boton-icono" onClick={cambiarTema} aria-label="Cambiar entre tema claro y oscuro">
            <Sun size={18} className="icono-sol" aria-hidden />
            <Moon size={18} className="icono-luna" aria-hidden />
          </button>
        </div>
      </header>

      <main className="contenedor">
        {error && (
          <div className="aviso" data-estado="regar" role="alert">
            <TriangleAlert size={18} aria-hidden />
            <p>No se pudo cargar la información. Se reintenta sola cuando llegue una lectura nueva.</p>
          </div>
        )}

        {!est && !error && (
          <section id="resumen" className="tarjeta heroe heroe-cargando" aria-busy="true">
            <div className="heroe-datos">
              <span className="ceja">Humedad de la tierra ahora</span>
              <p className="muy-tenue">Cargando…</p>
            </div>
          </section>
        )}

        {est?.vacio && (
          <section id="resumen" className="tarjeta">
            <span className="ceja">Esperando al sensor</span>
            <p className="frase" style={{ marginTop: 8 }}>
              Todavía no llegaron lecturas. En cuanto la placa mida, van a aparecer acá solas.
            </p>
          </section>
        )}

        {d && (
          <>
            <Resumen d={d} ahora={ahora} />
            <Pronostico d={d} ahora={ahora} />
          </>
        )}

        <Historial
          lecturas={lecturas}
          riegos={d?.riegos ?? []}
          rango={rango}
          onRango={setRango}
          ahora={ahora}
          cargando={cargando}
        />

        {d && <Riegos d={d} ahora={ahora} />}

        {children}

        <p className="pie">TP final IoT · INCADE 2026</p>
      </main>

      <Navegacion listo={!!d} />
    </>
  );
}
