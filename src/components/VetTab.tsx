import { useCallback, useEffect, useState } from 'react';
import { deleteVet, fetchVets } from '../api';
import { useLiveReload } from '../hooks';
import type { VetVisit } from '../types';
import { formatDateShort } from '../utils';
import VetModal from './VetModal';

interface Props {
  dogId: string;
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(`${date}T00:00:00`) < new Date(new Date().toDateString());
}

export default function VetTab({ dogId }: Props) {
  const [entries, setEntries] = useState<VetVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<VetVisit | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<VetVisit | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await fetchVets(dogId));
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

  async function handleDelete(e: VetVisit) {
    if (!window.confirm(`Tierarztbesuch vom ${formatDateShort(e.date)} wirklich löschen?`)) return;
    try {
      await deleteVet(e.id);
      setDetail(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <div>
      <div className="mb-3">
        <button className="btn-primary" onClick={() => setAdding(true)}>Tierarztbesuch hinzufügen</button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button className="shrink-0 font-semibold underline" onClick={load}>Erneut versuchen</button>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-stone-500">Wird geladen…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <p className="font-semibold text-stone-700">Keine Tierarztbesuche</p>
          <p className="mt-1 text-sm text-stone-500">Dokumentiere hier Besuche, Befunde und Folgetermine.</p>
          <button className="btn-primary mt-4" onClick={() => setAdding(true)}>Tierarztbesuch hinzufügen</button>
        </div>
      ) : (
        <div className="space-y-2">
          {[...entries].reverse().map((e) => (
            <div
              key={e.id}
              className="cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
              onClick={() => setDetail(e)}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold">{formatDateShort(e.date)}</span>
                {e.clinic && <span className="badge">{e.clinic}</span>}
              </div>
              {e.reason && <p className="text-sm text-stone-700">{e.reason}</p>}
              {isOverdue(e.followUp) && (
                <p className="mt-1 text-xs font-medium text-amber-700">Folgetermin überfällig</p>
              )}
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-stone-900/50" onClick={() => setDetail(null)} />
          <div className="relative max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-3xl sm:pb-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{formatDateShort(detail.date)}</h2>
              <button className="btn-secondary px-3 py-1.5" onClick={() => setDetail(null)}>Schließen</button>
            </div>
            <div className="space-y-3">
              <VetRow label="Praxis" value={detail.clinic} />
              <VetRow label="Grund" value={detail.reason} />
              <VetRow label="Befund" value={detail.diagnosis} />
              <VetRow label="Behandlung" value={detail.treatment} />
              <VetRow label="Medikamente" value={detail.medication} />
              <VetRow label="Folgetermin" value={detail.followUp ? formatDateShort(detail.followUp) : null} />
              <VetRow label="Notiz" value={detail.note} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-danger" onClick={() => handleDelete(detail)}>Löschen</button>
              <button className="btn-primary" onClick={() => { setEditing(detail); setDetail(null); }}>Bearbeiten</button>
            </div>
          </div>
        </div>
      )}

      {(adding || editing) && (
        <VetModal
          dogId={dogId}
          entry={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}

function VetRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-stone-800">{value || '–'}</p>
    </div>
  );
}
