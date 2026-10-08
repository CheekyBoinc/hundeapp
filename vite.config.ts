import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
    // Über die Tags-Schnittstelle statt per Textersetzung: So landet die CSP
    // auch dann im Kopf, wenn sich das Markup von index.html ändert.
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend'
        }
      ];
    }
  };
}

// Sammelt die Lizenzen aller Pakete, die tatsächlich im App-Bundle landen, und
// legt sie als licenses.txt neben die App („Einstellungen → Über die App →
// Lizenzen"). Dazu kommen die nativen Capacitor-Pakete und ein Hinweis auf die
// Android-Bibliotheken von Google, die nur im nativen Teil stecken.
function thirdPartyLicenses(): Plugin {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const nativ = ['@capacitor/android', '@capacitor/ios'];

  function lizenztext(ordner: string): string | null {
    const datei = readdirSync(ordner).find((n) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(n));
    return datei ? readFileSync(join(ordner, datei), 'utf8').trim() : null;
  }

  return {
    name: 'third-party-licenses',
    apply: 'build',
    generateBundle() {
      const ordner = new Map<string, string>();
      for (const id of this.getModuleIds()) {
        const pfad = id.replace(/^\0/, '').split('?')[0];
        const treffer = /^(.*\/node_modules\/((?:@[^/]+\/)?[^/]+))\//.exec(pfad);
        if (treffer) ordner.set(treffer[2], treffer[1]);
      }
      for (const name of nativ) {
        const pfad = join(root, 'node_modules', name);
        if (existsSync(pfad)) ordner.set(name, pfad);
      }

      const teile = [...ordner.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, pfad]) => {
          const meta = JSON.parse(readFileSync(join(pfad, 'package.json'), 'utf8')) as {
            version?: string;
            license?: string;
          };
          const text = lizenztext(pfad) ?? `Lizenz: ${meta.license ?? 'unbekannt'}`;
          return `== ${name} ${meta.version ?? ''} (${meta.license ?? 'unbekannt'}) ==\n\n${text}`;
        });

      // Nur im nativen Android-Teil: AndroidX, Kotlin und Google Play In-App
      // Review stehen unter der Apache License 2.0. Den Text liefert ein
      // Paket mit derselben Lizenz aus node_modules mit.
      const apache = join(root, 'node_modules', 'typescript', 'LICENSE.txt');
      teile.push(
        '== Android: AndroidX, Kotlin-Standardbibliothek, Google Play In-App Review (Apache-2.0) ==\n\n' +
          (existsSync(apache)
            ? readFileSync(apache, 'utf8').trim()
            : 'Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0')
      );

      this.emitFile({
        type: 'asset',
        fileName: 'licenses.txt',
        source: `${teile.join('\n\n\n')}\n`
      });
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
  plugins: [react(), tailwindcss(), csp(), guardDebugReminders(), thirdPartyLicenses()]
});
