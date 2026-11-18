import { timingSafeEqual } from "node:crypto";
import { supabase } from "@/lib/supabase";

const MAX_LOTE = 50;
const SIETE_DIAS = 7 * 24 * 3600;

function tokenValido(req: Request) {
  const esperado = Buffer.from(`Bearer ${process.env.DEVICE_TOKEN ?? ""}`);
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  return (
    process.env.DEVICE_TOKEN !== undefined &&
    esperado.length === recibido.length &&
    timingSafeEqual(esperado, recibido)
  );
}

export async function POST(req: Request) {
  if (!tokenValido(req)) return Response.json({ error: "token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const lecturas: unknown = body?.lecturas;
  const dispositivo: unknown = body?.dispositivo;
  if (
    typeof dispositivo !== "string" || !dispositivo || dispositivo.length > 50 ||
    !Array.isArray(lecturas) || lecturas.length === 0 || lecturas.length > MAX_LOTE
  ) {
    return Response.json({ error: "formato" }, { status: 400 });
  }

  const ahora = Date.now() / 1000;
  const filas = [];
  for (const l of lecturas) {
    const { crudo, medido_en } = l ?? {};
    if (
      !Number.isInteger(crudo) || crudo < 0 || crudo > 4095 ||
      !Number.isInteger(medido_en) || medido_en > ahora || medido_en < ahora - SIETE_DIAS
    ) {
      return Response.json({ error: "lectura invalida" }, { status: 400 });
    }
    filas.push({ dispositivo, crudo, medido_en: new Date(medido_en * 1000).toISOString() });
  }

  // Los duplicados (mismo dispositivo y hora) se ignoran: la placa reintenta lotes.
  const { error } = await supabase
    .from("lecturas")
    .upsert(filas, { onConflict: "dispositivo,medido_en", ignoreDuplicates: true });
  if (error) {
    console.error(error);
    return Response.json({ error: "servidor" }, { status: 500 });
  }
  return Response.json({ guardadas: filas.length }, { status: 201 });
}

export async function GET(req: Request) {
  const horas = Math.min(Number(new URL(req.url).searchParams.get("horas")) || 24, 720);
  const desde = new Date(Date.now() - horas * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("lecturas")
    .select("dispositivo,crudo,medido_en")
    .gte("medido_en", desde)
    .order("medido_en")
    .limit(5000);
  if (error) {
    console.error(error);
    return Response.json({ error: "servidor" }, { status: 500 });
  }
  return Response.json(data);
}
