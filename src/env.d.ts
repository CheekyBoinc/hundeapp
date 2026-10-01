/// <reference types="vite/client" />

// Wird von Vite aus package.json gesetzt (siehe vite.config.ts).
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  // Zugangsdaten des Sync-Dienstes (öffentlich, dürfen in den Build).
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  // Schalter: Ohne "1" erscheint der Dienst nirgends in der Oberfläche.
  readonly VITE_CLOUD_SYNC?: string;
  // Nur für Test-Builds: blendet die Test-Erinnerung in den Einstellungen ein.
  readonly VITE_DEBUG_REMINDERS?: string;
  // Nur für Mess-Builds: schaltet die Messhilfen in src/perf.ts und
  // src/perfStart.ts ein (siehe docs/entwicklung.md).
  readonly VITE_DEBUG_PERF?: string;
}

// Marke aus src/perfStart.ts. Muss "var" sein: Bei "declare const" scheitert
// tsc an der Zuweisung über globalThis (TS7017).
// eslint-disable-next-line no-var
declare var __perfStart: number | undefined;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
