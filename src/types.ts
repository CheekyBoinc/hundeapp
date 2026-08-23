export interface Command {
  id: string;
  name: string;
  beschreibung: string | null;
  tipp: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Entry {
  id: string;
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

export interface DogProfile {
  id: string;
  name: string;
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

export interface Vaccination {
  id: string;
  dogId: string;
  date: string;
  name: string;
  nextDue: string | null;
  note: string | null;
  created_at: string;
  updated_at?: string;
}
