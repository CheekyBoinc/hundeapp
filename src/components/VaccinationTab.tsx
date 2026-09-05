import { useCallback, useEffect, useState } from 'react';
import { deleteVaccination, fetchVaccinations } from '../api';
import { useLiveReload } from '../hooks';
import type { Vaccination } from '../types';
import { formatDateShort } from '../utils';
import VaccinationModal from './VaccinationModal';
import DateStamp from './DateStamp';
import { IconButton, PencilIcon, TrashIcon } from './NavIcons';

interface Props {
  dogId: string;
}

function dueState(nextDue: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!nextDue) return null;
  const today = new Date(new Date().toDateString());
  const due = new Date(`${nextDue}T00:00:00`);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 30) return 'soon';
  return 'ok';
}

export default function VaccinationTab({ dogId }: Props) {
  const [entries, setEntries] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Vaccination | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await fetchVaccinations(dogId));
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

  async function handleDelete(e: Vaccination) {
    if (!window.confirm(`Impfung „${e.name}" wirklich löschen?`)) return;
    try {
      await deleteVaccination(e.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <div>
      <div className="mb-3">
        <button className="btn-primary" onClick={() => setAdding(true)}>
          Impfung hinzufügen
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
          <p className="font-semibold text-stone-700">Keine Impfungen eingetragen</p>
          <p className="mt-1 text-sm text-stone-500">
            Pflege hier den Impfpass mit Fälligkeitsdatum.
          </p>
          <button className="btn-primary mt-4" onClick={() => setAdding(true)}>
            Impfung hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {[...entries].reverse().map((e) => {
            const st = dueState(e.nextDue);
            return (
              <article
                key={e.id}
                className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm"
              >
                <DateStamp date={e.date} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-base font-bold leading-tight tracking-tight">
                      {e.name}
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
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                    <span>
                      {e.nextDue
                        ? `Nächste Fälligkeit ${formatDateShort(e.nextDue)}`
                        : 'Keine Fälligkeit hinterlegt'}
                    </span>
                    {st === 'overdue' && (
                      <span className="chip bg-red-100 text-red-800">Überfällig</span>
                    )}
                    {st === 'soon' && (
                      <span className="chip bg-amber-100 text-amber-800">Fällig bald</span>
                    )}
                  </p>
                  {e.note && <p className="prose-serif mt-1.5 text-sm text-stone-700">{e.note}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(adding || editing) && (
        <VaccinationModal
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
