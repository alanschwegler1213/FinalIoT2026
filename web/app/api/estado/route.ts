import { calcularEstado } from "@/lib/estado";

export async function GET() {
  try {
    return Response.json(await calcularEstado());
  } catch (error) {
    console.error(error);
    return Response.json({ error: "servidor" }, { status: 500 });
  }
}
