# Estado del proyecto

Última actualización: 2026-11-18

## Hecho
- Repo `alanschwegler1213/FinalIoT2026` vinculado a esta carpeta.
- Supabase `planta-monitor` creado (São Paulo). Tabla `lecturas` con RLS, índice único (dispositivo, medido_en), política de lectura anon y Realtime (migraciones 001 y 002).
- Backend en `web/`: `POST /api/lecturas` (token Bearer, validación, duplicados ignorados), `GET /api/lecturas?horas=`, `GET /api/estado` (porcentaje, último riego, próximo riego).
- Web en `web/app/Panel.tsx`: estado actual, gráfico 6 h/24 h/7 d/30 d, riegos detectados, ficha de la albahaca, actualización por Realtime. Manifest, ícono SVG y service worker mínimo (instalable).
- Probado en local con datos simulados (API con curl, Realtime en el navegador). Datos de prueba borrados.
- Incajob CLON está **pausado** para liberar cupo gratis (reactivar solo si hay cupo).

## Pendiente
- [ ] Commit y push (nada commiteado todavía).
- [ ] Firmware ESP32-C3: lectura con mediana, NTP, HTTPS con certificados, buffer offline en RTC, watchdog, OLED con 3 vistas, apagado nocturno, botón BOOT.
- [ ] Instalar arduino-cli y el core esp32.
- [ ] Calibrar SECO/MOJADO con la maceta real y ajustar umbrales de la albahaca (`web/lib/humedad.ts`, valores provisorios 2800/1300, 30 %/45 %).
- [ ] Verificar que GPIO6/7 estén libres para la OLED en la placa.
- [ ] Desplegar en Vercel con las variables de `web/.env.example`.
- [ ] Probar PWA instalada en el celular.
- [ ] Rediseño visual de la web.
- [ ] Documentación en `docs/` (diagramas, calibración, pruebas).

## Decisiones abiertas
- Planta: albahaca (decidido).
- Skills y hooks: no hacen falta por ahora; reconsiderar si aparecen tareas repetitivas (por ejemplo compilar y cargar el firmware).
