// Messhilfen für den Mess-Build (`VITE_DEBUG_PERF=1`, siehe docs/entwicklung.md).
// Ohne den Schalter tun sie nichts; die Werte sind dann auch nicht im Bündel.
const AKTIV = import.meta.env.VITE_DEBUG_PERF === '1';

const zaehler = new Map<string, number>();

// Zählt einen Vorgang und meldet den neuen Stand.
export function zaehle(name: string): void {
  if (!AKTIV) return;
  const stand = (zaehler.get(name) ?? 0) + 1;
  zaehler.set(name, stand);
  console.info(`[perf] ${name}: ${stand}`);
}

// Misst einen synchronen Vorgang und meldet seine Dauer.
export function messe<T>(name: string, fn: () => T): T {
  if (!AKTIV) return fn();
  const start = performance.now();
  const ergebnis = fn();
  console.info(`[perf] ${name}: ${(performance.now() - start).toFixed(1)} ms`);
  return ergebnis;
}

// Einzelne Marke in Millisekunden seit dem Navigationsbeginn des WebViews.
export function marke(name: string, wert: number): void {
  if (AKTIV) console.info(`[perf] ${name}: ${wert.toFixed(1)} ms`);
}
