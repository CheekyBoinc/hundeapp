import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteCommand, fetchCommands, fetchDogs, fetchEntries } from '../api';
import { useLiveReload } from '../hooks';
import { masteryStats, daysSince, masteryLevel, MASTERY_LABEL } from '../mastery';
import type { Command, DogProfile, Entry } from '../types';
import { formatDateShort } from '../utils';
import CommandModal from './CommandModal';

const IDLE_DAYS = 30;

// Drei Punkte für den Übungsstand: 0 = Neu … 3 = Sitzt.
function MasteryDots({ level }: { level: 0 | 1 | 2 | 3 }) {
  const tone =
    level === 3
      ? 'bg-emerald-100 text-emerald-800'
      : level === 0
        ? 'bg-stone-100 text-stone-500'
        : 'bg-accent-soft text-accent-dark';
  return (
    <span className={`chip inline-flex items-center gap-1.5 ${tone}`}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 w-1.5 rounded-full ${n <= level ? 'bg-current' : 'bg-current opacity-25'}`}
          />
        ))}
      </span>
      {MASTERY_LABEL[level]}
    </span>
  );
}

export default function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dogFilter, setDogFilter] = useState('all');
  const [idleFilter, setIdleFilter] = useState<'all' | 'idle'>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Command | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, d, e] = await Promise.all([fetchCommands(), fetchDogs(), fetchEntries()]);
      setCommands(c);
      setDogs(d);
      setEntries(e);
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

  const stats = useMemo(() => masteryStats(entries), [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commands.filter((c) => {
      if (dogFilter === 'none' && c.dogId !== null) return false;
      if (dogFilter !== 'all' && dogFilter !== 'none' && c.dogId !== dogFilter) return false;
      if (q && !`${c.name} ${c.beschreibung ?? ''} ${c.tipp ?? ''}`.toLowerCase().includes(q))
        return false;
      if (idleFilter === 'idle') {
        const last = stats.get(c.id)?.lastDate ?? null;
        const days = last ? daysSince(last) : null;
        // Keine Übung (days === null) gilt als lange nicht geübt; sonst Schwelle.
        if (days !== null && days < IDLE_DAYS) return false;
      }
      return true;
    });
  }, [commands, search, dogFilter, idleFilter, stats]);

  async function handleDelete(c: Command) {
    if (!window.confirm(`Kommando „${c.name}" wirklich löschen?`)) return;
    try {
      await deleteCommand(c.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  const idleCount = useMemo(
    () =>
      commands.filter((c) => {
        const last = stats.get(c.id)?.lastDate ?? null;
        const days = last ? daysSince(last) : null;
        return days === null || days >= IDLE_DAYS;
      }).length,
    [commands, stats]
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input
          className="input"
          placeholder="Kommando suchen…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <button className="btn-primary shrink-0" onClick={() => setCreating(true)}>
          Neues Kommando
        </button>
      </div>

      {dogs.length > 0 && (
        <div className="mb-3">
          <select
            className="input"
            value={dogFilter}
            onChange={(ev) => setDogFilter(ev.target.value)}
          >
            <option value="all">Alle Hunde</option>
            <option value="none">Ohne Hund</option>
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <select
          className="input"
          value={idleFilter}
          onChange={(ev) => setIdleFilter(ev.target.value as 'all' | 'idle')}
        >
          <option value="all">Alle Übungsstände</option>
          <option value="idle">Lange nicht geübt ({idleCount})</option>
        </select>
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
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="font-semibold text-stone-700">Noch keine Kommandos gefunden</p>
          <p className="mt-1 text-sm text-stone-500">
            {idleFilter === 'idle'
              ? 'Alle Kommandos wurden zuletzt geübt – nichts liegt brach.'
              : 'Lege Kommandos mit genauer Bezeichnung an, z. B. „Sitz“ oder „Bei Fuß“.'}
          </p>
          {idleFilter !== 'idle' && (
            <button className="btn-primary mt-4" onClick={() => setCreating(true)}>
              Neues Kommando
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => {
            const s = stats.get(c.id);
            const days = s?.lastDate ? daysSince(s.lastDate) : null;
            const idle = days === null || (days !== null && days >= IDLE_DAYS);
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold">{c.name}</h3>
                    <div className="mt-1 mb-1.5 flex flex-wrap items-center gap-1.5">
                      <MasteryDots level={masteryLevel(s)} />
                      {c.dogId && (
                        <span className="chip bg-stone-100 text-stone-600">
                          {dogs.find((d) => d.id === c.dogId)?.name ?? 'Hund'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="tap-target text-xs font-medium text-stone-400 hover:text-accent-strong"
                      onClick={() => setEditing(c)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="tap-target text-xs font-medium text-stone-400 hover:text-red-600"
                      onClick={() => handleDelete(c)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                {s && s.count > 0 ? (
                  <p className="text-xs text-stone-500">
                    {s.count}× geübt
                    {s.lastDate && ` · zuletzt ${formatDateShort(s.lastDate)}`}
                    {idle && days !== null && (
                      <span className="ml-1.5 chip bg-amber-100 text-amber-800">
                        {days} Tage her
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-stone-500">
                    Noch nie geübt
                    {idle && (
                      <span className="ml-1.5 chip bg-amber-100 text-amber-800">
                        nicht trainiert
                      </span>
                    )}
                  </p>
                )}
                {c.beschreibung && (
                  <p className="prose-serif text-sm text-stone-700">{c.beschreibung}</p>
                )}
                {c.tipp && (
                  <p className="prose-serif mt-2 rounded-xl bg-accent-tint px-3 py-2 text-sm text-accent-dark">
                    <span className="font-semibold">Tipp: </span>
                    {c.tipp}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <CommandModal
          command={editing}
          dogs={dogs}
          defaultDogId={dogFilter !== 'all' && dogFilter !== 'none' ? dogFilter : null}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onChanged={load}
        />
      )}
    </div>
  );
}
