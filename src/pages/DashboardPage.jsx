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

// ==================== CONFIGURACIÓN DE ALERTAS DE TELEGRAM ====================
const TELEGRAM_BOT_TOKEN = "8689475771:AAFWLVi4-Olq4kepi20E57WF-D1BHzQcjwQ";
const TELEGRAM_CHAT_ID = "8761204101";
const UMBRAL_RUIDO = 75;

// Helpers para persistir el estado de control de spam en localStorage
const getPersistedState = () => {
  return {
    ultimoLogIdProcesado: localStorage.getItem('ultimoLogIdProcesado') || null,
    ultimaAlertaChainStart: localStorage.getItem('ultimaAlertaChainStart') ? parseInt(localStorage.getItem('ultimaAlertaChainStart'), 10) : null,
    ultimoInicioRuidoPersistente: localStorage.getItem('ultimoInicioRuidoPersistente') ? parseInt(localStorage.getItem('ultimoInicioRuidoPersistente'), 10) : null,
    ultimoMilestoneAlertaPersistente: localStorage.getItem('ultimoMilestoneAlertaPersistente') ? parseInt(localStorage.getItem('ultimoMilestoneAlertaPersistente'), 10) : 0,
  };
};

const setPersistedState = (state) => {
  if (state.ultimoLogIdProcesado !== undefined) {
    if (state.ultimoLogIdProcesado === null) localStorage.removeItem('ultimoLogIdProcesado');
    else localStorage.setItem('ultimoLogIdProcesado', state.ultimoLogIdProcesado);
  }
  if (state.ultimaAlertaChainStart !== undefined) {
    if (state.ultimaAlertaChainStart === null) localStorage.removeItem('ultimaAlertaChainStart');
    else localStorage.setItem('ultimaAlertaChainStart', state.ultimaAlertaChainStart.toString());
  }
  if (state.ultimoInicioRuidoPersistente !== undefined) {
    if (state.ultimoInicioRuidoPersistente === null) localStorage.removeItem('ultimoInicioRuidoPersistente');
    else localStorage.setItem('ultimoInicioRuidoPersistente', state.ultimoInicioRuidoPersistente.toString());
  }
  if (state.ultimoMilestoneAlertaPersistente !== undefined) {
    localStorage.setItem('ultimoMilestoneAlertaPersistente', state.ultimoMilestoneAlertaPersistente.toString());
  }
};

/**
 * Función para enviar una alerta a Telegram cuando el ruido supera el umbral permitido.
 * @param {number} nivelRuido - El valor actual del ruido en decibelios.
 */
