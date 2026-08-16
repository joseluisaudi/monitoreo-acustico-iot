/**
 * PROYECTO IoT: Monitoreo de Contaminación Sonora (AcousticIoT)
 * Archivo: esp32-sound-sensor.ino
 */

#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

// ==================== CONFIGURACIÓN DE RED WIFI ====================
const char *ssid = "Nettplus_Astudillo Romero";
const char *password = "19_03_1953";

// ==================== CONFIGURACIÓN DE ENDPOINT ====================
const char *cloudFunctionUrl =
    "https://us-central1-dashboard-iot-antigravity302.cloudfunctions.net/"
    "postSoundData";

// ==================== CONFIGURACIÓN DE HARDWARE ====================
const int sensorPin = 34; // Pin analógico ADC GPIO34
const char *deviceId = "esp32_01";

// Intervalo de envío de datos a Firebase (milisegundos) - Cada 5 segundos
const unsigned long sendInterval = 5000;
unsigned long lastSendTime = 0;

/**
 * Función exacta para calcular los decibelios en el ESP32 mediante mapeo lineal.
 * Muestrea durante 100 ms en el GPIO34 y aplica umbral de silencio a <= 40 Vpp.
 */
float calcularDecibelios() {
  unsigned long startMillis = millis();
  unsigned int signalMax = 0;
  unsigned int signalMin = 4095;

  // Ventana de muestreo limpia de 100 ms
  while (millis() - startMillis < 100) {
    int sample = analogRead(sensorPin); // GPIO34
    if (sample < 4095) {
      if (sample > signalMax) signalMax = sample;
      if (sample < signalMin) signalMin = sample;
    }
  }

  int peakToPeak = signalMax - signalMin;

  // UMBRAL DE SILENCIO (RUIDO ELÉCTRICO)
  // Si el pico a pico es menor o igual a 40 puntos digitales, ES SILENCIO.
  if (peakToPeak <= 40) {
    return 30.0; // Retorna 30 dB fijos para silencio absoluto
  }

  // MAPEO LINEAL PARA SONIDO REAL
  // Mapea lecturas de peakToPeak de 41 a 2000 hacia el rango de 31 dB a 90 dB
  float db = 30.0 + ((float)(peakToPeak - 40) * (60.0 / 1960.0));

  if (db > 95.0) db = 95.0; // Límite máximo de seguridad

  return db;
}

void setup() {
  Serial.begin(115200);
  pinMode(sensorPin, INPUT);

  // Conectar a la red WiFi
  Serial.println();
  Serial.print("Conectando a red WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("¡WiFi Conectado!");
  Serial.print("Dirección IP asignada: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentMillis = millis();

  // Enviar datos cada intervalo programado (5 segundos)
  if (currentMillis - lastSendTime >= sendInterval) {
    lastSendTime = currentMillis;

    if (WiFi.status() == WL_CONNECTED) {

      // 1. CAPTURA Y CÁLCULO DIRECTO DE DECIBELIOS (dB)
      float decibelios = calcularDecibelios();

      Serial.print("Decibelios calculados (dB): ");
      Serial.println(decibelios, 1);

      // 2. Preparar el cliente HTTPS seguro
      WiFiClientSecure client;
      client.setInsecure();

      HTTPClient http;
      http.begin(client, cloudFunctionUrl);
      http.addHeader("Content-Type", "application/json");

      // 3. Crear el payload JSON con decibelios calculados directamente
      String jsonPayload = "{\"deviceId\":\"" + String(deviceId) +
                           "\",\"decibels\":" + String(decibelios, 1) +
                           ",\"rawReading\":" + String(decibelios, 1) + "}";

      Serial.print("Enviando POST payload: ");
      Serial.println(jsonPayload);

      // 4. Realizar la petición POST HTTP
      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("Respuesta HTTP del Servidor [");
        Serial.print(httpResponseCode);
        Serial.print("]: ");
        Serial.println(response);
      } else {
        Serial.print("Error al realizar POST. Código de error: ");
        Serial.println(http.errorToString(httpResponseCode).c_str());
      }

      // 5. Cerrar la conexión
      http.end();
    } else {
      Serial.println("Error: Conexión WiFi perdida. Reintentando...");
    }
  }
}



