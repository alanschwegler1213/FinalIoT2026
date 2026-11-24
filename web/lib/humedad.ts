// Calibración PROVISORIA del sensor: medir en aire (SECO) y en agua (MOJADO)
// con la maceta definitiva y reemplazar estos dos valores (también en el firmware).
export const SECO = 2800;
export const MOJADO = 1300;

// Albahaca: pide tierra siempre algo húmeda. Ajustar con la planta real.
export const UMBRAL_REGAR = 30; // % por debajo del cual "le toca agua"
export const UMBRAL_SECANDO = 45;
export const UMBRAL_EMPAPADA = 85; // por encima: recién regada
export const INTERVALO_MIN = 15; // cada cuánto mide la placa
const SALTO_RIEGO = 15; // puntos de humedad que sube entre lecturas al regar
const ENFRIAMIENTO_H = 3; // horas mínimas entre dos riegos detectados

export type Lectura = { crudo: number; medido_en: string };
export type Estado = "regar" | "secando" | "bien";
export type Riego = { en: string; antes: number; despues: number };

export const porcentaje = (crudo: number) =>
  Math.round(Math.min(100, Math.max(0, ((SECO - crudo) / (SECO - MOJADO)) * 100)));

export const estado = (pct: number): Estado =>
  pct < UMBRAL_REGAR ? "regar" : pct < UMBRAL_SECANDO ? "secando" : "bien";

const hs = (iso: string) => new Date(iso).getTime() / 3600_000;

/** Un riego es un salto brusco hacia arriba entre dos lecturas consecutivas. */
export function detectarRiegos(lecturas: Lectura[]): Riego[] {
  const riegos: Riego[] = [];
  for (let i = 1; i < lecturas.length; i++) {
    const antes = porcentaje(lecturas[i - 1].crudo);
    const despues = porcentaje(lecturas[i].crudo);
    const ultimo = riegos.at(-1);
    if (despues - antes >= SALTO_RIEGO && (!ultimo || hs(lecturas[i].medido_en) - hs(ultimo.en) >= ENFRIAMIENTO_H)) {
      riegos.push({ en: lecturas[i].medido_en, antes, despues });
    }
  }
  return riegos;
}

/**
 * Pendiente (% por hora) por regresión lineal de las lecturas posteriores a
 * `desde`, limitada a las últimas `ventanaH` horas. null si hay menos de 4
 * puntos o cubren menos de `minimoH` horas.
 */
export function tendencia(lecturas: Lectura[], desde?: string, ventanaH = 48, minimoH = 0) {
  if (lecturas.length === 0) return null;
  const fin = hs(lecturas.at(-1)!.medido_en);
  const inicio = Math.max(desde ? hs(desde) : 0, fin - ventanaH);
  const pts = lecturas.filter((l) => hs(l.medido_en) >= inicio).map((l) => [hs(l.medido_en), porcentaje(l.crudo)]);
  if (pts.length < 4 || fin - pts[0][0] < minimoH) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  if (sxx === 0) return null;
  return pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / sxx;
}

/**
 * Fecha estimada en que la humedad llega al umbral de riego, "ya" si ya pasó,
 * o null si no hay datos suficientes o la tierra no se está secando.
 */
export function proximoRiego(lecturas: Lectura[], ultimoRiego?: string): string | "ya" | null {
  if (lecturas.length === 0) return null;
  const actual = porcentaje(lecturas.at(-1)!.crudo);
  if (actual < UMBRAL_REGAR) return "ya";
  const pendiente = tendencia(lecturas, ultimoRiego);
  if (pendiente === null || pendiente >= -0.05) return null;
  const faltan = (actual - UMBRAL_REGAR) / -pendiente;
  // Se proyecta desde la última lectura: si el sensor se cortó, no corre el reloj.
  return new Date(new Date(lecturas.at(-1)!.medido_en).getTime() + faltan * 3600_000).toISOString();
}
