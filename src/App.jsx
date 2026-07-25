import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VariablesPage from './pages/VariablesPage';
import { Volume2, LogOut, LogIn, LayoutDashboard, Database, Home, User } from 'lucide-react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const { currentUser, logout } = useAuth();

  const handleNavigate = (tab) => {
    // Si la pestaña requiere autenticación y el usuario no está logueado, redirigir a login
    if ((tab === 'dashboard' || tab === 'variables') && !currentUser) {
      setActiveTab('login');
    } else {
      setActiveTab(tab);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setActiveTab('landing');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Renderizar la página activa de forma dinámica
  const renderActivePage = () => {
    switch (activeTab) {
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} isAuthenticated={!!currentUser} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'dashboard':
        return currentUser ? <DashboardPage /> : <LoginPage onNavigate={handleNavigate} />;
      case 'variables':
        return currentUser ? <VariablesPage /> : <LoginPage onNavigate={handleNavigate} />;
      default:
        return <LandingPage onNavigate={handleNavigate} isAuthenticated={!!currentUser} />;
    }
  };

  return (
    <div className="app-container">
      {/* Header / Barra de Navegación Premium */}
      <header className="app-header">
        <div className="logo-container" onClick={() => handleNavigate('landing')}>
          <Volume2 className="logo-icon" size={24} />
          <span>AcousticIoT</span>
        </div>

        <nav className="nav-links">
          <a 
            className={`nav-item ${activeTab === 'landing' ? 'active' : ''}`} 
            onClick={() => handleNavigate('landing')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Home size={16} /> Inicio
            </span>
          </a>
          
          <a 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => handleNavigate('dashboard')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <LayoutDashboard size={16} /> Dashboard
            </span>
          </a>

          <a 
            className={`nav-item ${activeTab === 'variables' ? 'active' : ''}`} 
            onClick={() => handleNavigate('variables')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Database size={16} /> Historial
            </span>
          </a>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="user-badge">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="user-avatar" />
                ) : (
                  <div className="user-avatar" style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={14} color="#FFF" />
                  </div>
                )}
                <span className="user-name">{currentUser.displayName || currentUser.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LogOut size={14} /> Salir
              </button>
            </div>
          ) : (
            <button 
              className="btn-primary" 
              style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              onClick={() => handleNavigate('login')}
            >
              <LogIn size={14} /> Ingresar
            </button>
          )}
        </nav>
      </header>

      {/* Contenido Principal */}
      <main style={{ flex: 1 }}>
        {renderActivePage()}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} AcousticIoT Inc. Prototipo de Monitoreo de Ruido para ESP32 & Firebase.</p>
        <p style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-muted)' }}>
          Desplegado en Vercel & Firebase Cloud Functions.
        </p>
      </footer>
    </div>
  );
}
