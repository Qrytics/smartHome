import React from 'react';
import { NavLink } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { useSmartHome } from '../../contexts/SmartHomeContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', caption: 'System overview' },
  { to: '/lighting', label: 'Lighting', caption: 'Dimmer + relay control' },
  { to: '/access', label: 'Access Control', caption: 'RFID policies + logs' },
  { to: '/analytics', label: 'Analytics', caption: 'History + exports' },
  { to: '/settings', label: 'Settings', caption: 'Devices + auth session' },
];

export default function Sidebar() {
  const { wsStatus, apiReachable } = useSmartHome();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>SmartHome</h1>
        <p>Web-first building controls</p>
      </div>

      <div className="sidebar-status-row">
        <StatusBadge tone={apiReachable ? 'success' : 'warning'}>
          API {apiReachable ? 'ONLINE' : 'DEGRADED'}
        </StatusBadge>
        <StatusBadge tone={wsStatus === 'connected' ? 'success' : 'info'}>
          WS {wsStatus.toUpperCase()}
        </StatusBadge>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
          >
            <span className="nav-link-title">{item.label}</span>
            <span className="nav-link-caption">{item.caption}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

