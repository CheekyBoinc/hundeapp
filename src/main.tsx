import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/newsreader';
import App from './App';
import { initSync, isConfigured } from './sync';
import { seedDemoIfEmpty } from './localStore';
import { rescheduleReminders } from './notify';
import { loadSettings } from './settings';
import { applyTheme } from './theme';
import './styles.css';

applyTheme(loadSettings().theme);

const root = createRoot(document.getElementById('root')!);
initSync()
  .catch(() => undefined)
  .then(() => {
    // Frischer Start ohne Sync: neutrale Beispieldaten, damit die App nicht leer wirkt.
    if (!isConfigured()) seedDemoIfEmpty();
    // Erinnerungen planen, sobald der Start durch ist.
    rescheduleReminders();
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
