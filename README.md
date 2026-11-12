# Monitor de humedad de plantas (IoT)

Trabajo práctico final de **Internet de las Cosas (IoT)**.

Un sensor en la maceta mide la humedad de la tierra cada 15 minutos, la envía por WiFi a un backend en la nube, y una web instalable (PWA) muestra el estado actual, el historial y una estimación de cuándo toca regar. Una pantalla OLED junto a la planta muestra lo mismo sin necesidad de abrir la web.

> **Estado del proyecto:** en diseño. Este README describe la idea y las decisiones tomadas antes de empezar a armar el prototipo.

---

## 1. Idea y objetivo

Las plantas suelen morirse por exceso o por falta de riego, y mirar la tierra "a ojo" no es confiable. Este proyecto resuelve ese problema midiendo la humedad de forma continua y haciéndola visible desde cualquier lugar.

El sistema cubre el ciclo completo de una solución IoT:

1. **Percepción:** un sensor capacitivo de humedad de suelo.
2. **Procesamiento en el dispositivo:** un microcontrolador ESP32-C3 lee, filtra y almacena las mediciones.
3. **Comunicación:** envío por WiFi mediante HTTPS a un backend.
4. **Almacenamiento y lógica:** backend en la nube con base de datos y cálculo de riegos.
5. **Visualización:** aplicación web (PWA) y pantalla local OLED.

**Alcance:** solo monitoreo. El sistema **observa y avisa**, no riega por sí mismo.

## 2. Arquitectura

```
┌──────────────┐   analógico   ┌────────────────────┐
│ Sensor       │──────────────▶│ ESP32-C3 SuperMini │──── I2C ───▶ Pantalla OLED 0,96"
│ capacitivo   │               │  · lee y filtra    │
│ v1.2         │               │  · buffer offline  │
└──────────────┘               │  · hora por NTP    │
                               └─────────┬──────────┘
                                         │ HTTPS POST (cada 15 min, token Bearer)
                                         ▼
                               ┌────────────────────┐
                               │ Backend Next.js    │
                               │ (Vercel)           │
                               │  · valida token    │
                               │  · guarda lecturas │
                               │  · calcula último  │
                               │    y próximo riego │
                               └─────────┬──────────┘
                                         ▼
                               ┌────────────────────┐   Realtime   ┌─────────────────┐
                               │ Supabase (Postgres)│─────────────▶│ PWA instalable  │
                               └────────────────────┘              │ gráfico + estado│
                                                                   └─────────────────┘
```

## 3. Hardware

| Componente | Función |
|---|---|
| ESP32-C3 SuperMini | Microcontrolador con WiFi |
| Sensor capacitivo de humedad de suelo v1.2 | Genera una señal analógica según la humedad (no se corroe, a diferencia de los resistivos) |
| Pantalla OLED 0,96" (128×64, I2C) | Muestra el estado en el dispositivo |
| Botón BOOT (integrado en la placa) | Prende la pantalla y fuerza una lectura inmediata |

Asignación de pines prevista (a confirmar en las pruebas):

| Pin | Uso |
|---|---|
| GPIO3 | Sensor de humedad (entrada analógica, ADC1) |
| GPIO6 / GPIO7 | OLED (SDA / SCL) |
| GPIO9 | Botón BOOT |

## 4. Funcionamiento

### Dispositivo (firmware en C++, Arduino)

- Lee el sensor cada **15 minutos** y toma la **mediana de varias muestras** para reducir el ruido.
- Guarda el valor **crudo** (sin convertir a porcentaje) junto con la hora de medición, obtenida por **NTP**.
- Envía las lecturas por **HTTPS** al backend, con un token propio del dispositivo.
- **Buffer offline:** si no hay conexión, conserva las lecturas en memoria y las envía por lotes cuando vuelve el WiFi.
- Un **watchdog** reinicia la placa si el programa se cuelga.
- Valida el certificado del servidor (no se desactiva la verificación TLS).

### Pantalla OLED

Rota entre tres vistas cada **10 segundos**:

1. Carita de estado + porcentaje de humedad.
2. Último riego y próximo riego estimado.
3. Estado del WiFi y hora.

