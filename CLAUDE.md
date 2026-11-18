# Monitor de humedad de albahaca (TP final IoT)

El README.md es la especificación del proyecto; estado.md dice qué está hecho y qué falta. Leer ambos al empezar.

## Stack
- `firmware/`: ESP32-C3 SuperMini, Arduino C++, compilado con arduino-cli.
- `web/`: Next.js (versión nueva con breaking changes: leer `web/node_modules/next/dist/docs/` antes de usar APIs de Next) en Vercel.
- Base de datos: proyecto Supabase `planta-monitor` (id `ajrrutsqblkilnifnnxq`, São Paulo, organización INCAJOB).

## Reglas
- **No tocar los otros proyectos Supabase de la cuenta** (INCAJOB e Incajob CLON). Solo `planta-monitor`.
- Es un proyecto de examen: Claude puede manejar credenciales y tokens del proyecto. Los secretos van en `web/.env.local` y `firmware/secrets.h`, ambos fuera de git.
- Se guarda el valor `crudo` del sensor; el porcentaje se calcula al mostrar (`web/lib/humedad.ts`, calibración SECO/MOJADO).
- **Commits, pushes y merges sin coautor de Claude**: nada de `Co-Authored-By` ni líneas de atribución.
- El diseño visual de la web es provisorio y se rehará más adelante: priorizar funcionalidad.
- Migraciones SQL numeradas en `web/supabase/migrations/`; aplicarlas con la herramienta de Supabase y dejar el archivo en el repo.
- Datos de prueba: usar `dispositivo = 'prueba'` y borrarlos al terminar.

## Comandos (desde `web/`)
- `npx next dev -p 3100`: servidor local.
- `npx tsc --noEmit && npx eslint app lib && npx next build`: verificación antes de commitear.
