"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { porcentaje, UMBRAL_REGAR } from "@/lib/humedad";

type Estado = {
  vacio?: boolean;
  pct: number;
  estado: "bien" | "secando" | "regar";
  medido_en: string;
  ultimoRiego: string | null;
  proximoRiego: string | "ya" | null;
  riegos: string[];
};
type Punto = { crudo: number; medido_en: string };

const RANGOS = { "6 h": 6, "24 h": 24, "7 d": 168, "30 d": 720 } as const;
const CARITA = { bien: "🙂 Bien de agua", secando: "😐 Se está secando", regar: "😢 Le toca agua" };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });

function Grafico({ puntos, horas, t1 }: { puntos: Punto[]; horas: number; t1: number }) {
  if (puntos.length < 2) return <p className="muted">Todavía no hay suficientes lecturas.</p>;
  const t0 = t1 - horas * 3600_000;
  const x = (iso: string) => ((new Date(iso).getTime() - t0) / (t1 - t0)) * 100;
  const y = (pct: number) => 100 - pct;
  const d = puntos.map((p, i) => `${i ? "L" : "M"}${x(p.medido_en).toFixed(2)},${y(porcentaje(p.crudo))}`).join("");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="grafico" role="img" aria-label={`Humedad de los últimos ${horas} horas`}>
      <line x1="0" x2="100" y1={y(UMBRAL_REGAR)} y2={y(UMBRAL_REGAR)} className="umbral" />
      <path d={d} className="linea" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Panel() {
  const [est, setEst] = useState<Estado | null>(null);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [rango, setRango] = useState<keyof typeof RANGOS>("24 h");
  const [error, setError] = useState(false);
  const [ahora, setAhora] = useState(0);

  const cargar = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([
        fetch("/api/estado").then((r) => r.json()),
        fetch(`/api/lecturas?horas=${RANGOS[rango]}`).then((r) => r.json()),
      ]);
      setEst(e);
      setAhora(Date.now());
      setPuntos(Array.isArray(p) ? p : []);
      setError(false);
    } catch {
      setError(true);
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
      .subscribe();
    return () => void sb.removeChannel(canal);
  }, [cargar]);

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
  }, []);

  return (
    <main>
      <h1>🌿 Albahaca</h1>
      {error && <p className="muted">No se pudo cargar. Reintentá en un momento.</p>}
      {est && !est.vacio && (
        <section className="tarjeta">
          <p className="pct">{est.pct}%</p>
          <p>{CARITA[est.estado]}</p>
          <p className="muted">Última lectura: {fmt(est.medido_en)}</p>
          <p>Último riego: {est.ultimoRiego ? fmt(est.ultimoRiego) : "sin detectar"}</p>
          <p>
            Próximo riego:{" "}
            {est.proximoRiego === "ya" ? "ahora" : est.proximoRiego ? `~ ${fmt(est.proximoRiego)}` : "calculando…"}
          </p>
        </section>
      )}
      {est?.vacio && <p className="muted">Todavía no llegaron lecturas del sensor.</p>}

      <section>
        <h2>Historial</h2>
        <div className="rangos">
          {(Object.keys(RANGOS) as (keyof typeof RANGOS)[]).map((r) => (
            <button key={r} aria-pressed={r === rango} onClick={() => setRango(r)}>{r}</button>
          ))}
        </div>
        <Grafico puntos={puntos} horas={RANGOS[rango]} t1={ahora} />
      </section>

      <section>
        <h2>Riegos detectados</h2>
        {est && !est.vacio && est.riegos.length > 0 ? (
          <ul>{est.riegos.map((r) => <li key={r}>{fmt(r)}</li>)}</ul>
        ) : (
          <p className="muted">Ninguno en los últimos 7 días.</p>
        )}
      </section>

      <section>
        <h2>La planta</h2>
        <p>
          Albahaca (<i>Ocimum basilicum</i>). Pide sol directo (6 h o más), tierra siempre apenas húmeda pero
          con buen drenaje, y temperaturas de 18 a 30 °C. Se marchita rápido si se seca y se pudre si se
          encharca. Pellizcar las flores y las puntas la mantiene frondosa.
        </p>
      </section>
    </main>
  );
}
