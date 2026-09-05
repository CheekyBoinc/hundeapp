import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/newsreader';
import App from './App';
import { getConfig, initConfig } from './github';
import { seedDemoIfEmpty } from './localStore';
import './styles.css';

// In der nativen App liegen alle Dateien bereits im Paket; der Service Worker
// würde dort nur veraltete Stände zwischenspeichern.
if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}

const root = createRoot(document.getElementById('root')!);
initConfig()
  .catch(() => undefined)
  .then(() => {
    // Frischer Start ohne Sync: neutrale Beispieldaten, damit die App nicht leer wirkt.
    if (!getConfig()) seedDemoIfEmpty();
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
