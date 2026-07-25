# Proyecto: Dashboard IoT - Monitoreo de Ruido & Sonido

**Última actualización:** 2026-07-15
**Tecnologías:** React (Vite) | Firebase (Auth, Firestore, Cloud Functions) | Vercel | ESP32

---

## 📊 Estado del Proyecto

| Componente | Estado | Detalle |
| :--- | :---: | :--- |
| **Documentación (`status.md`)** | 🟢 Completado | Inicialización de bitácora de control |
| **Estructura Web (React/Vite)** | 🟢 Completado | Proyecto base inicializado y dependencias de UI/Firebase instaladas. |
| **Configuración Firebase** | 🟢 Completado | Configurado firebase.js y variables de entorno .env |
| **Cloud Functions Backend** | 🟢 Completado | Estructura local e index.js listos con la función postSoundData |
| **Landing Page** | 🟢 Completado | Presentación interactiva y animaciones CSS de ondas sonoras. |
| **Autenticación (Google Login)** | 🟢 Completado | Flujo con Firebase Auth integrado. |
| **Página de Historial de Variables** | 🟢 Completado | Tabla reactiva con Firestore y simulador ESP32 local. |
| **Dashboard Gráfico** | 🟢 Completado | Gráficos de series de tiempo interactivos en Recharts. |
| **Firmware ESP32** | 🟢 Completado | Código `.ino` listo para enviar POST JSON. |

*Leyenda: 🔴 Pendiente | 🟡 En Curso | 🟢 Completado*

---

## 📝 Bitácora de Cambios (Changelog)

- **2026-07-15**: Creación de la propuesta de arquitectura inicial y del plan de implementación en el artifact de Gemini.
- **2026-07-15**: Inicialización del archivo de control del estado del proyecto ([status.md](file:///d:/IOT/Proyecto/Dashboard-iot-antigravity302/status.md)).
- **2026-07-15**: Creación de la estructura base del frontend (React + Vite) usando `create-vite`.
- **2026-07-15**: Instalación exitosa de dependencias del frontend (`firebase`, `lucide-react`, `recharts`).
- **2026-07-15**: Configuración de `src/firebase.js` y variables de entorno `.env` para Firebase.
- **2026-07-15**: Creación de la Cloud Function `postSoundData` en `/functions` y las reglas de seguridad de Firestore.
- **2026-07-15**: Creación del diseño premium en Vanilla CSS (`index.css` y `App.css`) con animaciones de ondas de sonido.
- **2026-07-15**: Desarrollo de las páginas del frontend (`LandingPage.jsx`, `LoginPage.jsx`, `VariablesPage.jsx`, `DashboardPage.jsx`).
- **2026-07-15**: Creación del código firmware para ESP32 (`esp32-sound-sensor.ino`) para capturar y reportar ruido por HTTPS POST.

---

## 🎯 Próximos Pasos (Backlog)

1. [x] Instalar dependencias del frontend (`npm install`, `firebase`, `lucide-react`, `recharts`).
2. [x] Configurar el archivo de Firebase local (`firebase.js`).
3. [x] Crear los archivos del backend en una carpeta `/functions` para las Cloud Functions de Firebase.
4. [x] Desarrollar la Landing Page y componentes de la interfaz.
5. [x] Desarrollar el firmware de prueba para el ESP32.
6. [ ] Configurar despliegue de Vercel y Firebase en producción.
