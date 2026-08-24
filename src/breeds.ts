// Normalgewicht-Spannen nach Rasse. Die Werte sind gerundete Richtwerte aus
// FCI-/Züchter-Standards für ausgewachsene Hunde. Der erste Name ist die
// kanonische Schreibweise (wird in der UI angezeigt), weitere sind Aliase für
// die Erkennung des freien Rassen-Felds im Hundeprofil.

export interface BreedRange {
  minKg: number;
  maxKg: number;
}

interface BreedEntry {
  names: [string, ...string[]];
  range: BreedRange;
}

export const BREEDS: BreedEntry[] = [
  { names: ['Australian Shepherd', 'aus', 'australian shepherd'], range: { minKg: 18, maxKg: 27 } },
  { names: ['Labrador Retriever', 'labrador'], range: { minKg: 25, maxKg: 36 } },
  { names: ['Golden Retriever', 'golden'], range: { minKg: 25, maxKg: 34 } },
  { names: ['Deutscher Schäferhund', 'schäferhund', 'schaeferhund', 'gsd', 'deutscher schaeferhund'], range: { minKg: 22, maxKg: 40 } },
  { names: ['Border Collie', 'border'], range: { minKg: 14, maxKg: 20 } },
  { names: ['Jack Russell Terrier', 'jack russell'], range: { minKg: 5, maxKg: 8 } },
  { names: ['Beagle'], range: { minKg: 9, maxKg: 11 } },
  { names: ['Dackel', 'dachshund', 'teckel'], range: { minKg: 4, maxKg: 9 } },
  { names: ['Cocker Spaniel', 'cocker'], range: { minKg: 10, maxKg: 15 } },
  { names: ['Malteser', 'maltese'], range: { minKg: 2, maxKg: 4 } },
  { names: ['Zwergpudel', 'pudel', 'poodle', 'zwergpudel'], range: { minKg: 3, maxKg: 6 } },
  { names: ['Yorkshire Terrier', 'yorkie', 'yorkshire'], range: { minKg: 2, maxKg: 3 } },
  { names: ['Chihuahua'], range: { minKg: 1, maxKg: 3 } },
  { names: ['Dobermann', 'doberman'], range: { minKg: 32, maxKg: 45 } },
  { names: ['Rottweiler'], range: { minKg: 35, maxKg: 50 } },
  { names: ['Boxer'], range: { minKg: 25, maxKg: 32 } },
  { names: ['Berner Sennenhund', 'berner'], range: { minKg: 30, maxKg: 50 } },
  { names: ['Husky', 'siberian husky'], range: { minKg: 16, maxKg: 28 } },
  { names: ['Dogo Argentino'], range: { minKg: 36, maxKg: 45 } },
  { names: ['Mischling', 'mix', 'mischling'], range: { minKg: 8, maxKg: 30 } }
];

const LOOKUP = new Map<string, BreedRange>();
for (const entry of BREEDS) {
  for (const name of entry.names) {
    LOOKUP.set(name.toLowerCase(), entry.range);
  }
}

export function findBreedRange(rasse: string | null): BreedRange | null {
  if (!rasse) return null;
  return LOOKUP.get(rasse.trim().toLowerCase()) ?? null;
}

export type WeightStatus = 'norm' | 'under' | 'over';

export function classifyWeight(weightKg: number, range: BreedRange | null): WeightStatus | null {
  if (!range) return null;
  if (weightKg < range.minKg) return 'under';
  if (weightKg > range.maxKg) return 'over';
  return 'norm';
}

export const STATUS_LABEL: Record<WeightStatus, string> = {
  norm: 'Im Normbereich',
  under: 'Untergewicht',
  over: 'Übergewicht'
};

export function formatRange(range: BreedRange): string {
  return `${range.minKg}–${range.maxKg} kg`;
}
