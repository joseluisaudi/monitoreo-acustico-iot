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
 * Función de lectura de sonido con muestreo de memoria cero (Zero-Memory Sampling).
 * Reinicia completamente signalMax = 0 y signalMin = 4095 en cada llamada,
 * sin utilizar variables globales o estáticas acumulativas.
 */
int readSoundPeakToPeak() {
  unsigned long startMillis = millis();
  unsigned int signalMax = 0;
  unsigned int signalMin = 4095;

  // Ventana estricta de 100 ms en GPIO34
  while (millis() - startMillis < 100) {
    int sample = analogRead(sensorPin);
    if (sample < 4095) {
      if (sample > signalMax) signalMax = sample;
      if (sample < signalMin) signalMin = sample;
    }
  }

  int peakToPeak = signalMax - signalMin;

  // Umbral Duro de Silencio (Noise Floor Cutoff):
  // Si el peakToPeak es menor o igual a 30 puntos (ruido eléctrico base del ESP32),
  // asigna directamente 3 (que en la Cloud Function genera dB = 30.0)
  if (peakToPeak <= 30) {
    peakToPeak = 3;
  }

  return peakToPeak;
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

      // 1. CAPTURA DE AMPLITUD PICO A PICO (Zero-Memory Sampling)
      int rawReading = readSoundPeakToPeak();

      Serial.print("Amplitud Pico a Pico capturada (0-4095): ");
      Serial.println(rawReading);

      // 2. Preparar el cliente HTTPS seguro
      WiFiClientSecure client;
      client.setInsecure();

      HTTPClient http;
      http.begin(client, cloudFunctionUrl);
      http.addHeader("Content-Type", "application/json");

      // 3. Crear el payload JSON a enviar con el valor Pico a Pico
      String jsonPayload = "{\"deviceId\":\"" + String(deviceId) +
                           "\",\"rawReading\":" + String(rawReading) + "}";

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