function enviarAlertaTelegram(nivelRuido) {
  const mensajeText = `⚠️ ¡Alerta de Contaminación Sonora! El nivel de ruido ha superado el umbral de ${UMBRAL_RUIDO} dB. Valor actual: ${nivelRuido} dB.`;
  const mensaje = encodeURIComponent(mensajeText);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${mensaje}`;

  fetch(url, {
    method: 'POST'
  })
  .then(response => {
    if (!response.ok) {
      console.error("Error al enviar alerta a Telegram:", response.statusText);
    } else {
      console.log("Alerta de Telegram enviada exitosamente.");
    }
  })
  .catch(error => {
    console.error("Error de red al enviar alerta a Telegram:", error);
  });
}

/**
 * Función para enviar una alerta persistente a Telegram cuando el ruido ha permanecido alto.
 */
function enviarAlertaPersistenteTelegram(nivelRuido, tiempoFormateado) {
  const mensajeText = `🛑 Busque tomar urgentes medidas, el ruido se ha mantenido por un estratosférico período--ya va para ${tiempoFormateado} sin entrar a Fase de Silencio/Bajo Ruido. Valor actual: ${nivelRuido} dB.`;
  const mensaje = encodeURIComponent(mensajeText);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${mensaje}`;

  fetch(url, {
    method: 'POST'
  })
  .then(response => {
    if (!response.ok) {
      console.error("Error al enviar alerta persistente a Telegram:", response.statusText);
    } else {
      console.log("Alerta persistente de Telegram enviada exitosamente.");
    }
  })
  .catch(error => {
    console.error("Error de red al enviar alerta persistente a Telegram:", error);
  });
}

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

      // Traer los últimos 150 registros para el gráfico y análisis en tiempo real
      const q = query(collection(db, 'noise_logs'), orderBy('timestamp', 'desc'), limit(150));
      
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

        // --- LÓGICA DE CONTROL DE FLUJO ANTI-SPAM DE TELEGRAM ---
        const latestLog = sortedData[sortedData.length - 1];
        if (latestLog) {
          const state = getPersistedState();

          if (latestLog.id !== state.ultimoLogIdProcesado) {
            let nextState = { ultimoLogIdProcesado: latestLog.id };

            const valorRuido = latestLog.decibels;
            const esFresco = Date.now() - latestLog.rawTime < 30000; // Solo procesar si el log es de los últimos 30 segundos (evita alertas al iniciar)

            // 0. Verificar si nos hemos recuperado (entrado a Fase de Silencio/Bajo Ruido) desde que empezó el ruido persistente
            if (state.ultimoInicioRuidoPersistente !== null) {
              let seHaRecuperado = false;
              for (let d = 0; d < sortedData.length; d++) {
                const currentLog = sortedData[d];
                if (currentLog.rawTime < state.ultimoInicioRuidoPersistente) {
                  continue; // La recuperación debe ser posterior al inicio del ruido persistente
                }

                const esPrimeraCaida = currentLog.decibels <= UMBRAL_RUIDO && (d === 0 || sortedData[d - 1].decibels > UMBRAL_RUIDO);
                if (esPrimeraCaida) {
                  const W_start = currentLog.rawTime;
                  const W_end = W_start + 10000;

                  let lowDurationMs = 0;
                  let gapsDetected = false;

                  for (let k = d; k < sortedData.length; k++) {
                    const t_curr = sortedData[k].rawTime;
                    if (t_curr >= W_end) {
                      break;
                    }

                    let t_next = (k < sortedData.length - 1) ? sortedData[k + 1].rawTime : W_end;
                    if (t_next > W_end) {
                      t_next = W_end;
                    }

                    const interval = t_next - t_curr;
                    if (interval > 15000) {
                      gapsDetected = true;
                      break;
                    }

                    if (sortedData[k].decibels <= UMBRAL_RUIDO) {
                      lowDurationMs += interval;
                    }
                  }

                  if (!gapsDetected && lowDurationMs >= 6000) {
                    seHaRecuperado = true;
                    break;
                  }
                }
              }

              if (seHaRecuperado) {
                nextState.ultimoInicioRuidoPersistente = null;
                nextState.ultimoMilestoneAlertaPersistente = 0;
                state.ultimoInicioRuidoPersistente = null;
                state.ultimoMilestoneAlertaPersistente = 0;
              }
            }

            if (esFresco && valorRuido > UMBRAL_RUIDO) {
              // 1. Calcular el estado de ruido mayormente (>50%) por encima de 75 dB en los últimos 30 segundos
              const W_end = latestLog.rawTime;
              const W_start = W_end - 30000; // ventana de 30 segundos

              let highDurationMs = 0;
              let totalDurationMs = 0;
              let totalSamples = 0;
              let highSamples = 0;

              for (let k = 0; k < sortedData.length; k++) {
                const log = sortedData[k];
                
                // Contar muestras dentro de la ventana de 30 segundos
                if (log.rawTime >= W_start && log.rawTime <= W_end) {
                  totalSamples++;
                  if (log.decibels > UMBRAL_RUIDO) {
                    highSamples++;
                  }
                }

                // Calcular duración de los intervalos dentro de la ventana de 30 segundos
                const t_curr = log.rawTime;
                if (t_curr >= W_start && t_curr < W_end) {
                  let t_next = (k < sortedData.length - 1) ? sortedData[k + 1].rawTime : W_end;
                  if (t_next > W_end) {
                    t_next = W_end;
                  }
                  
                  const interval = t_next - t_curr;
                  totalDurationMs += interval;
                  if (log.decibels > UMBRAL_RUIDO) {
                    highDurationMs += interval;
                  }
                }
              }

              const ratioDuration = totalDurationMs > 0 ? (highDurationMs / totalDurationMs) : 0;
              const ratioSamples = totalSamples > 0 ? (highSamples / totalSamples) : 0;

              // Consideramos "mayormente" si:
              // - El ratio de la duración con exceso es > 50%
              // - O si la proporción de muestras altas es > 50%
              // Además, requerimos al menos una duración total de exceso de 15 segundos o 2 muestras altas
              // para asegurar estabilidad y evitar falsos positivos con muy pocos datos.
              const esMayormenteExceso = (ratioDuration > 0.5 && highDurationMs >= 15000) || (ratioSamples > 0.5 && highSamples >= 2);

              if (esMayormenteExceso) {
                // Encontrar el log más antiguo de la ventana de 30 segundos
                const logsEnVentana = sortedData.filter(log => log.rawTime >= W_start && log.rawTime <= W_end);
                const oldestLogEnVentana = logsEnVentana.length > 0 ? logsEnVentana[0] : latestLog;
                const oldestLogIndex = sortedData.findIndex(log => log.id === oldestLogEnVentana.id);

                // 2. Verificar que PREVIAMENTE hubo un periodo de recuperación de bajo ruido
                let hasPrevLowNoise = false;
                if (oldestLogIndex > 0) {
                  // Buscamos cualquier primera caída en el historial anterior al exceso
                  for (let d = 0; d < oldestLogIndex; d++) {
                    const currentLog = sortedData[d];
                    const esPrimeraCaida = currentLog.decibels <= UMBRAL_RUIDO && (d === 0 || sortedData[d - 1].decibels > UMBRAL_RUIDO);

                    if (esPrimeraCaida) {
                      const W_start_rec = currentLog.rawTime;
                      const W_end_rec = W_start_rec + 10000; // ventana de 10 segundos

                      let lowDurationMs = 0;
                      let gapsDetected = false;

                      for (let k = d; k < sortedData.length; k++) {
                        const t_curr = sortedData[k].rawTime;
                        if (t_curr >= W_end_rec) {
                          break;
                        }

                        let t_next = (k < sortedData.length - 1) ? sortedData[k + 1].rawTime : W_end_rec;
                        if (t_next > W_end_rec) {
                          t_next = W_end_rec;
                        }

                        const interval = t_next - t_curr;
                        
                        // Si hay una desconexión grande (>15s) entre lecturas, invalidamos la ventana
                        if (interval > 15000) {
                          gapsDetected = true;
                          break;
                        }

                        if (sortedData[k].decibels <= UMBRAL_RUIDO) {
                          lowDurationMs += interval;
                        }
                      }

                      // Si la mayoría del tiempo de la ventana (>= 6 segundos) fue de bajo ruido, y no hubo cortes
                      if (!gapsDetected && lowDurationMs >= 6000) {
                        hasPrevLowNoise = true;
                        break; // Ya encontramos una ventana de recuperación válida previa
                      }
                    }
                  }
                }

                // 3. Si se cumple la condición previa de bajo ruido, no estamos en un ciclo de ruido persistente ya notificado
                // y no hemos enviado una alerta para este log inicial de la ventana
                if (hasPrevLowNoise && state.ultimoInicioRuidoPersistente === null && state.ultimaAlertaChainStart !== oldestLogEnVentana.rawTime) {
                  enviarAlertaTelegram(valorRuido);
                  nextState.ultimaAlertaChainStart = oldestLogEnVentana.rawTime;

                  // Anclar el inicio del ruido persistente
                  nextState.ultimoInicioRuidoPersistente = oldestLogEnVentana.rawTime;
                  nextState.ultimoMilestoneAlertaPersistente = 0;
                  state.ultimoInicioRuidoPersistente = oldestLogEnVentana.rawTime;
                  state.ultimoMilestoneAlertaPersistente = 0;
                }
              }

              // 5. Lógica de escala / alerta persistente (si lleva >= 120s en exceso de ruido sin silenciarse)
              if (state.ultimoInicioRuidoPersistente !== null) {
                const totalPeriodMs = latestLog.rawTime - state.ultimoInicioRuidoPersistente;
                const elapsedSeconds = Math.round(totalPeriodMs / 1000);

                if (elapsedSeconds >= 120) {
                  // Calcular qué porcentaje del tiempo ha estado por encima de 75dB durante este período (rango visible)
                  const T_start_calculo = Math.max(state.ultimoInicioRuidoPersistente, sortedData[0].rawTime);
                  let highDurationMs = 0;
                  let periodCalculadoMs = latestLog.rawTime - T_start_calculo;

                  if (periodCalculadoMs > 0) {
                    for (let k = 0; k < sortedData.length; k++) {
                      const t_curr = sortedData[k].rawTime;
                      if (t_curr < T_start_calculo || t_curr >= latestLog.rawTime) {
                        continue;
                      }

                      let t_next = (k < sortedData.length - 1) ? sortedData[k + 1].rawTime : latestLog.rawTime;
                      if (t_next > latestLog.rawTime) {
                        t_next = latestLog.rawTime;
                      }

                      const interval = t_next - t_curr;
                      if (sortedData[k].decibels > UMBRAL_RUIDO) {
                        highDurationMs += interval;
                      }
                    }
                  }

                  const ratioExceso = periodCalculadoMs > 0 ? (highDurationMs / periodCalculadoMs) : 0;

                  // Si el nivel de ruido ha estado mayormente (>50%) por encima de 75dB en la parte visible
                  if (ratioExceso >= 0.5) {
                    const currentMilestone = Math.floor(elapsedSeconds / 120) * 120;

                    if (currentMilestone > state.ultimoMilestoneAlertaPersistente) {
                      const minutos = Math.floor(elapsedSeconds / 60);
                      const segundos = elapsedSeconds % 60;
                      let tiempoFormateado = "";
                      if (minutos > 0) {
                        tiempoFormateado += `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
                        if (segundos > 0) {
                          tiempoFormateado += ` y ${segundos} segundo${segundos !== 1 ? 's' : ''}`;
                        }
                      } else {
                        tiempoFormateado += `${segundos} segundo${segundos !== 1 ? 's' : ''}`;
                      }

                      enviarAlertaPersistenteTelegram(valorRuido, tiempoFormateado);
                      nextState.ultimoMilestoneAlertaPersistente = currentMilestone;
                    }
                  }
                }
              }
            }

            // Guardar el estado actualizado en localStorage
            setPersistedState(nextState);
          }
        }

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
