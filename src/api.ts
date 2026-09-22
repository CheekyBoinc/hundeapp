import * as local from './localStore';
import { maybeRequestReview } from './review';
import { schedulePush } from './sync';
import type { Command, DogProfile, Entry } from './types';

function afterMutation() {
  schedulePush();
}

// Hüllt eine lokale Mutation ein und stößt danach den Sync an.
function withSync<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult
): (...args: TArgs) => Promise<TResult> {
  return async (...args) => {
    const result = fn(...args);
    afterMutation();
    return result;
  };
}

export async function fetchCommands(): Promise<Command[]> {
  return local.fetchCommands();
}

export const saveCommand = withSync(local.saveCommand);
export const deleteCommand = withSync(local.deleteCommand);

export async function fetchEntries(): Promise<Entry[]> {
  return local.fetchEntries();
}

const saveEntryWithSync = withSync(local.saveEntry);

// Nach einem gespeicherten Eintrag kann der Bewertungsdialog kommen; die Regeln
// stehen in review.ts.
export async function saveEntry(
  input: Parameters<typeof local.saveEntry>[0],
  commandIds: string[]
): Promise<void> {
  await saveEntryWithSync(input, commandIds);
  void maybeRequestReview();
}
export const toggleEntryDone = withSync(local.toggleEntryDone);
export const deleteEntry = withSync(local.deleteEntry);

// ===== Hunde =====

export async function fetchDogs(): Promise<DogProfile[]> {
  return local.fetchDogs();
}

export const saveDogProfile = withSync(local.saveDogProfile);
export const deleteDog = withSync(local.deleteDog);

// ===== Hundezugehörige Sammlungen =====

export const fetchWeights = async (dogId: string) => local.fetchWeights(dogId);
export const saveWeight = withSync(local.saveWeight);
export const deleteWeight = withSync(local.deleteWeight);

export const fetchStools = async (dogId: string) => local.fetchStools(dogId);
export const saveStool = withSync(local.saveStool);
export const deleteStool = withSync(local.deleteStool);

export const fetchVets = async (dogId: string) => local.fetchVets(dogId);
export const saveVet = withSync(local.saveVet);
export const deleteVet = withSync(local.deleteVet);

export const fetchVaccinations = async (dogId: string) => local.fetchVaccinations(dogId);
export const saveVaccination = withSync(local.saveVaccination);
export const deleteVaccination = withSync(local.deleteVaccination);

// ===== Übersicht (alle Hunde) und Demodaten =====

export const fetchAllVaccinations = async () => local.fetchAllVaccinations();
export const fetchAllVets = async () => local.fetchAllVets();
export const hasOnlyDemoData = async () => local.hasOnlyDemoData();
export const removeDemoData = withSync(local.removeDemoData);
