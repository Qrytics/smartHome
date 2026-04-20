import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import AccessControl from './pages/AccessControl';
import Analytics from './pages/Analytics';
import AutomationRules from './pages/AutomationRules';
import Dashboard from './pages/Dashboard';
import Lighting from './pages/Lighting';
import Settings from './pages/Settings';
import './App.css';

function getPageMeta(pathname) {
  if (pathname.startsWith('/lighting')) {
    return {
      title: 'Lighting Control',
      subtitle: 'Control lighting and monitor live telemetry.',
    };
  }

  if (pathname.startsWith('/access')) {
    return {
      title: 'Access Control',
      subtitle: 'Manage RFID cards and review access logs.',
    };
  }

  if (pathname.startsWith('/analytics')) {
    return {
      title: 'Analytics',
      subtitle: 'Analyze history with filters and CSV export.',
    };
  }

  if (pathname.startsWith('/settings')) {
    return {
      title: 'Settings',
      subtitle: 'Configure devices, admin access, and diagnostics.',
    };
  }

  if (pathname.startsWith('/automation')) {
    return {
      title: 'Automation Rules',
      subtitle: 'Build drag-drop rules for RFID and door lock.',
    };
  }

  return {
    title: 'Dashboard',
    subtitle: 'Environment, access, and lighting overview.',
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
            <Route path="/automation" element={<AutomationRules />} />
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
