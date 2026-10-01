import './perfStart'; // muss der erste Import bleiben (Marke vor der Auswertung)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/newsreader';
import App from './App';
import { prepareExportDir } from './files';
import { marke } from './perf';
import { initSync, isConfigured } from './sync';
import { seedDemoIfEmpty } from './localStore';
import { rescheduleReminders } from './notify';
import { loadSettings } from './settings';
import { applyTheme } from './theme';
import './styles.css';

applyTheme(loadSettings().theme);

// Alte Exportdateien nicht bis zum nächsten Export liegen lassen.
void prepareExportDir().catch(() => undefined);

// Messhilfen (nur mit VITE_DEBUG_PERF): alle Module sind ausgewertet.
const bisStart = globalThis.__perfStart;
const modulstart = performance.now();
if (bisStart !== undefined) marke('bisStart', bisStart);
marke('modulstart', modulstart);
// Auf Android gibt es einen Eintrag für den Einstiegs-Chunk; auf iOS nicht.
const chunk = performance.getEntriesByName(import.meta.url)[0] as
  PerformanceResourceTiming | undefined;
if (chunk && chunk.responseEnd > 0) marke('chunk', chunk.responseEnd);

const root = createRoot(document.getElementById('root')!);
initSync()
  .catch(() => undefined)
  .then(() => {
    // Frischer Start ohne Sync: neutrale Beispieldaten, damit die App nicht leer wirkt.
    if (!isConfigured()) seedDemoIfEmpty();
    // Erinnerungen planen, sobald der Start durch ist.
    rescheduleReminders();
    const init = performance.now();
    marke('init', init);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    // Nach dem ersten Commit und Zeichnen: eine Animationseinheit, dann ein
    // Kurzzeitgeber. Damit liegt die Marke hinter dem ersten Bild.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const render = performance.now();
        marke('render', render);
        if (bisStart !== undefined) {
          console.info(
            `[perf] Bilanz: auswerten=${(modulstart - bisStart).toFixed(1)} init=${(
              init - modulstart
            ).toFixed(1)} render=${(render - init).toFixed(1)} gesamt=${render.toFixed(1)}`
          );
        }
      }, 0);
    });
  });
