import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAllVaccinations, fetchAllVets, fetchCommands, fetchDogs, fetchEntries } from '../api';
import { formatDaysLeft, upcomingItems } from '../upcoming';
import { todayLocal } from '../utils';
import { ChevronRightIcon } from './NavIcons';
import { PawIcon } from './PawIcon';
import { useLiveReload } from '../hooks';
import type { Command, DogProfile, Entry, Vaccination, VetVisit } from '../types';
import { formatDateShort } from '../utils';
import EntryDetail from './EntryDetail';
import EntryModal from './EntryModal';
import Modal from './Modal';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember'
];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

type DayCell = {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
};

type GridCell = DayCell | null;

function buildMonthGrid(monthDate: Date): GridCell[] {
  const first = startOfMonth(monthDate);
  // Montag-basierte Woche: Offset = (Wochentag + 6) % 7
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: GridCell[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(first.getFullYear(), first.getMonth(), d);
    cells.push({
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayOfMonth: d
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [vets, setVets] = useState<VetVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, d, c, vax, vt] = await Promise.all([
        fetchEntries(),
        fetchDogs(),
        fetchCommands(),
        fetchAllVaccinations(),
        fetchAllVets()
      ]);
      setEntries(e);
      setDogs(d);
      setCommands(c);
      setVaccinations(vax);
      setVets(vt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveReload(load);

  const cells = useMemo(() => buildMonthGrid(month), [month]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [entries]);

  const byDog = useMemo(() => new Map(dogs.map((d) => [d.id, d.name])), [dogs]);

  // Aus der aktuellen Liste ableiten, damit die Detailansicht nach einem
  // Reload (z. B. Erledigt-Umschalten) nicht auf einem veralteten Objekt sitzt.
  const detail = useMemo(
    () => (detailId ? (entries.find((e) => e.id === detailId) ?? null) : null),
    [entries, detailId]
  );

  const dayEntries = selectedDate ? (entriesByDate.get(selectedDate) ?? []) : [];
  const dayLabel = selectedDate ? formatDateShort(selectedDate) : '';

  const todayString = todayLocal();

  const upcoming = useMemo(
    () => upcomingItems(vaccinations, vets, dogs, todayString),
    [vaccinations, vets, dogs, todayString]
  );

  // Einträge des angezeigten Monats, neueste zuerst (fetchEntries sortiert so).
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(monthPrefix)),
    [entries, monthPrefix]
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </h2>
        <div className="flex items-center gap-1">
          <button
            className="btn-secondary min-w-11 px-3 py-1.5 text-sm"
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="Vorheriger Monat"
          >
            ‹
          </button>
          <button
            className="btn-secondary min-w-11 px-3 py-1.5 text-sm"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Heute
          </button>
          <button
            className="btn-secondary min-w-11 px-3 py-1.5 text-sm"
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Nächster Monat"
          >
            ›
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button className="shrink-0 font-semibold underline" onClick={load}>
            Erneut versuchen
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-stone-500">Wird geladen…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-stone-500">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-1">
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, i) => {
                if (!cell) return <div key={`ph-${i}`} />;
                const cellEntries = entriesByDate.get(cell.date) ?? [];
                const hasEntries = cellEntries.length > 0;
                const isToday = cell.date === todayString;
                return (
                  <button
                    key={cell.date}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                      isToday
                        ? 'bg-accent text-white'
                        : hasEntries
                          ? 'bg-accent-soft text-accent-dark hover:bg-accent-soft/70'
                          : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span>{cell.dayOfMonth}</span>
                    {hasEntries && (
                      <PawIcon
                        className={`mt-0.5 h-2.5 w-2.5 ${isToday ? 'text-white' : 'text-accent'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {upcoming.length > 0 && (
            <section className="mt-4">
              <h3 className="label">Demnächst</h3>
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                {upcoming.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 border-b border-stone-100 px-4 py-2.5 last:border-0"
                  >
                    <span
                      className={`chip shrink-0 ${
                        u.daysLeft < 0
                          ? 'bg-red-100 text-red-800'
                          : u.daysLeft <= 7
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {formatDaysLeft(u.daysLeft)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stone-800">
                        {u.title}
                      </span>
                      <span className="block text-xs text-stone-500">
                        {formatDateShort(u.date)}
                        {u.dogName && ` · ${u.dogName}`}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4">
            <h3 className="label">
              Einträge im {MONTHS[month.getMonth()]}
              {monthEntries.length > 0 && ` (${monthEntries.length})`}
            </h3>
            {monthEntries.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-500">
                Keine Einträge in diesem Monat. Tage mit Einträgen werden im Kalender markiert.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                {monthEntries.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setDetailId(e.id)}
                    className="flex w-full items-center gap-3 border-b border-stone-100 px-4 py-2.5 text-left last:border-0 hover:bg-accent-tint/60"
                  >
                    <span className="w-20 shrink-0 text-sm font-semibold">
                      {formatDateShort(e.date).slice(0, 6)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-stone-800">
                        {e.ort ?? 'Ohne Ort'}
                        {e.dogId && byDog.has(e.dogId) && ` · ${byDog.get(e.dogId)}`}
                      </span>
                      {e.commands.length > 0 && (
                        <span className="block truncate text-xs text-stone-500">
                          {e.commands.map((c) => c.name).join(', ')}
                        </span>
                      )}
                    </span>
                    {e.erledigt && (
                      <span className="chip shrink-0 bg-emerald-100 text-emerald-800">
                        Erledigt
                      </span>
                    )}
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedDate && (
            <div className="mt-3">
              <Modal title={dayLabel} onClose={() => setSelectedDate(null)}>
                {dayEntries.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-500">
                    Keine Einträge an diesem Tag.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayEntries.map((e) => (
                      <div
                        key={e.id}
                        className="cursor-pointer rounded-xl border border-stone-200 p-3 text-sm hover:border-accent-mid"
                        onClick={() => setDetailId(e.id)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">
                            {e.ort ?? 'Ohne Ort'}
                            {e.dogId && byDog.has(e.dogId) && (
                              <span className="ml-2 chip bg-stone-100 text-stone-600">
                                {byDog.get(e.dogId)}
                              </span>
                            )}
                          </span>
                          {e.erledigt && (
                            <span className="chip bg-emerald-100 text-emerald-800">Erledigt</span>
                          )}
                        </div>
                        {e.commands.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {e.commands.map((c) => (
                              <span key={c.id} className="stamp">
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {e.was_gemacht && (
                          <p className="prose-serif mt-1 line-clamp-2 text-xs text-stone-600">
                            {e.was_gemacht}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Modal>
            </div>
          )}

          {detail && (
            <EntryDetail
              entry={detail}
              onClose={() => setDetailId(null)}
              onChanged={load}
              onEdit={() => {
                setEditing(detail);
                setDetailId(null);
              }}
            />
          )}

          {editing && (
            <EntryModal
              entry={editing}
              commands={commands}
              dogs={dogs}
              onClose={() => setEditing(null)}
              onChanged={load}
            />
          )}
        </>
      )}
    </div>
  );
}
