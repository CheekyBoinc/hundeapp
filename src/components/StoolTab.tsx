import { useCallback, useEffect, useState } from 'react';
import { deleteStool, fetchStools } from '../api';
import { useLiveReload } from '../hooks';
import type { StoolEntry } from '../types';
import { formatDateShort } from '../utils';
import StoolModal from './StoolModal';
import DateStamp from './DateStamp';
import { IconButton, PencilIcon, TrashIcon } from './NavIcons';

interface Props {
  dogId: string;
}

function BristolLabel(n: number): string {
  const map: Record<number, string> = {
    1: 'hart & trocken',
    2: 'fest',
    3: 'normal geformt',
    4: 'normal weich',
    5: 'weich',
    6: 'breiig',
    7: 'wässrig'
  };
  return map[n] ?? '–';
}

export default function StoolTab({ dogId }: Props) {
  const [entries, setEntries] = useState<StoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StoolEntry | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await fetchStools(dogId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveReload(load);

  async function handleDelete(e: StoolEntry) {
    if (!window.confirm(`Kot-Eintrag vom ${formatDateShort(e.date)} wirklich löschen?`)) return;
    try {
      await deleteStool(e.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <div>
      <div className="mb-3">
        <button className="btn-primary" onClick={() => setAdding(true)}>
          Kot-Eintrag hinzufügen
        </button>
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
        <p className="py-8 text-center text-stone-500">Wird geladen…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <p className="font-semibold text-stone-700">Keine Kot-Einträge</p>
          <p className="mt-1 text-sm text-stone-500">
            Trage Beobachtungen ein, um den Verdauungsverlauf im Blick zu behalten.
          </p>
          <button className="btn-primary mt-4" onClick={() => setAdding(true)}>
            Kot-Eintrag hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {[...entries].reverse().map((e) => {
            const title = e.consistency > 0 ? BristolLabel(e.consistency) : 'Kot-Eintrag';
            return (
              <article
                key={e.id}
                className={`flex gap-3 rounded-2xl border bg-white p-3.5 shadow-sm ${
                  e.abnormal ? 'border-red-200' : 'border-stone-200'
                }`}
              >
                <DateStamp date={e.date} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-base font-bold leading-tight tracking-tight">
                      {title.charAt(0).toUpperCase() + title.slice(1)}
                    </p>
                    <span className="-mr-2 -mt-2 flex shrink-0 items-center gap-1">
                      <IconButton label="Bearbeiten" onClick={() => setEditing(e)}>
                        <PencilIcon className="h-5 w-5" />
                      </IconButton>
                      <IconButton label="Löschen" danger onClick={() => handleDelete(e)}>
                        <TrashIcon className="h-5 w-5" />
                      </IconButton>
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {e.abnormal && <span className="chip bg-red-100 text-red-800">Auffällig</span>}
                    {e.consistency > 0 && (
                      <span className="chip bg-stone-100 text-stone-700">
                        Bristol {e.consistency}
                      </span>
                    )}
                    {e.color && (
                      <span className="chip bg-stone-100 text-stone-700">Farbe: {e.color}</span>
                    )}
                    {e.amount && (
                      <span className="chip bg-stone-100 text-stone-700">Menge: {e.amount}</span>
                    )}
                  </div>
                  {e.note && <p className="prose-serif mt-2 text-sm text-stone-700">{e.note}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(adding || editing) && (
        <StoolModal
          dogId={dogId}
          entry={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={load}
        />
      )}
    </div>
  );
}
