import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
// Recharts eliminado para usar Chart.js vía CDN
import { 
  Volume2, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  BarChart2, 
  Info 
} from 'lucide-react';

export default function DashboardPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  
  const chartInstanceRef = React.useRef(null);

  // Limpiar el canvas duplicado de index.html y destruir el gráfico al desmontar
  useEffect(() => {
    const duplicateCanvas = document.querySelector('body > .seccion-monitoreo');
    if (duplicateCanvas) {
      duplicateCanvas.remove();
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key') {
        throw new Error("Credenciales de Firebase no configuradas. Usando datos de simulación local.");
      }

      // Traer los últimos 20 registros para el gráfico de tiempo real
      const q = query(collection(db, 'noise_logs'), orderBy('timestamp', 'desc'), limit(20));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            // Formatear hora de forma simple
            time: docData.timestamp?.toDate() 
              ? docData.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            // Guardar timestamp numérico para ordenar cronológicamente en el gráfico
            rawTime: docData.timestamp?.toDate() ? docData.timestamp.toDate().getTime() : Date.now()
          };
        });

        // Ordenar cronológicamente (antiguos a recientes para el gráfico)
        const sortedData = data.sort((a, b) => a.rawTime - b.rawTime);
        setLogs(sortedData);
        setLoading(false);
        setIsUsingMock(false);

        // --- ACTUALIZACIÓN DE CHART.JS EN TIEMPO REAL ---
        const ctx = document.getElementById('miGrafico');
        if (ctx) {
          if (!chartInstanceRef.current) {
            // Inicializar una gráfica de líneas de Chart.js referenciando el canvas 'miGrafico'
            // Define la estructura base con un dataset para el nivel de ruido/sonido (eje Y) y etiquetas de tiempo (eje X)
            const initialLogs = sortedData.slice(-10);
            chartInstanceRef.current = new window.Chart(ctx, {
              type: 'line',
              data: {
                labels: initialLogs.map(log => log.time),
                datasets: [{
                  label: 'Nivel de Ruido (dB)',
                  data: initialLogs.map(log => log.decibels),
                  borderColor: '#06b6d4', // var(--secondary)
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  borderWidth: 2,
                  tension: 0.3,
                  fill: true,
                  pointBackgroundColor: '#06b6d4',
                  pointBorderColor: '#080C14',
                  pointBorderWidth: 1.5,
                  pointRadius: 4,
                  pointHoverRadius: 6
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    min: 10,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 11 } }
                  },
                  x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 11 } }
                  }
                },
                plugins: {
                  legend: { display: false }
                }
              }
            });
            // Guardar el último ID graficado para evitar duplicaciones
            if (initialLogs.length > 0) {
              chartInstanceRef.current.data.datasets[0]._lastLoggedId = initialLogs[initialLogs.length - 1].id;
            }
          } else {
            // En cada nueva lectura (dentro del oyente de Firebase)
            const latestLog = sortedData[sortedData.length - 1];
            if (latestLog) {
              const currentDataset = chartInstanceRef.current.data.datasets[0];
              if (currentDataset._lastLoggedId !== latestLog.id) {
                // Actualiza el gráfico agregando la lectura de ruido y el tiempo actual (toLocaleTimeString)
                const currentLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                chartInstanceRef.current.data.labels.push(currentLabel);
                currentDataset.data.push(latestLog.decibels);
                currentDataset._lastLoggedId = latestLog.id;

                // Mantiene un máximo de 10 puntos visibles en la gráfica (usa .shift() cuando se supere ese límite)
                if (chartInstanceRef.current.data.labels.length > 10) {
                  chartInstanceRef.current.data.labels.shift();
                  currentDataset.data.shift();
                }

                // Ejecuta miGrafico.update() en cada nueva lectura
                chartInstanceRef.current.update();
              }
            }
          }
        }
      }, (error) => {
        console.warn("Error en la conexión en tiempo real, cargando fallback local:", error);
        loadMockData();
      });
    } catch (e) {
      loadMockData();
    }

    return () => unsubscribe();
  }, []);

  const loadMockData = () => {
    setIsUsingMock(true);
    setLoading(false);
    
    // Generar 10 lecturas secuenciales simulando minutos anteriores
    const mockData = [];
    const baseTime = Date.now() - 600000;
    
    // Generar registros que oscilen entre 30 y 85 dB
    const simulatedVals = [35.2, 42.1, 48.0, 65.4, 78.1, 88.5, 62.0, 51.2, 44.5, 38.0];
    simulatedVals.forEach((val, index) => {
      const timeOffset = baseTime + index * 60000;
      let status = 'normal';
      if (val > 75) status = 'danger';
      else if (val > 55) status = 'warning';

      mockData.push({
        id: index.toString(),
        deviceId: 'esp32_01',
        rawReading: Math.floor(Math.pow(10, (val - 20) / 20)), // Cálculo invertido aproximado
        decibels: val,
        status: status,
        time: new Date(timeOffset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        rawTime: timeOffset
      });
    });

    setLogs(mockData);

    // Inicializar el gráfico con los datos simulados locales
    setTimeout(() => {
      const ctx = document.getElementById('miGrafico');
      if (ctx) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }
        chartInstanceRef.current = new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: mockData.map(log => log.time),
            datasets: [{
              label: 'Nivel de Ruido (dB)',
              data: mockData.map(log => log.decibels),
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#06b6d4',
              pointBorderColor: '#080C14',
              pointBorderWidth: 1.5,
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: 10,
                max: 100,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 11 } }
              },
              x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 11 } }
              }
            },
            plugins: {
              legend: { display: false }
            }
          }
        });
        chartInstanceRef.current.data.datasets[0]._lastLoggedId = mockData[mockData.length - 1].id;
      }
    }, 100);
  };

  // Cálculos estadísticos basados en los logs actuales
  const getMetrics = () => {
    if (logs.length === 0) return { current: 0, average: 0, max: 0, status: 'normal' };
    
    // El último registro es la lectura más reciente (porque los ordenamos cronológicamente para el gráfico)
    const currentLog = logs[logs.length - 1];
    const current = currentLog?.decibels || 0;
    
    const sum = logs.reduce((acc, log) => acc + log.decibels, 0);
    const average = Math.round((sum / logs.length) * 10) / 10;
    
    const max = Math.max(...logs.map(l => l.decibels));
    
    // Determinar estado de salud según la lectura actual
    let status = 'normal';
    if (current > 75) status = 'danger';
    else if (current > 55) status = 'warning';

    return { current, average, max, status };
  };

  const { current, average, max, status } = getMetrics();

  // Recharts CustomTooltip eliminado (se utiliza el tooltip nativo de Chart.js)

  return (
    <div className="dashboard-view animate-fade-in-up">
      <div className="view-header">
        <div>
          <h2 className="view-title">Dashboard Analítico</h2>
          <p className="view-subtitle">Monitoreo de señales sonoras en tiempo real</p>
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
            <span>Datos locales de demostración</span>
          </div>
        )}
      </div>

      {/* Grid de Métricas Principales */}
      <div className="metrics-grid">
        <div className="metric-card glass-card">
          <div className="metric-header">
            <span>Lectura Actual</span>
            <Volume2 size={18} color="var(--secondary)" />
          </div>
          <div className="metric-value">
            {current} <span className="metric-unit">dB</span>
          </div>
          <span className={`metric-indicator ${status === 'danger' ? 'indicator-danger' : status === 'warning' ? 'indicator-warning' : 'indicator-normal'}`}>
            {status === 'danger' ? 'RUIDOSO (DAÑINO)' : status === 'warning' ? 'MODERADO' : 'SEGURO'}
          </span>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-header">
            <span>Promedio de Sesión</span>
            <TrendingUp size={18} color="var(--primary)" />
          </div>
          <div className="metric-value">
            {average} <span className="metric-unit">dB</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Calculado en base a {logs.length} muestras
          </span>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-header">
            <span>Nivel Máximo Registrado</span>
            <Activity size={18} color="var(--status-danger)" />
          </div>
          <div className="metric-value" style={{ color: max > 75 ? 'var(--status-danger)' : 'var(--text-main)' }}>
            {max === -Infinity ? 0 : max} <span className="metric-unit">dB</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Pico sonoro de la sesión
          </span>
        </div>
      </div>

      {/* Sección de Gráficos e Indicadores visuales */}
      <div className="charts-section">
        {/* Gráfico de Línea Temporal */}
        <div className="chart-card glass-card">
          <h3 className="chart-title">Comportamiento del Nivel de Sonido (dB)</h3>
          <div style={{ width: '100%', height: '100%', minHeight: '300px', position: 'relative' }}>
            {loading && (
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'rgba(8, 12, 20, 0.7)',
                color: 'var(--text-muted)',
                zIndex: 10
              }}>
                Cargando gráfico...
              </div>
            )}
            <div style={{ width: '100%', height: '280px', position: 'relative' }}>
              <canvas id="miGrafico" width="400" height="200"></canvas>
            </div>
          </div>
        </div>

        {/* Indicador de Nivel Auditivo (Tacómetro Visual) */}
        <div className="gauge-card glass-card">
          <h3 className="chart-title">Salud Auditiva</h3>
          
          <div className="gauge-circle" style={{
            borderColor: status === 'danger' ? 'var(--status-danger)' : status === 'warning' ? 'var(--status-warning)' : 'var(--status-normal)',
            boxShadow: `0 0 30px ${status === 'danger' ? 'var(--status-danger-glow)' : status === 'warning' ? 'var(--status-warning-glow)' : 'var(--status-normal-glow)'}`
          }}>
            <span className="gauge-value">{current}</span>
            <span className="gauge-status" style={{
              color: status === 'danger' ? 'var(--status-danger)' : status === 'warning' ? 'var(--status-warning)' : 'var(--status-normal)'
            }}>
              {status === 'danger' ? 'Peligro' : status === 'warning' ? 'Precaución' : 'Normal'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'left', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} color="var(--status-normal)" />
              <span>&lt; 55 dB: Nivel óptimo y seguro</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={14} color="var(--status-warning)" />
              <span>55 - 75 dB: Exposición prolongada molesta</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={14} color="var(--status-danger)" />
              <span>&gt; 75 dB: Daño auditivo latente</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tarjeta Informativa sobre el proyecto */}
      <div className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div className="feature-icon-container" style={{ margin: 0, flexShrink: 0 }}>
          <Info size={20} />
        </div>
        <div>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: '600', marginBottom: '4px' }}>¿Cómo se realiza el cálculo de decibelios?</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            La Cloud Function recibe la lectura analógica directa del ESP32 (rango 0 a 4095) y le aplica la función de escala logarítmica acústica 
            <code> dB = 20 * log10(Lectura_ADC) + 20</code>. Esto permite que una lectura cercana a 0 represente silencio (20 dB) y una lectura máxima 
            de 4095 represente cerca de 92 dB (sonido alto o maquinaria industrial).
          </p>
        </div>
      </div>
    </div>
  );
}
