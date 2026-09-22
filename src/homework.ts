import type { Entry } from './types';

// Die jüngste Stunde mit offenen Übungsaufgaben. Einträge, die diese Funktion
// zurückgibt, tragen selbst Übungsaufgaben — Übungseinträge aus dem Dialog
// „Heute geübt" haben keine und verdrängen die Karte daher nie.
export function currentHomework(
  entries: Entry[],
  dogId: string | null,
  today: string
): Entry | null {
  const offen = entries.filter(
    (entry) =>
      entry.date <= today &&
      entry.erledigt === false &&
      (entry.uebungsaufgaben ?? '').trim().length > 0 &&
      (dogId === null || entry.dogId === dogId)
  );
  if (offen.length === 0) return null;
  const sortiert = [...offen].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });
  return sortiert[0] ?? null;
}
