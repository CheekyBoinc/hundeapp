import * as local from './localStore';
import { schedulePush } from './github';
import type { Command, DogProfile, Entry, StoolEntry, Vaccination, VetVisit, WeightEntry } from './types';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function translate(message: string): string {
  if (message.includes('Ein Kommando mit diesem Namen gibt es schon.')) {
    return 'Ein Kommando mit diesem Namen gibt es schon.';
  }
  return message;
}

function afterMutation() {
  schedulePush();
}

export async function fetchCommands(): Promise<Command[]> {
  return local.fetchCommands();
}

export async function saveCommand(cmd: {
  id?: string;
  dogId?: string | null;
  name: string;
  beschreibung?: string | null;
  tipp?: string | null;
}): Promise<Command> {
  const saved = local.saveCommand(cmd);
  afterMutation();
  return saved;
}

export async function deleteCommand(id: string): Promise<void> {
  local.deleteCommand(id);
  afterMutation();
}

export async function fetchEntries(): Promise<Entry[]> {
  return local.fetchEntries();
}

export interface EntryInput {
  id?: string;
  dogId?: string | null;
  date: string;
  ort: string | null;
  was_gemacht: string | null;
  uebungsaufgaben: string | null;
  tipps: string | null;
  erledigt: boolean;
}

export async function saveEntry(input: EntryInput, commandIds: string[]): Promise<void> {
  local.saveEntry(input, commandIds);
  afterMutation();
}

export async function toggleEntryDone(id: string, erledigt: boolean): Promise<void> {
  local.toggleEntryDone(id, erledigt);
  afterMutation();
}

export async function deleteEntry(id: string): Promise<void> {
  local.deleteEntry(id);
  afterMutation();
}

// ===== Hunde =====

export async function fetchDogs(): Promise<DogProfile[]> {
  return local.fetchDogs();
}

export async function saveDogProfile(dog: Omit<DogProfile, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<DogProfile> {
  const saved = local.saveDogProfile(dog);
  afterMutation();
  return saved;
}

export async function deleteDog(id: string): Promise<void> {
  local.deleteDog(id);
  afterMutation();
}

// ===== Gewicht =====

export async function fetchWeights(dogId: string): Promise<WeightEntry[]> {
  return local.fetchWeights(dogId);
}

export async function saveWeight(input: Omit<WeightEntry, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<WeightEntry> {
  const saved = local.saveWeight(input);
  afterMutation();
  return saved;
}

export async function deleteWeight(id: string): Promise<void> {
  local.deleteWeight(id);
  afterMutation();
}

// ===== Kot =====

export async function fetchStools(dogId: string): Promise<StoolEntry[]> {
  return local.fetchStools(dogId);
}

export async function saveStool(input: Omit<StoolEntry, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<StoolEntry> {
  const saved = local.saveStool(input);
  afterMutation();
  return saved;
}

export async function deleteStool(id: string): Promise<void> {
  local.deleteStool(id);
  afterMutation();
}

// ===== Tierarzt =====

export async function fetchVets(dogId: string): Promise<VetVisit[]> {
  return local.fetchVets(dogId);
}

export async function saveVet(input: Omit<VetVisit, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<VetVisit> {
  const saved = local.saveVet(input);
  afterMutation();
  return saved;
}

export async function deleteVet(id: string): Promise<void> {
  local.deleteVet(id);
  afterMutation();
}

// ===== Impfungen =====

export async function fetchVaccinations(dogId: string): Promise<Vaccination[]> {
  return local.fetchVaccinations(dogId);
}

export async function saveVaccination(input: Omit<Vaccination, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Vaccination> {
  const saved = local.saveVaccination(input);
  afterMutation();
  return saved;
}

export async function deleteVaccination(id: string): Promise<void> {
  local.deleteVaccination(id);
  afterMutation();
}
