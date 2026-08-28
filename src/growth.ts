// Altersabhängige Richtgewichte (Welpen-Jugend) nach Rasse. Die Werte sind
// von mir geschätzte Orientierungswerte und NICHT aus verifizierten FCI-/Studien-
// Quellen übernommen. Vor einer fachlichen Verwendung prüfen. Der erste Name ist
// die kanonische Schreibweise, weitere sind Aliase für das freie Rassen-Feld.
import type { WeightStatus } from './breeds';

export interface GrowthPoint {
  months: number;
  minKg: number;
  maxKg: number;
}

interface GrowthEntry {
  names: [string, ...string[]];
  points: GrowthPoint[];
}

export const GROWTH: GrowthEntry[] = [
  {
    names: ['Australian Shepherd', 'aus', 'australian shepherd'],
    points: [
      { months: 3, minKg: 5, maxKg: 8 },
      { months: 6, minKg: 11, maxKg: 16 },
      { months: 12, minKg: 17, maxKg: 24 },
      { months: 18, minKg: 18, maxKg: 27 }
    ]
  },
  {
    names: ['Labrador Retriever', 'labrador'],
    points: [
      { months: 3, minKg: 10, maxKg: 15 },
      { months: 6, minKg: 20, maxKg: 26 },
      { months: 12, minKg: 25, maxKg: 33 },
      { months: 18, minKg: 25, maxKg: 36 }
    ]
  },
  {
    names: ['Golden Retriever', 'golden'],
    points: [
      { months: 3, minKg: 9, maxKg: 14 },
      { months: 6, minKg: 18, maxKg: 24 },
      { months: 12, minKg: 24, maxKg: 31 },
      { months: 18, minKg: 25, maxKg: 34 }
    ]
  },
  {
    names: ['Border Collie', 'border'],
    points: [
      { months: 3, minKg: 4, maxKg: 7 },
      { months: 6, minKg: 9, maxKg: 13 },
      { months: 12, minKg: 13, maxKg: 19 },
      { months: 18, minKg: 14, maxKg: 20 }
    ]
  },
  {
    names: ['Deutscher Schäferhund', 'schäferhund', 'schaeferhund', 'gsd'],
    points: [
      { months: 3, minKg: 9, maxKg: 15 },
      { months: 6, minKg: 18, maxKg: 27 },
      { months: 12, minKg: 24, maxKg: 35 },
      { months: 24, minKg: 22, maxKg: 40 }
    ]
  },
  {
    names: ['Jack Russell Terrier', 'jack russell'],
    points: [
      { months: 3, minKg: 2, maxKg: 4 },
      { months: 6, minKg: 4, maxKg: 6 },
      { months: 12, minKg: 5, maxKg: 8 }
    ]
  },
  {
    names: ['Dackel', 'dachshund', 'teckel'],
    points: [
      { months: 3, minKg: 2, maxKg: 4 },
      { months: 6, minKg: 3, maxKg: 6 },
      { months: 12, minKg: 4, maxKg: 9 }
    ]
  },
  {
    names: ['Beagle'],
    points: [
      { months: 3, minKg: 3, maxKg: 6 },
      { months: 6, minKg: 6, maxKg: 9 },
      { months: 12, minKg: 9, maxKg: 11 }
    ]
  },
  {
    names: ['Cocker Spaniel', 'cocker'],
    points: [
      { months: 3, minKg: 4, maxKg: 7 },
      { months: 6, minKg: 7, maxKg: 11 },
      { months: 12, minKg: 10, maxKg: 15 }
    ]
  },
  {
    names: ['Berner Sennenhund', 'berner'],
    points: [
      { months: 3, minKg: 12, maxKg: 18 },
      { months: 6, minKg: 22, maxKg: 30 },
      { months: 12, minKg: 32, maxKg: 44 },
      { months: 24, minKg: 30, maxKg: 50 }
    ]
  },
  {
    names: ['Husky', 'siberian husky'],
    points: [
      { months: 3, minKg: 5, maxKg: 9 },
      { months: 6, minKg: 10, maxKg: 16 },
      { months: 12, minKg: 15, maxKg: 26 },
      { months: 18, minKg: 16, maxKg: 28 }
    ]
  },
  {
    names: ['Boxer'],
    points: [
      { months: 3, minKg: 9, maxKg: 14 },
      { months: 6, minKg: 17, maxKg: 24 },
      { months: 12, minKg: 23, maxKg: 30 },
      { months: 18, minKg: 25, maxKg: 32 }
    ]
  }
];

const GROWTH_LOOKUP = new Map<string, GrowthPoint[]>();
for (const entry of GROWTH) {
  for (const name of entry.names) {
    GROWTH_LOOKUP.set(name.toLowerCase(), entry.points);
  }
}

export function findGrowth(rasse: string | null): GrowthPoint[] | null {
  if (!rasse) return null;
  return GROWTH_LOOKUP.get(rasse.trim().toLowerCase()) ?? null;
}

// Lineare Interpolation zwischen den Stützpunkten. Liefert null, wenn das Alter
// außerhalb des hinterlegten Bereichs liegt (jünger als der erste Punkt oder
// älter als der letzte Punkt = erwachsen).
export function classifyGrowth(
  weightKg: number,
  ageMonths: number,
  points: GrowthPoint[]
): WeightStatus | null {
  const range = rangeAt(ageMonths, points);
  if (!range) return null;
  if (weightKg < range.minKg) return 'under';
  if (weightKg > range.maxKg) return 'over';
  return 'norm';
}

function segmentFor(ageMonths: number, points: GrowthPoint[]): GrowthPoint | null {
  if (ageMonths < points[0].months) return null;
  const last = points[points.length - 1];
  if (ageMonths > last.months) return null;
  return points.find((_, i) => i < points.length - 1 && ageMonths <= points[i + 1].months) ?? last;
}

export function rangeAt(
  ageMonths: number,
  points: GrowthPoint[]
): { minKg: number; maxKg: number } | null {
  const segment = segmentFor(ageMonths, points);
  if (!segment) return null;
  const idx = points.indexOf(segment);
  const next = points[idx + 1];
  const t = next ? (ageMonths - segment.months) / (next.months - segment.months) : 1;
  return {
    minKg: segment.minKg + (next ? next.minKg - segment.minKg : 0) * t,
    maxKg: segment.maxKg + (next ? next.maxKg - segment.maxKg : 0) * t
  };
}
