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

async function shareNative(filename: string, content: string | Blob): Promise<void> {
  const written =
    typeof content === 'string'
      ? await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        })
      : await Filesystem.writeFile({
          path: filename,
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

// Datei vom Nutzer einlesen (Text).
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}
