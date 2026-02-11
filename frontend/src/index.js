import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './contexts/AuthContext';
import { SmartHomeProvider } from './contexts/SmartHomeContext';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <SmartHomeProvider>
        <App />
      </SmartHomeProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
