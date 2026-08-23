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
