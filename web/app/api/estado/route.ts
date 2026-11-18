import { supabase } from "@/lib/supabase";
import { detectarRiegos, estado, porcentaje, proximoRiego } from "@/lib/humedad";

export async function GET() {
  const desde = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("lecturas")
    .select("crudo,medido_en")
    .gte("medido_en", desde)
    .order("medido_en")
    .limit(5000);
  if (error) {
    console.error(error);
    return Response.json({ error: "servidor" }, { status: 500 });
  }
  if (data.length === 0) return Response.json({ vacio: true });

  const ultima = data.at(-1)!;
  const riegos = detectarRiegos(data);
  const pct = porcentaje(ultima.crudo);
  return Response.json({
    pct,
    estado: estado(pct),
    medido_en: ultima.medido_en,
    ultimoRiego: riegos.at(-1) ?? null,
    proximoRiego: proximoRiego(data, riegos.at(-1)),
    riegos: riegos.reverse(),
  });
}
