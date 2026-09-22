import { PHOTO_MAX_CHARS, PHOTO_PREFIX } from './types';

// Ein Foto wird vor dem Speichern quadratisch verkleinert: Das hält den
// abgeglichenen Stand klein (1-MB-Grenze) und die Sicherungsdatei handlich.

const SIZE = 256;
const QUALITIES = [0.8, 0.6, 0.45];
// Ab dieser Länge wird die Qualität eine Stufe gesenkt.
const TARGET_CHARS = 60000;

// Nächste Qualitätsstufe; null bedeutet: nicht mehr weiter senken.
export function nextQuality(current: number): number | null {
  const index = QUALITIES.indexOf(current);
  if (index === -1) return QUALITIES[0];
  return QUALITIES[index + 1] ?? null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Das Bild konnte nicht gelesen werden.'));
    };
    image.src = url;
  });
}

// Quadratischer Ausschnitt aus der Mitte, als JPEG. Die Ausrichtung macht der
// Browser beim Laden des Bildes (image-orientation: from-image).
export async function shrinkPhoto(file: File): Promise<string> {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Das Bild konnte nicht gelesen werden.');

  const kante = Math.min(image.naturalWidth, image.naturalHeight);
  if (!kante) throw new Error('Das Bild konnte nicht gelesen werden.');
  ctx.drawImage(
    image,
    (image.naturalWidth - kante) / 2,
    (image.naturalHeight - kante) / 2,
    kante,
    kante,
    0,
    0,
    SIZE,
    SIZE
  );

  let quality = QUALITIES[0];
  let data = canvas.toDataURL('image/jpeg', quality);
  while (data.length > TARGET_CHARS) {
    const naechste = nextQuality(quality);
    if (naechste === null) break;
    quality = naechste;
    data = canvas.toDataURL('image/jpeg', quality);
  }
  if (!data.startsWith(PHOTO_PREFIX) || data.length > PHOTO_MAX_CHARS) {
    throw new Error('Das Bild konnte nicht gelesen werden.');
  }
  return data;
}
