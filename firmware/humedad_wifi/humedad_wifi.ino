// Monitor de humedad de albahaca - ESP32-C3 SuperMini
// Lee el sensor capacitivo, guarda el valor crudo con su hora, lo envía por HTTPS
// al backend y muestra el estado en una OLED SSD1306.
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <esp_task_wdt.h>
#include <time.h>
#include "secrets.h"
#include "certs.h"

// ---- Pines (a confirmar en la placa) ----
constexpr uint8_t PIN_SENSOR = 3;  // ADC1
constexpr uint8_t PIN_SDA = 6;
constexpr uint8_t PIN_SCL = 7;
constexpr uint8_t PIN_BOTON = 9;   // BOOT, activo en bajo

// ---- Calibración: MISMOS valores que web/lib/humedad.ts ----
constexpr int SECO = 2800;
constexpr int MOJADO = 1300;
constexpr int UMBRAL_REGAR = 30;
constexpr int UMBRAL_SECANDO = 45;

// ---- Tiempos y tamaños ----
constexpr uint32_t INTERVALO_MS = 15UL * 60 * 1000;
constexpr int MUESTRAS = 9;                      // se usa la mediana
constexpr int CAPACIDAD = 200;                   // lecturas pendientes (~2 días)
constexpr int LOTE = 30;                         // lecturas por POST
constexpr uint32_t WDT_MS = 120UL * 1000;
constexpr uint32_t SIN_ENVIO_REINICIO_MS = 3600UL * 1000;
constexpr uint32_t VISTA_MS = 10UL * 1000;
constexpr uint32_t DESPIERTO_MS = 30UL * 1000;   // botón: pantalla encendida
constexpr int HORA_APAGAR = 22, HORA_PRENDER = 6;
constexpr uint32_t MAGIC = 0xA1BA4ACA;

struct Lectura { uint32_t t; uint16_t crudo; };

// RTC_NOINIT sobrevive a reinicios por watchdog o software (no a cortes de luz).
RTC_NOINIT_ATTR uint32_t rtcMagic;
RTC_NOINIT_ATTR uint16_t cuenta;
RTC_NOINIT_ATTR Lectura buf[CAPACIDAD];

Adafruit_SSD1306 oled(128, 64, &Wire, -1);
int ultimoCrudo = -1;
bool wifiOk = false;
String txtUltimo = "--", txtProximo = "--";
uint32_t ultimoEnvioOk = 0, proximoCiclo = 0, despiertoHasta = 0;

// ---------- Sensor ----------
int medir() {
  int m[MUESTRAS];
  for (int i = 0; i < MUESTRAS; i++) { m[i] = analogRead(PIN_SENSOR); delay(10); }
  for (int i = 1; i < MUESTRAS; i++)  // ordenamiento por inserción
    for (int j = i; j > 0 && m[j - 1] > m[j]; j--) { int t = m[j]; m[j] = m[j - 1]; m[j - 1] = t; }
  return m[MUESTRAS / 2];
}

int porcentaje(int crudo) { return constrain((SECO - crudo) * 100 / (SECO - MOJADO), 0, 100); }

// ---------- Buffer ----------
void guardar(uint32_t t, uint16_t crudo) {
  if (cuenta == CAPACIDAD) { memmove(buf, buf + 1, (CAPACIDAD - 1) * sizeof(Lectura)); cuenta--; }
  buf[cuenta++] = {t, crudo};
}

void quitar(int n) { memmove(buf, buf + n, (cuenta - n) * sizeof(Lectura)); cuenta -= n; }

// ---------- Red ----------
bool horaValida() { return time(nullptr) > 1700000000; }

bool conectar() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) { delay(500); esp_task_wdt_reset(); }
  wifiOk = WiFi.status() == WL_CONNECTED;
  if (!wifiOk) return false;
  // Hora de Argentina (UTC-3); los timestamps que se envían son UTC igualmente.
  configTzTime("<-03>3", "pool.ntp.org", "time.google.com");
  for (int i = 0; i < 20 && !horaValida(); i++) { delay(500); esp_task_wdt_reset(); }
  return horaValida();
}

String campo(const String& cuerpo, const char* clave) {
  String k = String("\"") + clave + "\":\"";
  int i = cuerpo.indexOf(k);
  if (i < 0) return "--";
  i += k.length();
  int j = cuerpo.indexOf('"', i);
  return j < 0 ? "--" : cuerpo.substring(i, j);
}

// Envía todo lo pendiente por lotes. Solo borra lo que el servidor confirmó con 201.
void enviar() {
  WiFiClientSecure cliente;
  cliente.setCACert(ROOT_CAS);
  while (cuenta > 0) {
    esp_task_wdt_reset();
    int n = min<int>(LOTE, cuenta);
    String body = String("{\"dispositivo\":\"") + DISPOSITIVO + "\",\"lecturas\":[";
    for (int i = 0; i < n; i++) {
      if (i) body += ",";
      body += String("{\"crudo\":") + buf[i].crudo + ",\"medido_en\":" + buf[i].t + "}";
    }
    body += "]}";

    HTTPClient http;
    http.setTimeout(10000);
    if (!http.begin(cliente, API_URL)) break;
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
    int codigo = http.POST(body);
    String resp = codigo > 0 ? http.getString() : "";
    http.end();
    Serial.printf("POST %d (%d lecturas)\n", codigo, n);
    if (codigo != 201) break;
    quitar(n);
    ultimoEnvioOk = millis();
    txtUltimo = campo(resp, "ultimo");
    txtProximo = campo(resp, "proximo");
  }
}

