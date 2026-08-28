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
