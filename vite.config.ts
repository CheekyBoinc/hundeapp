import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

// Mess- und Test-Schalter dürfen in keinen Build geraten, der ausgeliefert
// wird. Geprüft werden die Umgebung und die .env-Dateien; der Mess-Build läuft
// im Modus "perf" und bleibt erlaubt.
function guardDebugReminders(): Plugin {
  const dateien = ['.env', '.env.local', '.env.production', '.env.production.local'];
  return {
    name: 'guard-debug-reminders',
    apply: 'build',
    configResolved(config) {
      if (config.mode !== 'production') return;
      const gesetzt = Object.keys(process.env).filter((k) => /^VITE_DEBUG_/.test(k));
      for (const name of dateien) {
        let inhalt: string;
        try {
          inhalt = readFileSync(new URL(name, import.meta.url), 'utf8');
        } catch {
          continue; // Datei gibt es nicht
        }
        for (const zeile of inhalt.split('\n')) {
          const treffer = /^\s*(VITE_DEBUG_\w*)\s*=\s*(.+)$/.exec(zeile);
          if (treffer) gesetzt.push(`${name}: ${treffer[1]}`);
        }
      }
      if (gesetzt.length > 0) {
        throw new Error(
          `Test-Schalter gesetzt (${gesetzt.join(', ')}). Bitte entfernen; sie gehören nicht in einen Release-Build.`
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
  // jspdf lädt html2canvas, dompurify und canvg nur für html() und SVG nach.
  // Der PDF-Bericht nutzt nur Text und Tabellen, deshalb bleiben die drei
  // Pakete samt core-js draußen; der Stub meldet sich, falls sie doch gebraucht
  // werden.
  resolve: {
    alias: [
      {
        find: /^html2canvas$/,
        replacement: fileURLToPath(new URL('./src/stubs/jspdf-optional.ts', import.meta.url))
      },
      {
        find: /^dompurify$/,
        replacement: fileURLToPath(new URL('./src/stubs/jspdf-optional.ts', import.meta.url))
      },
      {
        find: /^canvg$/,
        replacement: fileURLToPath(new URL('./src/stubs/jspdf-optional.ts', import.meta.url))
      }
    ]
  },
  plugins: [react(), tailwindcss(), csp(), guardDebugReminders()]
});
