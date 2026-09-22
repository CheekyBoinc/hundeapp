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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
