import { useCallback, useEffect, useState } from 'react';
import { deleteVet, fetchVets } from '../api';
import { useLiveReload } from '../hooks';
import type { VetVisit } from '../types';
import { formatDateShort } from '../utils';
import Modal from './Modal';
import VetModal from './VetModal';
import DateStamp from './DateStamp';
import { ChevronRightIcon } from './NavIcons';

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
        <button className="btn-primary" onClick={() => setAdding(true)}>
          Tierarztbesuch hinzufügen
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
          <p className="font-semibold text-stone-700">Keine Tierarztbesuche</p>
          <p className="mt-1 text-sm text-stone-500">
            Dokumentiere hier Besuche, Befunde und Folgetermine.
          </p>
          <button className="btn-primary mt-4" onClick={() => setAdding(true)}>
            Tierarztbesuch hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {[...entries].reverse().map((e) => (
            <article
              key={e.id}
              className="flex cursor-pointer gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm"
              onClick={() => setDetail(e)}
            >
              <DateStamp date={e.date} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold leading-tight tracking-tight">
                      {e.reason ?? 'Tierarztbesuch'}
                    </p>
                    {e.clinic && <p className="text-xs text-stone-500">{e.clinic}</p>}
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400" />
                </div>
                {e.diagnosis && (
                  <p className="prose-serif mt-1.5 line-clamp-2 text-sm text-stone-700">
                    {e.diagnosis}
                  </p>
                )}
                {e.followUp && (
                  <p
                    className={`mt-1.5 text-xs font-medium ${
                      isOverdue(e.followUp) ? 'text-red-700' : 'text-stone-500'
                    }`}
                  >
                    Folgetermin {formatDateShort(e.followUp)}
                    {isOverdue(e.followUp) && ' · überfällig'}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {detail && (
        <Modal title={formatDateShort(detail.date)} onClose={() => setDetail(null)}>
          <div className="space-y-3">
            <VetRow label="Praxis" value={detail.clinic} />
            <VetRow label="Grund" value={detail.reason} />
            <VetRow label="Befund" value={detail.diagnosis} />
            <VetRow label="Behandlung" value={detail.treatment} />
            <VetRow label="Medikamente" value={detail.medication} />
            <VetRow
              label="Folgetermin"
              value={detail.followUp ? formatDateShort(detail.followUp) : null}
            />
            <VetRow label="Notiz" value={detail.note} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-danger" onClick={() => handleDelete(detail)}>
              Löschen
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(detail);
                setDetail(null);
              }}
            >
              Bearbeiten
            </button>
          </div>
        </Modal>
      )}

      {(adding || editing) && (
        <VetModal
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

function VetRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-stone-800">{value || '–'}</p>
    </div>
  );
}
