// Formatos de fecha y tiempo en español de Argentina, siempre en hora de Buenos Aires.
const TZ = "America/Argentina/Buenos_Aires";
const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const ms = (iso: string) => new Date(iso).getTime();

/** "hace 5 min", "hace 3 h", "hace 2 días". */
export function hace(iso: string, ahora: number) {
  const d = Math.max(0, ahora - ms(iso));
  if (d < MIN) return "recién";
  if (d < HORA) return `hace ${Math.floor(d / MIN)} min`;
  if (d < DIA) return `hace ${Math.floor(d / HORA)} h`;
  const dias = Math.floor(d / DIA);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

/** "Hace 7 días" con mayúscula, para títulos de tarjetas. */
export const haceTitulo = (iso: string, ahora: number) => {
  const t = hace(iso, ahora);
  return t[0].toUpperCase() + t.slice(1);
};

/** "En ~5 días", "En ~8 h", "En menos de 1 h". */
export function enCuanto(iso: string, ahora: number) {
  const d = ms(iso) - ahora;
  if (d < 0) return "Ya mismo"; // la estimación quedó atrás (p. ej. sensor sin datos)
  if (d < HORA) return "En menos de 1 h";
  if (d < 2 * DIA) return `En ~${Math.round(d / HORA)} h`;
  return `En ~${Math.round(d / DIA)} días`;
}

/** "~5 días" o "~8 h", para frases. */
export function plazo(iso: string, ahora: number) {
  return ms(iso) < ahora ? "cualquier momento" : enCuanto(iso, ahora).replace(/^En /, "");
}

/** "dom 22/11". */
export function fechaCorta(iso: string) {
  const f = new Date(iso);
  const dia = f.toLocaleDateString("es-AR", { timeZone: TZ, weekday: "short" }).replace(".", "");
  const dm = f.toLocaleDateString("es-AR", { timeZone: TZ, day: "numeric", month: "numeric" });
  return `${dia} ${dm}`;
}

/** "Miércoles, 11 de noviembre, 12:50". */
export function fechaLarga(iso: string) {
  const t = new Date(iso).toLocaleString("es-AR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return t[0].toUpperCase() + t.slice(1);
}

/** "14:05" para ejes de 24 h o menos; "22/11" para rangos largos. */
export function etiquetaEje(t: number, horas: number) {
  return horas <= 24
    ? new Date(t).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false })
    : new Date(t).toLocaleDateString("es-AR", { timeZone: TZ, day: "numeric", month: "numeric" });
}

/** "mié 18/11, 14:05" para el tooltip y la tabla. */
export function fechaHora(t: number) {
  const f = new Date(t);
  const hora = f.toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fechaCorta(f.toISOString())}, ${hora}`;
}

/** 9.9 -> "9,9". */
export const decimal = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
