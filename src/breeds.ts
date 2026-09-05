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
  {
    names: [
      'Deutscher Schäferhund',
      'schäferhund',
      'schaeferhund',
      'gsd',
      'deutscher schaeferhund'
    ],
    range: { minKg: 22, maxKg: 40 }
  },
  { names: ['Border Collie', 'border'], range: { minKg: 14, maxKg: 20 } },
  { names: ['Jack Russell Terrier', 'jack russell'], range: { minKg: 5, maxKg: 8 } },
  { names: ['Beagle'], range: { minKg: 9, maxKg: 11 } },
  { names: ['Dackel', 'dachshund', 'teckel'], range: { minKg: 4, maxKg: 9 } },
  {
    names: ['Welsh Corgi', 'corgi', 'welsh corgi', 'corgi mix', 'cardigan'],
    range: { minKg: 10, maxKg: 15 }
  },
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
  {
    names: ['Französische Bulldogge', 'frenchie', 'french bulldog'],
    range: { minKg: 8, maxKg: 14 }
  },
  {
    names: ['Englische Bulldogge', 'bulldogge', 'english bulldog'],
    range: { minKg: 18, maxKg: 25 }
  },
  { names: ['Mops', 'pug'], range: { minKg: 6, maxKg: 8 } },
  { names: ['Havaneser', 'havanese'], range: { minKg: 4, maxKg: 7 } },
  { names: ['Shih Tzu'], range: { minKg: 4, maxKg: 8 } },
  { names: ['Cavalier King Charles Spaniel', 'cavalier'], range: { minKg: 5, maxKg: 8 } },
  { names: ['Zwergspitz', 'pomeranian'], range: { minKg: 1.5, maxKg: 3.5 } },
  { names: ['Bolonka Zwetna', 'bolonka'], range: { minKg: 3, maxKg: 4 } },
  { names: ['West Highland White Terrier', 'westie'], range: { minKg: 7, maxKg: 10 } },
  { names: ['Zwergschnauzer'], range: { minKg: 5, maxKg: 9 } },
  { names: ['Mittelschnauzer', 'schnauzer'], range: { minKg: 14, maxKg: 20 } },
  { names: ['Riesenschnauzer'], range: { minKg: 35, maxKg: 47 } },
  { names: ['Kleinpudel'], range: { minKg: 7, maxKg: 12 } },
  { names: ['Großpudel', 'königspudel', 'standard poodle'], range: { minKg: 20, maxKg: 32 } },
  { names: ['Sheltie', 'shetland sheepdog'], range: { minKg: 6, maxKg: 12 } },
  { names: ['Collie', 'langhaarcollie'], range: { minKg: 18, maxKg: 30 } },
  { names: ['Dalmatiner', 'dalmatian'], range: { minKg: 24, maxKg: 32 } },
  { names: ['Weimaraner'], range: { minKg: 25, maxKg: 40 } },
  { names: ['Magyar Vizsla', 'vizsla'], range: { minKg: 20, maxKg: 30 } },
  { names: ['Rhodesian Ridgeback', 'ridgeback'], range: { minKg: 32, maxKg: 41 } },
  { names: ['Hovawart'], range: { minKg: 25, maxKg: 40 } },
  { names: ['Leonberger'], range: { minKg: 45, maxKg: 77 } },
  { names: ['Neufundländer', 'newfoundland'], range: { minKg: 50, maxKg: 70 } },
  { names: ['Bernhardiner', 'st. bernard'], range: { minKg: 64, maxKg: 120 } },
  { names: ['Deutsche Dogge', 'great dane'], range: { minKg: 50, maxKg: 90 } },
  { names: ['Cane Corso'], range: { minKg: 40, maxKg: 50 } },
  { names: ['Malinois', 'belgischer schäferhund'], range: { minKg: 25, maxKg: 30 } },
  {
    names: ['Weißer Schweizer Schäferhund', 'weißer schäferhund'],
    range: { minKg: 25, maxKg: 40 }
  },
  { names: ['Australian Cattle Dog', 'cattle dog'], range: { minKg: 15, maxKg: 22 } },
  { names: ['Kooikerhondje', 'kooiker'], range: { minKg: 9, maxKg: 11 } },
  { names: ['Kleiner Münsterländer', 'münsterländer'], range: { minKg: 18, maxKg: 27 } },
  { names: ['Deutsch Drahthaar', 'drahthaar'], range: { minKg: 25, maxKg: 34 } },
  { names: ['Deutsch Kurzhaar', 'kurzhaar'], range: { minKg: 25, maxKg: 32 } },
  { names: ['Flat Coated Retriever', 'flat coated'], range: { minKg: 25, maxKg: 36 } },
  { names: ['Nova Scotia Duck Tolling Retriever', 'toller'], range: { minKg: 17, maxKg: 23 } },
  { names: ['Irish Setter', 'setter'], range: { minKg: 25, maxKg: 32 } },
  { names: ['English Springer Spaniel', 'springer spaniel'], range: { minKg: 18, maxKg: 25 } },
  { names: ['Staffordshire Bullterrier', 'staffie'], range: { minKg: 11, maxKg: 17 } },
  { names: ['American Staffordshire Terrier', 'amstaff'], range: { minKg: 25, maxKg: 32 } },
  { names: ['Bullterrier'], range: { minKg: 22, maxKg: 35 } },
  { names: ['Parson Russell Terrier', 'parson russell'], range: { minKg: 6, maxKg: 8 } },
  { names: ['Zwergpinscher'], range: { minKg: 4, maxKg: 6 } },
  { names: ['Airedale Terrier', 'airedale'], range: { minKg: 20, maxKg: 30 } },
  { names: ['Whippet'], range: { minKg: 9, maxKg: 14 } },
  { names: ['Greyhound'], range: { minKg: 27, maxKg: 40 } },
  { names: ['Galgo Español', 'galgo'], range: { minKg: 20, maxKg: 30 } },
  { names: ['Podenco'], range: { minKg: 8, maxKg: 25 } },
  { names: ['Shiba Inu', 'shiba'], range: { minKg: 8, maxKg: 11 } },
  { names: ['Akita', 'akita inu'], range: { minKg: 32, maxKg: 45 } },
  { names: ['Eurasier'], range: { minKg: 18, maxKg: 32 } },
  { names: ['Elo'], range: { minKg: 22, maxKg: 35 } },
  { names: ['Samojede', 'samoyed'], range: { minKg: 16, maxKg: 30 } },
  { names: ['Alaskan Malamute', 'malamute'], range: { minKg: 32, maxKg: 43 } },
  { names: ['Basset Hound', 'basset'], range: { minKg: 20, maxKg: 29 } },
  { names: ['Labradoodle'], range: { minKg: 20, maxKg: 30 } },
  { names: ['Goldendoodle'], range: { minKg: 20, maxKg: 30 } },
  { names: ['Cockapoo'], range: { minKg: 6, maxKg: 12 } },
  { names: ['Mischling', 'mix', 'mischling'], range: { minKg: 8, maxKg: 30 } }
];

// Kanonische Namen für die Auswahlliste im Hundeprofil, alphabetisch,
// „Mischling" am Ende.
export const BREED_NAMES: string[] = BREEDS.map((b) => b.names[0])
  .filter((n) => n !== 'Mischling')
  .sort((a, b) => a.localeCompare(b, 'de'))
  .concat('Mischling');

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

const kg = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 });

export function formatRange(range: BreedRange): string {
  return `${kg(range.minKg)}–${kg(range.maxKg)} kg`;
}
