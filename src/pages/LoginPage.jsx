import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage({ onNavigate }) {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      onNavigate('dashboard');
    } catch (err) {
      setError('No se pudo autenticar con Google. Inténtalo de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in-up">
      <div className="login-card glass-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="feature-icon-container" style={{ margin: 0 }}>
            <ShieldCheck size={28} />
          </div>
          <h2 className="view-title">Iniciar Sesión</h2>
          <p className="view-subtitle" style={{ maxWidth: '300px', margin: '0 auto' }}>
            Accede de forma segura para visualizar las métricas de tu sensor y configurar alertas.
          </p>
        </div>

        {error && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--status-danger-glow)', 
            color: 'var(--status-danger)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '0.9rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button 
          className="google-btn" 
          onClick={handleLogin}
          disabled={loading}
        >
          {/* Logo SVG de Google para verse premium */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.47-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.348 0-4.336-1.583-5.044-3.716H.957v2.332C2.438 15.93 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.956 10.702c-.18-.54-.282-1.119-.282-1.702s.102-1.162.282-1.702V4.966H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.034l3-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.5.454 3.435 1.348l2.576-2.576C13.466.858 11.426 0 9 0 5.482 0 2.438 2.07 1.002 5.068l2.954 2.296C4.664 5.163 6.652 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? 'Conectando...' : 'Iniciar Sesión con Google'}
        </button>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button 
            className="btn-secondary" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => onNavigate('landing')}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
