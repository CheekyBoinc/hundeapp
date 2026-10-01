// Erste Anweisung der App: Der Einstiegs-Chunk ist geladen und auf oberster
// Ebene ausgewertet, die Auswertung beginnt. Nur im Mess-Build.
if (import.meta.env.VITE_DEBUG_PERF === '1') {
  globalThis.__perfStart = performance.now();
}
