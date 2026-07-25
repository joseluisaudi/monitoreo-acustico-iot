import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Database, Plus, RefreshCw, Cpu, Volume2, Calendar, AlertTriangle } from 'lucide-react';

export default function VariablesPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [simRawValue, setSimRawValue] = useState(1500);
  const [simDeviceId, setSimDeviceId] = useState('esp32_01');
  const [simulating, setSimulating] = useState(false);

  // Intentar cargar datos en tiempo real de Firestore con fallback a mock
  useEffect(() => {
    let unsubscribe = () => {};

    try {
      // Si la API key está vacía o es la de prueba, usar mock directamente para evitar cuelgues
      if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key') {
        throw new Error("Credenciales de Firebase no configuradas. Usando modo simulación local.");
      }

      const q = query(collection(db, 'noise_logs'), orderBy('timestamp', 'desc'), limit(50));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            timestamp: docData.timestamp?.toDate() 
              ? docData.timestamp.toDate().toLocaleString() 
              : new Date().toLocaleString()
          };
        });
        setLogs(data);
        setLoading(false);
        setIsUsingMock(false);
      }, (error) => {
        console.warn("Firestore error, cargando simulación local:", error);
        loadMockData();
      });
    } catch (e) {
      console.log(e.message);
      loadMockData();
    }

    return () => unsubscribe();
  }, []);

  const loadMockData = () => {
    setIsUsingMock(true);
    setLoading(false);
    
    // Datos ficticios iniciales que simulan lecturas de un sensor de sonido
    const mockLogs = [
      { id: '1', deviceId: 'esp32_01', rawReading: 3200, decibels: 90.1, status: 'danger', timestamp: new Date(Date.now() - 5000).toLocaleString() },
      { id: '2', deviceId: 'esp32_01', rawReading: 1800, decibels: 65.1, status: 'warning', timestamp: new Date(Date.now() - 15000).toLocaleString() },
      { id: '3', deviceId: 'esp32_01', rawReading: 500, decibels: 34.0, status: 'normal', timestamp: new Date(Date.now() - 30000).toLocaleString() },
      { id: '4', deviceId: 'esp32_01', rawReading: 2200, decibels: 76.8, status: 'danger', timestamp: new Date(Date.now() - 45000).toLocaleString() },
      { id: '5', deviceId: 'esp32_01', rawReading: 1200, decibels: 51.6, status: 'normal', timestamp: new Date(Date.now() - 60000).toLocaleString() }
    ];
    setLogs(mockLogs);
  };

  // Convertir lectura analógica local (para simulación inmediata en frontend)
  const calculateDecibels = (raw) => {
    if (raw <= 0) return 20.0;
    const dbVal = 20 * Math.log10(raw) + 20;
    return Math.round(dBVal * 10) / 10;
  };

  const getStatus = (db) => {
    if (db > 75) return 'danger';
    if (db > 55) return 'warning';
    return 'normal';
  };

  // Simular la inserción de un registro
  const handleSimulate = async () => {
    setSimulating(true);
    const dbValue = calculateDecibels(simRawValue);
    const statusValue = getStatus(dbValue);

    const newRecord = {
      deviceId: simDeviceId,
      rawReading: parseInt(simRawValue, 10),
      decibels: dbValue,
      status: statusValue
    };

    if (isUsingMock) {
      // Modo local: agregamos al estado directamente
      const mockRecord = {
        id: Math.random().toString(),
        ...newRecord,
        timestamp: new Date().toLocaleString()
      };
      // Retraso artificial para simular red
      setTimeout(() => {
        setLogs(prev => [mockRecord, ...prev]);
        setSimulating(false);
      }, 500);
    } else {
      // Modo real: Escribe en Firestore (o llama a Cloud Function si estuviera configurada públicamente)
      // Como estamos preparando la estructura local primero, escribimos directamente a la DB para pruebas.
      try {
        await addDoc(collection(db, 'noise_logs'), {
          ...newRecord,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error("Error al escribir a Firestore:", err);
        alert("Error al guardar en la nube. Revisa las configuraciones de Firebase en tu consola.");
      } finally {
        setSimulating(false);
      }
    }
  };

  return (
    <div className="dashboard-view animate-fade-in-up">
      <div className="view-header">
        <div>
          <h2 className="view-title">Historial de Variables</h2>
          <p className="view-subtitle">Registros sonoros enviados por el hardware ESP32</p>
        </div>

        {isUsingMock && (
          <div style={{
            background: 'var(--status-warning-glow)',
            color: 'var(--status-warning)',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            <span>Modo Simulación Local Activo</span>
          </div>
        )}
      </div>

      {/* Panel del simulador de hardware (Facilita el desarrollo e interacción) */}
      <div className="simulator-panel">
        <h4 className="simulator-title">
          <Cpu size={18} />
          Panel Simulador del ESP32
        </h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Envía datos de prueba directamente. Simulará la lectura analógica (0-4095) de tu pin ADC y la enviará a la base de datos aplicando la fórmula logarítmica.
        </p>

        <div className="simulator-controls">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID Dispositivo</label>
            <input 
              type="text" 
              className="simulator-input"
              value={simDeviceId}
              onChange={(e) => setSimDeviceId(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lectura Analógica ADC (0 - 4095)</label>
            <input 
              type="number" 
              min="0" 
              max="4095"
              className="simulator-input"
              value={simRawValue}
              onChange={(e) => setSimRawValue(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conversión Calculada</label>
            <div style={{ padding: '10px 0', fontWeight: '600', color: 'var(--secondary)' }}>
              {calculateDecibels(simRawValue)} dB ({getStatus(calculateDecibels(simRawValue)).toUpperCase()})
            </div>
          </div>

          <button 
            className="btn-primary" 
            style={{ alignSelf: 'flex-end', height: '42px' }}
            onClick={handleSimulate}
            disabled={simulating}
          >
            {simulating ? 'Enviando...' : <><Plus size={16} /> Enviar Señal</>}
          </button>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-muted)' }}>
            Cargando variables...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-muted)' }}>
            No se han registrado variables de sonido. Envia una señal usando el simulador anterior.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th><Calendar size={14} style={{ marginRight: '6px' }} /> Marca de Tiempo</th>
                  <th><Cpu size={14} style={{ marginRight: '6px' }} /> Dispositivo</th>
                  <th>Lectura ADC (Crudo)</th>
                  <th><Volume2 size={14} style={{ marginRight: '6px' }} /> Nivel de Ruido</th>
                  <th>Clasificación</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.timestamp}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--secondary)' }}>{log.deviceId}</td>
                    <td>{log.rawReading} / 4095</td>
                    <td style={{ fontWeight: '600', fontSize: '1.05rem' }}>{log.decibels} dB</td>
                    <td>
                      <span className={`status-badge ${log.status}`}>
                        {log.status === 'danger' ? '🔴 Peligro' : log.status === 'warning' ? '🟡 Advertencia' : '🟢 Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
