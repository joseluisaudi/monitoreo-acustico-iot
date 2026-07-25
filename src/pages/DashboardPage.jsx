import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
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
        time: new Date(timeOffset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rawTime: timeOffset
      });
    });

    setLogs(mockData);
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

  // Formato del tooltip del gráfico
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--border-color)',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-premium)'
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Hora: {data.time}</p>
          <p style={{ fontWeight: '600', color: 'var(--secondary)' }}>Nivel: {data.decibels} dB</p>
          <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: '700', 
            color: data.status === 'danger' ? 'var(--status-danger)' : data.status === 'warning' ? 'var(--status-warning)' : 'var(--status-normal)'
          }}>
            Estado: {data.status}
          </p>
        </div>
      );
    }
    return null;
  };

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
          <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Cargando gráfico...
              </div>
            ) : logs.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No hay datos suficientes para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={logs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="time" 
                    stroke="var(--text-muted)" 
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={11}
                    domain={[10, 100]}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="decibels" 
                    stroke="var(--secondary)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorDb)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
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
