const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Inicializar SDK de Firebase Admin para interactuar con Firestore
initializeApp();
const db = getFirestore();

/**
 * Cloud Function HTTPS para recibir lecturas analógicas del ESP32,
 * calcular los decibelios (dB) correspondientes, clasificar el nivel de ruido,
 * y guardar el registro en Firestore.
 */
exports.postSoundData = onRequest({ cors: true }, async (req, res) => {
  // Solo permitir solicitudes HTTP POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Utilizar POST." });
  }

  const { deviceId, rawReading } = req.body;

  // Validación de campos obligatorios
  if (!deviceId || rawReading === undefined) {
    return res.status(400).json({
      error: "Datos inválidos. Se requiere 'deviceId' y 'rawReading' (0-4095)."
    });
  }

  // Parsear y asegurar el rango de la lectura analógica (ESP32 ADC es de 12 bits: 0-4095)
  const raw = parseInt(rawReading, 10);
  if (isNaN(raw) || raw < 0 || raw > 4095) {
    return res.status(400).json({
      error: "El valor de 'rawReading' debe ser un número entero entre 0 y 4095."
    });
  }

  try {
    // 1. Conversión matemática de lectura analógica a Decibelios (dB)
    // Mapeo logarítmico: 0 analógico -> 20 dB (silencio), 4095 analógico -> ~92.2 dB (ruido alto)
    let decibels = 20.0;
    if (raw > 0) {
      // Fórmula logarítmica: dB = 20 * log10(raw) + 20
      const dBValue = 20 * Math.log10(raw) + 20;
      decibels = Math.round(dBValue * 10) / 10; // Redondear a 1 decimal
    }

    // 2. Clasificación del nivel de riesgo auditivo
    let status = "normal";
    if (decibels > 75) {
      status = "danger"; // Ruido potencialmente dañino
    } else if (decibels > 55) {
      status = "warning"; // Ruido moderado/alto
    }

    // 3. Crear el documento del registro
    const newLog = {
      deviceId,
      rawReading: raw,
      decibels,
      status,
      timestamp: FieldValue.serverTimestamp() // Marca de tiempo del servidor
    };

    // 4. Guardar en la colección 'noise_logs' de Firestore
    const docRef = await db.collection("noise_logs").add(newLog);

    return res.status(201).json({
      message: "Registro almacenado con éxito",
      id: docRef.id,
      data: {
        deviceId,
        rawReading: raw,
        decibels,
        status
      }
    });

  } catch (error) {
    console.error("Error al guardar el registro en Firestore:", error);
    return res.status(500).json({ error: "Error interno del servidor al procesar los datos." });
  }
});
