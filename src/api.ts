import * as local from './localStore';
import { schedulePush } from './github';
import type { Command, Entry } from './types';

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
