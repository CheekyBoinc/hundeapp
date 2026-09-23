import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// Fügt dem Production-Build eine Content-Security-Policy hinzu.
// (Im Dev-Modus würde sie Vites Inline-Skripte blockieren.)
function csp(): Plugin {
  const policy = [
    "default-src 'self'",
    "connect-src 'self' https://api.github.com https://*.supabase.co",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'"
  ].join('; ');
  return {
    name: 'csp-header',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}">`
      );
    }
  };
}

// Der Test-Schalter darf in keinen Build geraten, der ausgeliefert wird.
function guardDebugReminders(): Plugin {
  return {
    name: 'guard-debug-reminders',
    apply: 'build',
    configResolved(config) {
      if (config.mode === 'production' && process.env.VITE_DEBUG_REMINDERS) {
        throw new Error(
          'VITE_DEBUG_REMINDERS ist gesetzt. Bitte entfernen; die Test-Erinnerung gehört nicht in einen Release-Build.'
        );
      }
    }
  };
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [react(), tailwindcss(), csp(), guardDebugReminders()]
});