// Un ciclo completo: conectar, medir, guardar, enviar, desconectar.
void ciclo() {
  bool hora = conectar();
  int crudo = medir();
  ultimoCrudo = crudo;
  Serial.printf("crudo=%d pct=%d hora=%s\n", crudo, porcentaje(crudo), hora ? "ok" : "sin NTP");
  if (hora) guardar(time(nullptr), crudo);  // sin hora fiable no se guarda un dato mal fechado
  if (wifiOk) enviar();
  WiFi.disconnect(true, false);
  proximoCiclo = millis() + INTERVALO_MS;
}

// ---------- Pantalla ----------
bool esDeNoche() {
  struct tm tm;
  if (!horaValida() || !getLocalTime(&tm, 0)) return false;  // sin hora: queda prendida
  return tm.tm_hour >= HORA_APAGAR || tm.tm_hour < HORA_PRENDER;
}

void carita(int cx, int cy, int pct) {
  oled.drawCircle(cx, cy, 20, SSD1306_WHITE);
  oled.fillCircle(cx - 7, cy - 6, 2, SSD1306_WHITE);
  oled.fillCircle(cx + 7, cy - 6, 2, SSD1306_WHITE);
  if (pct >= UMBRAL_SECANDO) oled.drawCircleHelper(cx, cy + 3, 9, 0x4 | 0x8, SSD1306_WHITE);        // sonrisa
  else if (pct >= UMBRAL_REGAR) oled.drawFastHLine(cx - 8, cy + 10, 16, SSD1306_WHITE);            // neutra
  else oled.drawCircleHelper(cx, cy + 13, 9, 0x1 | 0x2, SSD1306_WHITE);                            // triste
}

void dibujar(int dx, int dy) {
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  int vista = (millis() / VISTA_MS) % 3;
  if (vista == 0) {
    if (ultimoCrudo < 0) { oled.setTextSize(2); oled.setCursor(10 + dx, 24 + dy); oled.print("Midiendo.."); }
    else {
      int pct = porcentaje(ultimoCrudo);
      carita(30 + dx, 32 + dy, pct);
      oled.setTextSize(3); oled.setCursor(62 + dx, 20 + dy); oled.printf("%d%%", pct);
    }
  } else if (vista == 1) {
    oled.setTextSize(1); oled.setCursor(4 + dx, 4 + dy); oled.print("Ultimo riego");
    oled.setTextSize(2); oled.setCursor(4 + dx, 16 + dy); oled.print(txtUltimo);
    oled.setTextSize(1); oled.setCursor(4 + dx, 38 + dy); oled.print("Proximo riego");
    oled.setTextSize(2); oled.setCursor(4 + dx, 50 + dy - 4); oled.print(txtProximo);
  } else {
    struct tm tm;
    oled.setTextSize(1); oled.setCursor(4 + dx, 4 + dy);
    oled.printf("WiFi: %s", wifiOk ? "OK" : "sin conexion");
    oled.setCursor(4 + dx, 20 + dy); oled.printf("Pendientes: %d", cuenta);
    oled.setTextSize(2); oled.setCursor(4 + dx, 38 + dy);
    if (horaValida() && getLocalTime(&tm, 0)) oled.printf("%02d:%02d", tm.tm_hour, tm.tm_min);
    else oled.print("--:--");
  }
  oled.display();
}

// ---------- Programa ----------
void setup() {
  Serial.begin(115200);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SENSOR, ADC_11db);

  esp_task_wdt_config_t wdt = {.timeout_ms = WDT_MS, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_reconfigure(&wdt);
  esp_task_wdt_add(NULL);

  if (rtcMagic != MAGIC || cuenta > CAPACIDAD) { rtcMagic = MAGIC; cuenta = 0; }  // arranque en frío

  Wire.begin(PIN_SDA, PIN_SCL);
  if (oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) oled.dim(true);  // brillo bajo contra el burn-in
  else Serial.println("OLED no encontrada");

  ultimoEnvioOk = millis();
  despiertoHasta = millis() + DESPIERTO_MS;
  ciclo();
}

void loop() {
  esp_task_wdt_reset();

  if (Serial.available()) { while (Serial.available()) Serial.read(); Serial.printf("crudo=%d\n", medir()); }

  if (digitalRead(PIN_BOTON) == LOW) {  // BOOT: enciende la pantalla y fuerza una lectura y envío
    despiertoHasta = millis() + DESPIERTO_MS;
    proximoCiclo = 0;
    while (digitalRead(PIN_BOTON) == LOW) { delay(10); esp_task_wdt_reset(); }
  }

  if ((int32_t)(millis() - proximoCiclo) >= 0) ciclo();

  if (millis() - ultimoEnvioOk > SIN_ENVIO_REINICIO_MS) ESP.restart();  // las lecturas siguen en RTC

  bool encendida = !esDeNoche() || (int32_t)(despiertoHasta - millis()) > 0;
  static bool estabaEncendida = true;
  if (encendida != estabaEncendida) {
    oled.ssd1306_command(encendida ? SSD1306_DISPLAYON : SSD1306_DISPLAYOFF);
    estabaEncendida = encendida;
  }
  if (encendida) {
    int paso = (millis() / 600000UL) % 3 - 1;  // desplaza el contenido ±1 px cada 10 min
    dibujar(paso, paso);
  }
  delay(500);
}
