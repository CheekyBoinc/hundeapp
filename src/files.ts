import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Datei an den Nutzer ausliefern. Im Browser als Download; in der nativen
// App über das Teilen-Menü des Systems (Dateien-App, Drive, Messenger …),
// weil die WebView keinen klassischen Download kennt.

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function downloadInBrowser(filename: string, content: Blob): void {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Exporte liegen in einem eigenen Ordner im Cache. Er ist der einzige Pfad,
// den der FileProvider nach außen freigibt.
const EXPORT_DIR = 'exports';

// Vor jedem Export aufräumen. Nicht direkt nach dem Teilen: Die Ziel-App liest
// die Datei je nach Plattform erst nach dem Schließen des Dialogs.
export async function prepareExportDir(): Promise<void> {
  // mkdir meldet einen vorhandenen Ordner je nach Plattform als Fehler; das
  // darf das Aufräumen nicht überspringen.
  await Filesystem.mkdir({ path: EXPORT_DIR, directory: Directory.Cache, recursive: true }).catch(
    () => undefined
  );
  const { files } = await Filesystem.readdir({ path: EXPORT_DIR, directory: Directory.Cache });
  for (const entry of files) {
    if (entry.type !== 'file') continue;
    await Filesystem.deleteFile({
      path: `${EXPORT_DIR}/${entry.name}`,
      directory: Directory.Cache
    });
  }
}

async function shareNative(filename: string, content: string | Blob): Promise<void> {
  // Aufräumen darf den Export nicht verhindern: Eine liegen gebliebene alte
  // Datei ist ärgerlich, aber kein Grund, die neue nicht zu schreiben.
  await prepareExportDir().catch(() => undefined);
  const path = `${EXPORT_DIR}/${filename}`;
  const written =
    typeof content === 'string'
      ? await Filesystem.writeFile({
          path,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        })
      : await Filesystem.writeFile({
          path,
          data: await blobToBase64(content),
          directory: Directory.Cache
        });
  await Share.share({ title: filename, url: written.uri, dialogTitle: 'Speichern oder teilen' });
}

export async function saveFile(
  filename: string,
  content: string | Blob,
  mime: string
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await shareNative(filename, content);
    } catch (err) {
      // Abbruch des Teilen-Dialogs ist kein Fehler.
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      throw err;
    }
    return;
  }
  downloadInBrowser(
    filename,
    typeof content === 'string' ? new Blob([content], { type: mime }) : content
  );
}

// Freitext (z. B. Hundename) in einen sicheren Dateinamen-Baustein wandeln:
// Umlaute umschreiben, alles außer Buchstaben, Ziffern und Bindestrich raus.
export function safeFilePart(name: string, fallback = 'hund'): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

// Datei vom Nutzer einlesen (Text).
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}
