# Estado del proyecto

Última actualización: 2026-11-18 (firmware probado en la placa; falta soldar)

## Hecho
- Repo `alanschwegler1213/FinalIoT2026` vinculado a esta carpeta; `main` tiene backend, web, firmware y docs.
- Supabase `planta-monitor` (São Paulo). Tabla `lecturas` con RLS, índice único (dispositivo, medido_en), política de lectura anon y Realtime (migraciones 001 y 002).
- Backend en `web/`: `POST /api/lecturas` (token Bearer, validación, duplicados ignorados, 5 min de tolerancia de reloj, responde textos para la OLED), `GET /api/lecturas?horas=`, `GET /api/estado`. Cálculo en `web/lib/estado.ts` y `web/lib/humedad.ts`.
- Web en `web/app/Panel.tsx`: estado actual, gráfico 6 h/24 h/7 d/30 d, riegos detectados, ficha de la albahaca, Realtime, PWA instalable. Diseño provisorio.
- **Desplegado en Vercel**: https://monitor-albahaca.vercel.app (proyecto `monitor-albahaca`; `vercel deploy --prod` desde `web/`; variables ya cargadas).
- Firmware `firmware/humedad_wifi/`: mediana de 9 muestras, buffer en RTC_NOINIT (200 lecturas), NTP, HTTPS (raíces ISRG X1 y GTS R1), watchdog 120 s, OLED con 3 vistas, apagado 22-06, botón BOOT. `secrets.h` completo en la PC (fuera de git).
- **Placa probada**: se conecta a WiFi (`ClaroFibra`, 2,4 GHz), sincroniza NTP y manda POST con 201 que llega a la web. Puerto COM6.
- arduino-cli 1.6.0 instalado (`C:\Program Files\Arduino CLI`). FQBN `esp32:esp32:esp32c3:CDCOnBoot=cdc`.
- Incajob CLON está **pausado** para liberar cupo gratis (reactivar solo si hay cupo).

## Bloqueo actual
- **Los pines de la placa no están soldados**. En la protoboard el pin 3 (señal del sensor) hace contacto intermitente: con el sensor quieto en el aire lee entre 760 y 2650. No se puede calibrar así. Se probó apretar e inclinar la placa sin éxito. **Hace falta soldar** las 2 tiras de 8 pines (soldador prestado, taller o facultad).
- Mientras tanto, desenchufar la placa: manda lecturas de ruido cada 15 min. Se borraron de la base el 2026-11-18.

## Pendiente
- [ ] Soldar los pines de la placa.
- [ ] Cablear sensor: G a GND, 3.3 a VCC, 3 a AOUT (guía: filas 4, 5 y 7 de la protoboard, columna h).
- [ ] Calibrar SECO/MOJADO con la maceta real (valores provisorios 2800/1300 en `web/lib/humedad.ts` Y en `firmware/humedad_wifi/humedad_wifi.ino`) y ajustar umbrales de la albahaca (30 %/45 %).
- [ ] Conectar la OLED (SDA GPIO6, SCL GPIO7) y verificar que esos pines estén libres.
- [ ] Probar PWA instalada en el celular.
- [ ] Rediseño visual de la web.
- [ ] Documentación en `docs/` (diagramas, calibración, pruebas).

## Notas
- Cargar el firmware con BOOT apretado deja la placa esperando: después hay que desenchufar y volver a enchufar el USB sin tocar BOOT.
- Mientras el botón BOOT esté apretado, el firmware no atiende el serial (espera a que se suelte).
- Skills y hooks: no hacen falta por ahora.
