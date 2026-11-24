"use client";

import { ChevronDown, ChartLine } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { porcentaje, UMBRAL_REGAR, type Lectura, type Riego } from "@/lib/humedad";
import { decimal, etiquetaEje, fechaHora } from "@/lib/formato";

export const RANGOS = [
  { id: "6h", nombre: "6 h", horas: 6 },
  { id: "24h", nombre: "24 h", horas: 24 },
  { id: "7d", nombre: "7 días", horas: 168 },
  { id: "30d", nombre: "30 días", horas: 720 },
] as const;
export type RangoId = (typeof RANGOS)[number]["id"];

// Colores fijos: el gráfico vive siempre sobre la tarjeta oscura.
const SERIE = "#4cbb76";
const REGAR = "#e0663f";
const RIEGO = "#4a8fe0";
const TINTA_3 = "#6e8a78";
const REJILLA = "rgba(200,255,220,0.07)";

type Props = {
  lecturas: Lectura[];
  riegos: Riego[];
  rango: RangoId;
  onRango: (r: RangoId) => void;
  ahora: number;
  cargando: boolean;
};

export default function Historial({ lecturas, riegos, rango, onRango, ahora, cargando }: Props) {
  const i = RANGOS.findIndex((r) => r.id === rango);
  const horas = RANGOS[i].horas;
  const desde = ahora - horas * 3600_000;
  const datos = lecturas.map((l) => ({ t: new Date(l.medido_en).getTime(), pct: porcentaje(l.crudo), crudo: l.crudo }));
  const ultimo = datos.at(-1);
  const valores = datos.map((d) => d.pct);
  const marcas = Array.from({ length: 5 }, (_, k) => desde + ((ahora - desde) * k) / 4);

  return (
    <section id="historial" className="tarjeta revelar" aria-labelledby="t-historial">
      <div className="cabecera-tarjeta">
        <h2 id="t-historial" className="tarjeta-titulo">
          <ChartLine size={20} aria-hidden /> Humedad de la tierra
        </h2>
        <div className="segmentado" role="group" aria-label="Rango de tiempo" style={{ "--n": RANGOS.length, "--i": i } as React.CSSProperties}>
          <span className="segmentado-fondo" aria-hidden />
          {RANGOS.map((r) => (
            <button key={r.id} type="button" aria-pressed={r.id === rango} onClick={() => onRango(r.id)}>
              {r.nombre}
            </button>
          ))}
        </div>
      </div>

      {datos.length < 2 ? (
        <div className="grafico-vacio">
          {cargando ? "Cargando lecturas…" : "No hay lecturas en este rango todavía."}
        </div>
      ) : (
        <div className="grafico" data-cargando={cargando}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datos} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="lavado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIE} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={SERIE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={REJILLA} />
              <ReferenceArea
                y1={0}
                y2={UMBRAL_REGAR}
                fill={REGAR}
                fillOpacity={0.08}
                ifOverflow="hidden"
                label={{ value: "le toca agua", position: "insideBottomLeft", fill: REGAR, fontSize: 11, opacity: 0.85 }}
              />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[desde, ahora]}
                ticks={marcas}
                tickFormatter={(t: number) => etiquetaEje(t, horas)}
                tick={{ fill: TINTA_3, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDataOverflow
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fill: TINTA_3, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              {riegos
                .filter((r) => new Date(r.en).getTime() >= desde)
                .map((r) => (
                  <ReferenceLine
                    key={r.en}
                    x={new Date(r.en).getTime()}
                    stroke={RIEGO}
                    strokeOpacity={0.7}
                    label={{ value: "riego", position: "insideTopRight", fill: RIEGO, fontSize: 11 }}
                  />
                ))}
              <Tooltip
                cursor={{ stroke: "rgba(236,245,238,0.35)", strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof datos)[number] | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="globo">
                      <b>{p.pct} %</b>
                      <span>{fechaHora(p.t)}</span>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="pct"
                stroke={SERIE}
                strokeWidth={2}
                fill="url(#lavado)"
                activeDot={{ r: 5, fill: SERIE, stroke: "#0e1c14", strokeWidth: 2 }}
                animationDuration={700}
              />
              {ultimo && <ReferenceDot x={ultimo.t} y={ultimo.pct} r={5} fill={SERIE} stroke="#0e1c14" strokeWidth={2} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {valores.length > 0 && (
        <div className="resumen-rango">
          <span>
            Promedio <b>{decimal(valores.reduce((a, b) => a + b, 0) / valores.length)} %</b>
          </span>
          <span>
            Mínimo <b>{Math.min(...valores)} %</b>
          </span>
          <span>
            Máximo <b>{Math.max(...valores)} %</b>
          </span>
          <span>
            Lecturas <b>{valores.length}</b>
          </span>
        </div>
      )}

      {datos.length > 0 && (
        <details className="tabla">
          <summary>
            <ChevronDown size={16} aria-hidden /> Ver las últimas lecturas en tabla
          </summary>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Humedad</th>
                  <th scope="col">Valor crudo</th>
                </tr>
              </thead>
              <tbody>
                {datos
                  .slice(-50)
                  .reverse()
                  .map((d) => (
                    <tr key={d.t}>
                      <td>{fechaHora(d.t)}</td>
                      <td>{d.pct} %</td>
                      <td>{d.crudo}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
