// Calibración PROVISORIA del sensor: medir en aire (SECO) y en agua (MOJADO)
// con la maceta definitiva y reemplazar estos dos valores.
export const SECO = 2800;
export const MOJADO = 1300;

// Albahaca: pide tierra siempre algo húmeda. Ajustar con la planta real.
export const UMBRAL_REGAR = 30; // % por debajo del cual "le toca agua"
export const UMBRAL_SECANDO = 45;
const SALTO_RIEGO = 15; // puntos de humedad que sube entre lecturas al regar
const ENFRIAMIENTO_H = 3; // horas mínimas entre dos riegos detectados

export type Lectura = { crudo: number; medido_en: string };

export const porcentaje = (crudo: number) =>
  Math.round(Math.min(100, Math.max(0, ((SECO - crudo) / (SECO - MOJADO)) * 100)));

export const estado = (pct: number) =>
  pct < UMBRAL_REGAR ? "regar" : pct < UMBRAL_SECANDO ? "secando" : "bien";

const hs = (iso: string) => new Date(iso).getTime() / 3600_000;

/** Un riego es un salto brusco hacia arriba entre dos lecturas consecutivas. */
export function detectarRiegos(lecturas: Lectura[]): string[] {
  const riegos: string[] = [];
  for (let i = 1; i < lecturas.length; i++) {
    const salto = porcentaje(lecturas[i].crudo) - porcentaje(lecturas[i - 1].crudo);
    const ultimo = riegos.at(-1);
    if (salto >= SALTO_RIEGO && (!ultimo || hs(lecturas[i].medido_en) - hs(ultimo) >= ENFRIAMIENTO_H)) {
      riegos.push(lecturas[i].medido_en);
    }
  }
  return riegos;
}

/**
 * Regresión lineal de las lecturas posteriores al último riego (máx. 48 h).
 * Devuelve la fecha estimada en que la humedad llega al umbral, "ya" si ya
 * pasó, o null si no hay datos suficientes o la tierra no se está secando.
 */
export function proximoRiego(lecturas: Lectura[], ultimoRiego?: string): string | "ya" | null {
  if (lecturas.length === 0) return null;
  const ahora = lecturas.at(-1)!;
  if (porcentaje(ahora.crudo) < UMBRAL_REGAR) return "ya";
  const desde = Math.max(ultimoRiego ? hs(ultimoRiego) : 0, hs(ahora.medido_en) - 48);
  const pts = lecturas
    .filter((l) => hs(l.medido_en) >= desde)
    .map((l) => [hs(l.medido_en), porcentaje(l.crudo)]);
  if (pts.length < 4) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  if (sxx === 0) return null;
  const pendiente = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / sxx; // % por hora
  if (pendiente >= -0.05) return null;
  const faltan = (porcentaje(ahora.crudo) - UMBRAL_REGAR) / -pendiente;
  return new Date(Date.now() + faltan * 3600_000).toISOString();
}
