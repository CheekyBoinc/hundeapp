import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCommands, fetchDogs, fetchEntries, toggleEntryDone } from '../api';
import { useLiveReload } from '../hooks';
import type { Command, DogProfile, Entry } from '../types';
import { formatDate, preview } from '../utils';
import EntryDetail from './EntryDetail';
import EntryModal from './EntryModal';

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dogFilter, setDogFilter] = useState('all');
  const [commandFilter, setCommandFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [detailId, setDetailId] = useState<Entry | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, c, d] = await Promise.all([fetchEntries(), fetchCommands(), fetchDogs()]);
      setEntries(e);
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
    return entries.filter((e) => {
      if (dogFilter === 'none' && e.dogId !== null) return false;
      if (dogFilter !== 'all' && dogFilter !== 'none' && e.dogId !== dogFilter) return false;
      if (commandFilter && !e.commands.some((c) => c.id === commandFilter)) return false;
      if (!q) return true;
      const hay = [
        e.date,
        e.ort,
        e.was_gemacht,
        e.uebungsaufgaben,
        e.tipps,
        ...e.commands.map((c) => c.name)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, search, dogFilter, commandFilter]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input
          className="input"
          placeholder="Suchen…"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <button className="btn-primary shrink-0" onClick={() => setCreating(true)}>
          Neuer Eintrag
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
          value={commandFilter}
          onChange={(ev) => setCommandFilter(ev.target.value)}
        >
          <option value="">Alle Kommandos</option>
          {commands.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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
          <p className="font-semibold text-stone-700">Keine Einträge gefunden</p>
          <p className="mt-1 text-sm text-stone-500">
            Lege den ersten Eintrag an, z. B. nach dem nächsten Besuch in der Hundeschule.
          </p>
          <button className="btn-primary mt-4" onClick={() => setCreating(true)}>
            Neuer Eintrag
          </button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-3 py-2.5 font-semibold">Datum</th>
                  <th className="px-3 py-2.5 font-semibold">Ort</th>
                  <th className="px-3 py-2.5 font-semibold">Kommandos</th>
                  <th className="px-3 py-2.5 font-semibold">Was gemacht</th>
                  <th className="px-3 py-2.5 font-semibold">Erledigt</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className={`cursor-pointer border-b border-stone-100 align-top last:border-0 hover:bg-orange-50/60 ${
                      e.erledigt ? 'opacity-60' : ''
                    }`}
                    onClick={() => setDetailId(e)}
                  >
                    <td className="whitespace-nowrap px-3 py-3 font-medium">{formatDate(e.date)}</td>
                    <td className="px-3 py-3">{e.ort ?? '–'}</td>
                    <td className="px-3 py-3">
                      <div className="flex max-w-44 flex-wrap gap-1">
                        {e.commands.length === 0 && <span className="text-stone-400">–</span>}
                        {e.commands.map((c) => (
                          <span key={c.id} className="chip bg-orange-100 text-orange-900">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="max-w-72 px-3 py-3">
                      <p className="truncate text-stone-600">{preview(e.was_gemacht)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-orange-500"
                        checked={e.erledigt}
                        onClick={(ev) => ev.stopPropagation()}
                        onChange={(ev) => toggleEntryDone(e.id, ev.target.checked).then(load)}
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-stone-400">
                      Details
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2.5 md:hidden">
            {filtered.map((e) => (
              <div
                key={e.id}
                className={`cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${
                  e.erledigt ? 'opacity-70' : ''
                }`}
                onClick={() => setDetailId(e)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-semibold">{formatDate(e.date)}</span>
                  {e.erledigt && (
                    <span className="chip bg-emerald-100 text-emerald-800">Erledigt</span>
                  )}
                </div>
                {e.ort && (
                  <div className="mb-2">
                    <span className="badge">Ort: {e.ort}</span>
                  </div>
                )}
                {e.commands.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {e.commands.map((c) => (
                      <span key={c.id} className="chip bg-orange-100 text-orange-900">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
                {e.was_gemacht && (
                  <p className="line-clamp-2 text-sm text-stone-600">{e.was_gemacht}</p>
                )}
                <p className="mt-2 text-xs font-medium text-stone-400">Antippen für Details</p>
              </div>
            ))}
          </div>
        </>
      )}

      {detailId && (
        <EntryDetail
          entry={detailId}
          onClose={() => setDetailId(null)}
          onChanged={load}
          onEdit={() => {
            setEditing(detailId);
            setDetailId(null);
          }}
        />
      )}

      {(creating || editing) && (
        <EntryModal
          entry={editing}
          commands={commands}
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