La carita cambia según el nivel de humedad (umbrales a ajustar según la planta):

| Estado | Rango (provisorio) |
|---|---|
| 🙂 Bien de agua | más de 35 % |
| 😐 Se está secando | 10 % a 35 % |
| 😢 Le toca agua | menos de 10 % |

**Cuidado de la pantalla (burn-in):** se **apaga automáticamente de 22:00 a 06:00** (hora de Argentina, UTC-3), usa brillo bajo y desplaza levemente el contenido. Si falla la sincronización de hora, queda prendida. El botón BOOT la enciende 30 segundos durante la noche y fuerza una lectura y envío.

### Backend (Next.js en Vercel)

- `POST /api/lecturas`: recibe un lote de lecturas, valida el token y el rango de los datos, y las guarda en Supabase. Ignora duplicados.
- Calcula el **último riego** (detectando un salto brusco de humedad) y estima el **próximo riego** a partir de la tendencia de secado.
- Responde a la placa con los datos para la pantalla.

### Base de datos (Supabase / PostgreSQL)

- Se almacena el valor **crudo**; el porcentaje se calcula al mostrarlo. Así, si se recalibra el sensor, todo el historial se recalcula sin perder datos.
- Tabla principal `lecturas`: `id`, `dispositivo`, `crudo` (0–4095), `creado_en`.
- Índice único por dispositivo y hora para evitar duplicados.
- **Row Level Security** activado.

### Web (PWA instalable)

- Humedad actual, estado y hora de la última lectura.
- Gráfico histórico con rangos de 6 h, 24 h, 7 días y 30 días.
- Último riego, próximo riego estimado y registro de riegos detectados.
- Ficha de la planta con consejos de cuidado.
- Actualización en tiempo real con **Supabase Realtime**: cuando llega una lectura nueva, la web se actualiza sola.
- Instalable en el celular como una aplicación.

## 5. Decisiones de diseño

| Tema | Decisión | Motivo |
|---|---|---|
| Alcance | Solo monitoreo | Mantener el proyecto acotado y robusto |
| Comunicación | HTTPS POST cada 15 min | La humedad del suelo cambia lentamente; no hace falta tiempo real estricto |
| Backend | Next.js en Vercel | Frontend y API en un mismo proyecto; el token nunca sale del servidor |
| Datos | Guardar el valor crudo | Permite recalibrar sin perder historial |
| Tiempo real | Supabase Realtime | La web se actualiza por empuje, sin consultas periódicas |
| Pantalla | Apagado nocturno automático | Evita el desgaste de la OLED sin necesidad de un canal de control desde la web |
| Cálculo de riegos | En el backend | Un único cálculo, consistente entre la web y la pantalla |

## 6. Seguridad

- El token del dispositivo **no se guarda en el repositorio**: vive en un archivo local de la placa (`secrets.h`, ignorado por git) y en una variable de entorno en Vercel.
- La conexión es **HTTPS con verificación de certificados**.
- El backend **valida los datos** recibidos (tipo y rango) antes de guardarlos.
- La base de datos usa **RLS** y un usuario con permisos mínimos.
- Ninguna clave ni credencial forma parte del código fuente.

## 7. Calibración del sensor

El sensor capacitivo entrega un valor distinto en aire (seco) y en agua (húmedo). Se miden ambos extremos y se convierte a porcentaje:

```
humedad % = (SECO − lectura) / (SECO − MOJADO) × 100   (limitado a 0–100)
```

Los valores `SECO` y `MOJADO` se obtienen experimentalmente con la maceta y la tierra definitivas, y los umbrales de riego se ajustan a la planta elegida.

## 8. Estructura prevista del repositorio

```
.
├── firmware/      # Código de la ESP32-C3 (Arduino / C++)
├── web/           # Backend y frontend (Next.js)
├── docs/          # Diagramas, calibración, pruebas
└── README.md
```

## 9. Tecnologías

C++ (Arduino) · ESP32-C3 · Next.js · Vercel · Supabase (PostgreSQL + Realtime) · PWA


---

*Planta de prueba: a definir.*
