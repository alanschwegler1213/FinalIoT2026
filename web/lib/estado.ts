import { supabase } from "@/lib/supabase";
import { detectarRiegos, estado, porcentaje, proximoRiego, tendencia, type Lectura } from "@/lib/humedad";

function duracion(ms: number) {
  const h = Math.round(Math.abs(ms) / 3600_000);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} d`;
}

/** Puntos que cambió la humedad respecto de la lectura de hace ~1 h (null si no hay). */
function cambioUltimaHora(data: Lectura[]) {
  const ultima = data.at(-1)!;
  const t = new Date(ultima.medido_en).getTime();
  const previa = data.findLast((l) => {
    const dt = t - new Date(l.medido_en).getTime();
    return dt >= 55 * 60_000 && dt <= 2 * 3600_000;
  });
  return previa ? porcentaje(ultima.crudo) - porcentaje(previa.crudo) : null;
}

/** Estado de la planta calculado sobre los últimos 7 días. Lanza si falla la base. */
export async function calcularEstado() {
  const desde = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("lecturas")
    .select("crudo,medido_en")
    .gte("medido_en", desde)
    .order("medido_en")
    .limit(5000);
  if (error) throw error;
  if (data.length === 0) return { vacio: true as const };

  const ultima = data.at(-1)!;
  const riegos = detectarRiegos(data);
  const ultimoRiego = riegos.at(-1)?.en ?? null;
  const proximo = proximoRiego(data, ultimoRiego ?? undefined);
  const pct = porcentaje(ultima.crudo);
  // Velocidad de secado desde el último riego; pide al menos 6 h de datos para no inventar.
  const pendiente = tendencia(data, ultimoRiego ?? undefined, 7 * 24, 6);
  return {
    pct,
    estado: estado(pct),
    medido_en: ultima.medido_en,
    ultimoRiego,
    proximoRiego: proximo,
    riegos: [...riegos].reverse(),
    secadoPorDia: pendiente !== null && pendiente < 0 ? Math.round(-pendiente * 24 * 10) / 10 : null,
    cambioUltimaHora: cambioUltimaHora(data),
    // Textos cortos listos para la pantalla OLED de la placa.
    pantalla: {
      ultimo: ultimoRiego ? `hace ${duracion(Date.now() - new Date(ultimoRiego).getTime())}` : "--",
      proximo:
        proximo === "ya" ? "ahora" : proximo ? `en ${duracion(new Date(proximo).getTime() - Date.now())}` : "--",
    },
  };
}

export type EstadoPlanta = Awaited<ReturnType<typeof calcularEstado>>;
