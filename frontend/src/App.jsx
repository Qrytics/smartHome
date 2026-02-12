import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import AccessControl from './pages/AccessControl';
import Analytics from './pages/Analytics';
import Dashboard from './pages/Dashboard';
import Lighting from './pages/Lighting';
import Settings from './pages/Settings';
import './App.css';

function getPageMeta(pathname) {
  if (pathname.startsWith('/lighting')) {
    return {
      title: 'Lighting Control',
      subtitle: 'Manual and daylight-harvest lighting management with live telemetry.',
    };
  }

  if (pathname.startsWith('/access')) {
    return {
      title: 'Access Control',
      subtitle: 'Manage RFID policy cards and inspect access audit logs in real time.',
    };
  }

  if (pathname.startsWith('/analytics')) {
    return {
      title: 'Analytics',
      subtitle: 'Historical telemetry analysis with range filters and CSV export.',
    };
  }

  if (pathname.startsWith('/settings')) {
    return {
      title: 'Settings',
      subtitle: 'Configure device IDs, admin session access, and runtime diagnostics.',
    };
  }

  return {
    title: 'Dashboard',
    subtitle: 'Unified smart-home command center for environment, access, and lighting.',
  };
}

function AppLayout() {
  const location = useLocation();
  const meta = getPageMeta(location.pathname);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lighting" element={<Lighting />} />
            <Route path="/access" element={<AccessControl />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
