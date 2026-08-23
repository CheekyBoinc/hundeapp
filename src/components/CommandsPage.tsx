import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteCommand, fetchCommands, fetchDogs } from '../api';
import { useLiveReload } from '../hooks';
import type { Command, DogProfile } from '../types';
import CommandModal from './CommandModal';

export default function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dogFilter, setDogFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Command | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([fetchCommands(), fetchDogs()]);
      setCommands(c);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commands.filter((c) => {
      if (dogFilter === 'none' && c.dogId !== null) return false;
      if (dogFilter !== 'all' && dogFilter !== 'none' && c.dogId !== dogFilter) return false;
      if (q && !`${c.name} ${c.beschreibung ?? ''} ${c.tipp ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [commands, search, dogFilter]);

  async function handleDelete(c: Command) {
    if (!window.confirm(`Kommando „${c.name}" wirklich löschen?`)) return;
    try {
      await deleteCommand(c.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

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
        <div className="mb-4">
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
          <p className="font-semibold text-stone-700">Noch keine Kommandos</p>
          <p className="mt-1 text-sm text-stone-500">
            Lege Kommandos mit genauer Bezeichnung an, z. B. „Sitz“ oder „Bei Fuß“.
          </p>
          <button className="btn-primary mt-4" onClick={() => setCreating(true)}>
            Neues Kommando
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold">{c.name}</h3>
                  {c.dogId && (
                    <span className="chip bg-stone-100 text-stone-600">
                      {dogs.find((d) => d.id === c.dogId)?.name ?? 'Hund'}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="text-xs font-medium text-stone-400 hover:text-orange-600"
                    onClick={() => setEditing(c)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="text-xs font-medium text-stone-400 hover:text-red-600"
                    onClick={() => handleDelete(c)}
                  >
                    Löschen
                  </button>
                </div>
              </div>
              {c.beschreibung && <p className="text-sm text-stone-700">{c.beschreibung}</p>}
              {c.tipp && (
                <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-900">
                  <span className="font-semibold">Tipp: </span>
                  {c.tipp}
                </p>
              )}
            </div>
          ))}
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
