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

  const { deviceId, decibels: bodyDecibels, rawReading } = req.body;

  // Validación de campos obligatorios
  if (!deviceId || (bodyDecibels === undefined && rawReading === undefined)) {
    return res.status(400).json({
      error: "Datos inválidos. Se requiere 'deviceId' y 'decibels' o 'rawReading'."
    });
  }

  // Extraer el valor de decibelios procesado por el ESP32 (sin recalcular log10 ni sumar offsets)
  let rawVal = bodyDecibels !== undefined ? bodyDecibels : rawReading;
  let decibels = parseFloat(rawVal);

  if (isNaN(decibels)) {
    return res.status(400).json({
      error: "El valor numérico de decibelios enviado es inválido."
    });
  }

  try {
    // 1. Asegurar redondeo a 1 decimal y límites de seguridad de 30.0 dB a 95.0 dB
    decibels = Math.round(decibels * 10) / 10;
    if (decibels < 30.0) decibels = 30.0;
    if (decibels > 95.0) decibels = 95.0;

    // 2. Clasificación del nivel de riesgo auditivo
    let status = "normal";
    if (decibels > 80) {
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
