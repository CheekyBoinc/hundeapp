import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEntries, fetchDogs } from '../api';
import { useLiveReload } from '../hooks';
import type { DogProfile, Entry } from '../types';
import { formatDateShort } from '../utils';
import EntryDetail from './EntryDetail';
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
  inMonth: boolean;
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
      dayOfMonth: d,
      inMonth: true
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<Entry | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, d] = await Promise.all([fetchEntries(), fetchDogs()]);
      setEntries(e);
      setDogs(d);
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

  const dayEntries = selectedDate ? (entriesByDate.get(selectedDate) ?? []) : [];
  const dayLabel = selectedDate ? formatDateShort(selectedDate) : '';

  const todayString = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </h2>
        <div className="flex items-center gap-1">
          <button
            className="btn-secondary px-2.5 py-1.5 text-sm"
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="Vorheriger Monat"
          >
            ‹
          </button>
          <button
            className="btn-secondary px-2.5 py-1.5 text-sm"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Heute
          </button>
          <button
            className="btn-secondary px-2.5 py-1.5 text-sm"
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
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-accent/60'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

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
                        onClick={() => setDetail(e)}
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
                              <span key={c.id} className="chip bg-accent-soft text-accent-dark">
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
              onClose={() => setDetail(null)}
              onChanged={load}
              onEdit={() => {
                setDetail(null);
                setSelectedDate(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
