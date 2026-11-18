# Estado del proyecto

Última actualización: 2026-11-18 (firmware compilado)

## Hecho
- Repo `alanschwegler1213/FinalIoT2026` vinculado a esta carpeta.
- Supabase `planta-monitor` creado (São Paulo). Tabla `lecturas` con RLS, índice único (dispositivo, medido_en), política de lectura anon y Realtime (migraciones 001 y 002).
- Backend en `web/`: `POST /api/lecturas` (token Bearer, validación, duplicados ignorados), `GET /api/lecturas?horas=`, `GET /api/estado` (porcentaje, último riego, próximo riego).
- Web en `web/app/Panel.tsx`: estado actual, gráfico 6 h/24 h/7 d/30 d, riegos detectados, ficha de la albahaca, actualización por Realtime. Manifest, ícono SVG y service worker mínimo (instalable).
- `POST /api/lecturas` responde con textos para la OLED (`pantalla.ultimo`/`proximo`); el cálculo vive en `web/lib/estado.ts`.
- Firmware `firmware/humedad_wifi/` escrito y **compilado** (esp32 3.3.12, FQBN `esp32:esp32:esp32c3:CDCOnBoot=cdc`): mediana de 9 muestras, buffer en RTC_NOINIT (200 lecturas), NTP, HTTPS con raíces ISRG X1 y GTS R1, watchdog 120 s, reinicio tras 1 h sin enviar, OLED con 3 vistas, apagado 22-06, botón BOOT. Serial: enviar `c` imprime el crudo. NO probado en la placa.
- arduino-cli 1.6.0 instalado (`C:\Program Files\Arduino CLI`); puertos COM3 y COM4.
- Probado en local con datos simulados (API con curl, Realtime en el navegador). Datos de prueba borrados.
- Incajob CLON está **pausado** para liberar cupo gratis (reactivar solo si hay cupo).

## Pendiente
- [ ] Commit y push (nada commiteado todavía).
- [ ] Armar el circuito (sensor AOUT a GPIO3, OLED SDA GPIO6 / SCL GPIO7), copiar `secrets.h.example` a `secrets.h`, cargar el firmware y probar.
- [ ] Desplegar en Vercel ANTES de probar la placa (necesita HTTPS); poner la URL en `secrets.h`.
- [ ] Calibrar SECO/MOJADO con la maceta real y ajustar umbrales de la albahaca (`web/lib/humedad.ts`, valores provisorios 2800/1300, 30 %/45 %).
- [ ] Verificar que GPIO6/7 estén libres para la OLED en la placa.
- [ ] Probar PWA instalada en el celular.
- [ ] Rediseño visual de la web.
- [ ] Documentación en `docs/` (diagramas, calibración, pruebas).

## Decisiones abiertas
- Planta: albahaca (decidido).
- Skills y hooks: no hacen falta por ahora; reconsiderar si aparecen tareas repetitivas (por ejemplo compilar y cargar el firmware).
