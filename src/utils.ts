import type { VaccinationKind } from './types';

export function todayLocal(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function preview(text: string | null | undefined, max = 90): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

export function formatDateShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatKg(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' kg';
}

// Alter als lesbarer Text: "2 Jahre 3 Monate", "7 Monate", "3 Wochen".
export function formatAge(geburtsdatum: string | null, today = new Date()): string | null {
  if (!geburtsdatum) return null;
  const birth = new Date(`${geburtsdatum}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > today) return null;
  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 1) {
    const weeks = Math.floor((today.getTime() - birth.getTime()) / (7 * 86400000));
    return weeks <= 1 ? '1 Woche' : `${weeks} Wochen`;
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years === 1 ? '1 Jahr' : `${years} Jahre`;
  const m = rest === 1 ? '1 Monat' : `${rest} Monate`;
  if (years === 0) return m;
  if (rest === 0) return y;
  return `${y} ${m}`;
}

// Heute um Mitternacht (lokale Zeit), für Tagesvergleiche.
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Bausteine für die Datumsmarke: "Sa", "29", "Aug".
export function dateParts(date: string): { weekday: string; day: string; month: string } {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { weekday: '', day: '–', month: '' };
  return {
    weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''),
    day: String(d.getDate()),
    month: d.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')
  };
}

// Monate addieren, ohne über das Monatsende zu rutschen: 31.01. + 1 Monat ist
// der 28.02., im Schaltjahr der 29.02.
export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const ziel = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const letzterTag = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate();
  ziel.setDate(Math.min(d.getDate(), letzterTag));
  const off = ziel.getTimezoneOffset();
  return new Date(ziel.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Die vier Arten der Vorsorge, in der Reihenfolge der Auswahl.
export const VACCINATION_KINDS: { value: VaccinationKind; label: string }[] = [
  { value: 'impfung', label: 'Impfung' },
  { value: 'entwurmung', label: 'Entwurmung' },
  { value: 'parasiten', label: 'Parasitenschutz' },
  { value: 'sonstiges', label: 'Sonstiges' }
];

// Fehlt die Art, gilt der Eintrag als Impfung (so sind alte Einträge gemeint).
export function vaccinationLabel(kind?: VaccinationKind): string {
  return VACCINATION_KINDS.find((k) => k.value === (kind ?? 'impfung'))?.label ?? 'Impfung';
}

// "06.09." – Tag und Monat ohne Jahr, für kompakte Listen.
export function formatDayMonth(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
