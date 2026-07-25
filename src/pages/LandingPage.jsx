import React from 'react';
import { Volume2, Activity, Database, ShieldAlert, Cpu } from 'lucide-react';

export default function LandingPage({ onNavigate, isAuthenticated }) {
  return (
    <div className="landing-container animate-fade-in-up">
      <section className="landing-hero">
        <span className="landing-tagline">Prototipo IoT de Contaminación Sonora</span>
        <h1 className="landing-title">Monitoreo Acústico Inteligente en Tiempo Real</h1>
        <p className="landing-description">
          Detecta, analiza y previene la contaminación acústica. Nuestro sistema captura lecturas
          de ruido ambiental mediante microcontroladores ESP32 y procesa los datos en tiempo real
          para resguardar tu salud auditiva.
        </p>

        {/* Visualizador de Onda Dinámico (CSS) */}
        <div className="landing-waves glass-card">
          <div className="soundwave-container">
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
            <div className="soundwave-bar"></div>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '10px' }}>
            Nivel actual de ruido simulado: fluctuando...
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            className="btn-primary" 
            onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'login')}
          >
            <Activity size={18} />
            {isAuthenticated ? 'Ir al Dashboard' : 'Acceder con Google'}
          </button>
          <button 
            className="btn-secondary"
            onClick={() => {
              const element = document.getElementById('features');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Conocer más
          </button>
        </div>
      </section>

      {/* Características del Proyecto */}
      <section id="features" className="features-grid">
        <div className="feature-card glass-card">
          <div className="feature-icon-container">
            <Cpu size={24} />
          </div>
          <h3 className="feature-title">Hardware ESP32</h3>
          <p className="feature-desc">
            Captura de sonido continuo mediante sensores analógicos con un microcontrolador ESP32 de bajo costo y alta fidelidad de transmisión WiFi.
          </p>
        </div>

        <div className="feature-card glass-card">
          <div className="feature-icon-container">
            <Volume2 size={24} />
          </div>
          <h3 className="feature-title">Procesamiento dB</h3>
          <p className="feature-desc">
            Conversión de datos analógicos a decibelios (dB) con calibración logarítmica en la nube utilizando Firebase Cloud Functions.
          </p>
        </div>

        <div className="feature-card glass-card">
          <div className="feature-icon-container">
            <ShieldAlert size={24} />
          </div>
          <h3 className="feature-title">Alertas de Exceso</h3>
          <p className="feature-desc">
            Clasificación automática del nivel de ruido según los estándares de salud auditiva (Normal, Advertencia, Peligro).
          </p>
        </div>

        <div className="feature-card glass-card">
          <div className="feature-icon-container">
            <Database size={24} />
          </div>
          <h3 className="feature-title">Historial Persistente</h3>
          <p className="feature-desc">
            Almacenamiento y sincronización en tiempo real con Cloud Firestore. Consulta los registros históricos en cualquier dispositivo.
          </p>
        </div>
      </section>
    </div>
  );
}
