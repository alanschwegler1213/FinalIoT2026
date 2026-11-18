import { supabase } from "@/lib/supabase";
import { detectarRiegos, estado, porcentaje, proximoRiego } from "@/lib/humedad";

function duracion(ms: number) {
  const h = Math.round(Math.abs(ms) / 3600_000);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} d`;
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
  const ultimoRiego = riegos.at(-1) ?? null;
  const proximo = proximoRiego(data, ultimoRiego ?? undefined);
  const pct = porcentaje(ultima.crudo);
  return {
    pct,
    estado: estado(pct),
    medido_en: ultima.medido_en,
    ultimoRiego,
    proximoRiego: proximo,
    riegos: [...riegos].reverse(),
    // Textos cortos listos para la pantalla OLED de la placa.
    pantalla: {
      ultimo: ultimoRiego ? `hace ${duracion(Date.now() - new Date(ultimoRiego).getTime())}` : "--",
      proximo:
        proximo === "ya" ? "ahora" : proximo ? `en ${duracion(new Date(proximo).getTime() - Date.now())}` : "--",
    },
  };
}
