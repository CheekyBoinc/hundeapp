import type { DogProfile, Vaccination, VetVisit } from './types';

export interface UpcomingItem {
  id: string;
  date: string; // YYYY-MM-DD
  kind: 'impfung' | 'tierarzt';
  title: string;
  dogName: string | null;
  daysLeft: number; // negativ = überfällig
}

function toDay(date: string): number {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? NaN : Math.floor(d.getTime() / 86400000);
}

// Fällige Impfungen und Tierarzt-Folgetermine, überfällige zuerst, dann nach
// Datum. Zeitfenster: überfällig bis `horizonDays` Tage voraus.
export function upcomingItems(
  vaccinations: Vaccination[],
  vets: VetVisit[],
  dogs: DogProfile[],
  today: string,
  horizonDays = 60
): UpcomingItem[] {
  const todayDay = toDay(today);
  const dogName = (id: string) => dogs.find((d) => d.id === id)?.name ?? null;
  const out: UpcomingItem[] = [];

  for (const v of vaccinations) {
    if (!v.nextDue) continue;
    const days = toDay(v.nextDue) - todayDay;
    if (Number.isNaN(days) || days > horizonDays) continue;
    out.push({
      id: `vax-${v.id}`,
      date: v.nextDue,
      kind: 'impfung',
      title: `Impfung: ${v.name}`,
      dogName: dogName(v.dogId),
      daysLeft: days
    });
  }
  for (const v of vets) {
    if (!v.followUp) continue;
    const days = toDay(v.followUp) - todayDay;
    if (Number.isNaN(days) || days > horizonDays) continue;
    out.push({
      id: `vet-${v.id}`,
      date: v.followUp,
      kind: 'tierarzt',
      title: v.reason ? `Tierarzt: ${v.reason}` : 'Tierarzt-Folgetermin',
      dogName: dogName(v.dogId),
      daysLeft: days
    });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function formatDaysLeft(days: number): string {
  if (days < -1) return `seit ${-days} Tagen überfällig`;
  if (days === -1) return 'seit gestern überfällig';
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  return `in ${days} Tagen`;
}
