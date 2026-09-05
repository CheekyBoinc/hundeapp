import type { Entry } from './types';

export interface CommandMastery {
  count: number;
  lastDate: string | null;
}

// Wie oft und wann ein Kommando in den Trainingseinträgen auftaucht.
export function masteryStats(entries: Entry[]): Map<string, CommandMastery> {
  const stats = new Map<string, CommandMastery>();
  for (const e of entries) {
    for (const c of e.commands) {
      const cur = stats.get(c.id) ?? { count: 0, lastDate: null };
      cur.count += 1;
      if (e.date > (cur.lastDate ?? '')) cur.lastDate = e.date;
      stats.set(c.id, cur);
    }
  }
  return stats;
}

export function daysSince(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = (today.getTime() - d.getTime()) / 86400000;
  return Number.isFinite(diff) ? Math.round(diff) : null;
}

// Übungsstand in vier Stufen, aus Häufigkeit und Aktualität abgeleitet.
// 0 = noch nie geübt, 1 = angefangen, 2 = in Übung, 3 = sitzt.
// Liegt die letzte Übung länger als `idleDays` zurück, fällt die Stufe um eins,
// damit „sitzt“ nicht ewig stehen bleibt.
export type MasteryLevel = 0 | 1 | 2 | 3;

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  0: 'Neu',
  1: 'Angefangen',
  2: 'In Übung',
  3: 'Sitzt'
};

export function masteryLevel(
  stats: CommandMastery | undefined,
  idleDays = 30,
  today = new Date()
): MasteryLevel {
  if (!stats || stats.count === 0) return 0;
  let level: MasteryLevel = stats.count >= 6 ? 3 : stats.count >= 3 ? 2 : 1;
  const last = stats.lastDate ? new Date(`${stats.lastDate}T00:00:00`) : null;
  if (last && !Number.isNaN(last.getTime())) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((start.getTime() - last.getTime()) / 86400000);
    if (days > idleDays && level > 1) level = (level - 1) as MasteryLevel;
  }
  return level;
}
