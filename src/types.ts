export interface Command {
  id: string;
  dogId: string | null;
  name: string;
  beschreibung: string | null;
  tipp: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Entry {
  id: string;
  dogId: string | null;
  date: string;
  ort: string | null;
  was_gemacht: string | null;
  uebungsaufgaben: string | null;
  tipps: string | null;
  erledigt: boolean;
  created_at: string;
  updated_at?: string;
  commands: Command[];
}

// Grenzen für das Hundefoto (JPEG als Data-URL); Prüfung und Erzeugung
// arbeiten mit denselben Werten.
export const PHOTO_PREFIX = 'data:image/jpeg;base64,';
export const PHOTO_MAX_CHARS = 100000;

export interface DogProfile {
  id: string;
  name: string;
  photo?: string | null;
  rasse: string | null;
  geburtsdatum: string | null;
  geschlecht: 'w' | 'm' | null;
  chipNr: string | null;
  registerNr: string | null;
  tierarzt: string | null;
  allergien: string | null;
  besonderheiten: string | null;
  created_at: string;
  updated_at?: string;
}

export interface WeightEntry {
  id: string;
  dogId: string;
  date: string;
  weightKg: number;
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export interface StoolEntry {
  id: string;
  dogId: string;
  date: string;
  consistency: number;
  color: string | null;
  amount: 'wenig' | 'normal' | 'viel' | null;
  abnormal: boolean;
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export interface VetVisit {
  id: string;
  dogId: string;
  date: string;
  clinic: string | null;
  reason: string | null;
  diagnosis: string | null;
  treatment: string | null;
  medication: string | null;
  followUp: string | null;
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export type VaccinationKind = 'impfung' | 'entwurmung' | 'parasiten' | 'sonstiges';

export interface Vaccination {
  id: string;
  dogId: string;
  date: string;
  name: string;
  kind?: VaccinationKind;
  nextDue: string | null;
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AppState {
  commands: Command[];
  entries: Entry[];
  dogs: DogProfile[];
  weight: WeightEntry[];
  stool: StoolEntry[];
  vet: VetVisit[];
  vaccinations: Vaccination[];
  deleted: {
    commands: string[];
    entries: string[];
    dogs: string[];
    weight: string[];
    stool: string[];
    vet: string[];
    vaccinations: string[];
  };
}
