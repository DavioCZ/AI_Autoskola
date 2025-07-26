import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import DrivingTestApp from './DrivingTestApp';
import { AuthProvider } from './Auth';

// Spuštění Web Workeru pro analýzu na pozadí
if (window.Worker) {
  const worker = new Worker(new URL('./workers/analysis.worker.ts', import.meta.url), {
    type: 'module'
  });

  worker.onerror = (event) => {
    console.error('Chyba ve Web Workeru:', event);
  };
} else {
  console.warn('Váš prohlížeč nepodporuje Web Workers. Analýza na pozadí nebude dostupná.');
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <DrivingTestApp />
    </AuthProvider>
  </React.StrictMode>,
);
