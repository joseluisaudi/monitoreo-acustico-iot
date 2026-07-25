/**
 * PROYECTO IoT: Monitoreo de Contaminación Sonora (AcousticIoT)
 * Archivo: esp32-sound-sensor.ino
 * 
 * Descripción:
 * Código C++ para microcontroladores ESP32. Se conecta a una red WiFi y
 * lee periódicamente el canal analógico ADC del sensor de sonido para
 * enviar los datos brutos a la API HTTP expuesta por Firebase Cloud Functions.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ==================== CONFIGURACIÓN DE RED WIFI ====================
const char* ssid = "TU_SSID_WIFI";
const char* password = "TU_PASSWORD_WIFI";

// ==================== CONFIGURACIÓN DE ENDPOINT ====================
// Reemplaza esta URL con el endpoint HTTPS generado al desplegar tu Firebase Cloud Function
// Ejemplo: "https://postsounddata-xyz123abc-uc.a.run.app"
const char* cloudFunctionUrl = "https://TU_CLOUD_FUNCTION_URL_AQUI/postSoundData";

// ==================== CONFIGURACIÓN DE HARDWARE ====================
// El ESP32 tiene un ADC de 12 bits (rango de lectura analógica: 0 a 4095)
const int sensorPin = 34; // Pin analógico ADC donde está conectado el sensor de sonido (KY-037, MAX9814, etc.)
const char* deviceId = "esp32_01"; // Identificador de este dispositivo

// Intervalo de envío de datos (milisegundos) - Ejemplo: cada 10 segundos
const unsigned long sendInterval = 10000;
unsigned long lastSendTime = 0;

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

  // Enviar datos cada intervalo programado
  if (currentMillis - lastSendTime >= sendInterval) {
    lastSendTime = currentMillis;

    if (WiFi.status() == WL_CONNECTED) {
      // 1. Leer el promedio de la amplitud de sonido analógica para amortiguar picos
      long sum = 0;
      const int numSamples = 50;
      for (int i = 0; i < numSamples; i++) {
        sum += analogRead(sensorPin);
        delay(5); // Pequeña pausa entre muestras
      }
      int avgReading = sum / numSamples;
      
      Serial.print("Lectura analógica promedio (0-4095): ");
      Serial.println(avgReading);

      // 2. Preparar el cliente HTTPS seguro
      WiFiClientSecure client;
      client.setInsecure(); // Desactivar verificación estricta de SSL para simplificar el prototipo

      HTTPClient http;
      http.begin(client, cloudFunctionUrl);
      http.addHeader("Content-Type", "application/json");

      // 3. Crear el payload JSON a enviar
      // Formato: {"deviceId": "esp32_01", "rawReading": X}
      String jsonPayload = "{\"deviceId\":\"" + String(deviceId) + "\",\"rawReading\":" + String(avgReading) + "}";

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
