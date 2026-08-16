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

// Ventana de muestreo Pico a Pico en milisegundos (50 ms)
const unsigned long sampleWindow = 50;

// Intervalo de envío de datos a Firebase (milisegundos) - Cada 5 segundos
const unsigned long sendInterval = 5000;
unsigned long lastSendTime = 0;

/**
 * Función para medir la Amplitud Pico a Pico (Vpp) en el sensor de sonido.
 * Lee continuamente el GPIO34 durante 'sampleWindow' (50 ms) calculando
 * la diferencia entre el valor máximo (signalMax) y el mínimo (signalMin).
 * Se resta el piso de ruido base (noiseFloor = 220) para descontar el ruido
 * residual del ADC en silencio y entregar entre 30dB y 40dB en reposo.
 */
int readSoundPeakToPeak() {
  unsigned long startMillis = millis();
  int signalMax = 0;
  int signalMin = 4095;

  while (millis() - startMillis < sampleWindow) {
    int sample = analogRead(sensorPin);
    if (sample > signalMax) {
      signalMax = sample; // Almacena la onda más alta
    }
    if (sample < signalMin) {
      signalMin = sample; // Almacena la onda más baja
    }
  }

  int peakToPeak = signalMax - signalMin;

  // Piso de ruido ( noiseFloor ) de lectura en reposo/silencio (~220 ADC)
  const int noiseFloor = 220;
  peakToPeak = peakToPeak - noiseFloor;

  // Limitar el valor mínimo a 3 (que al aplicar 20*log10(3)+20 equivale a 29.5dB -> 30.0dB)
  // garantizando un rango dinámico de 30 dB a 100 dB en el dashboard.
  if (peakToPeak < 3) {
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

      // 1. CAPTURA DE AMPLITUD PICO A PICO (Vpp)
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

