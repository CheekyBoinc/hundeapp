import { useState } from 'react';
import { deleteEntry, toggleEntryDone } from '../api';
import type { Entry } from '../types';
import { formatDate } from '../utils';
import Modal from './Modal';

interface Props {
  entry: Entry;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}

function Block({ label, text }: { label: string; text: string | null }) {
  return (
    <div>
      <p className="label">{label}</p>
      {text ? (
        <p className="prose-serif whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
          {text}
        </p>
      ) : (
        <p className="text-sm text-stone-400">–</p>
      )}
    </div>
  );
}

export default function EntryDetail({ entry, onClose, onEdit, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(done: boolean) {
    setBusy(true);
    try {
      await toggleEntryDone(entry.id, done);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Eintrag wirklich löschen?')) return;
    try {
      await deleteEntry(entry.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <Modal
      title={formatDate(entry.date)}
      onClose={onClose}
      headerExtra={
        entry.erledigt ? (
          <span className="chip bg-emerald-100 text-emerald-800">Erledigt</span>
        ) : undefined
      }
    >
      {entry.ort && <p className="mb-3 text-sm text-stone-500">Ort: {entry.ort}</p>}

      {entry.commands.length > 0 && (
        <div className="mb-4">
          <p className="label">Geübte Kommandos</p>
          <div className="flex flex-wrap gap-1.5">
            {entry.commands.map((c) => (
              <span key={c.id} className="chip bg-accent-soft text-accent-dark">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Block label="Was haben wir gemacht?" text={entry.was_gemacht} />
        <Block label="Übungsaufgaben" text={entry.uebungsaufgaben} />
        {entry.tipps ? (
          <div className="rounded-xl bg-accent-tint px-3.5 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-strong">
              Tipps / Erklärungen der Trainerin
            </p>
            <p className="prose-serif whitespace-pre-wrap text-sm leading-relaxed text-accent-dark">
              {entry.tipps}
            </p>
          </div>
        ) : (
          <Block label="Tipps / Erklärungen der Trainerin" text={null} />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-5 w-5 accent-accent"
            checked={entry.erledigt}
            disabled={busy}
            onChange={(ev) => handleToggle(ev.target.checked)}
          />
          Erledigt
        </label>
        <div className="ml-auto flex gap-2">
          <button className="btn-danger" onClick={handleDelete}>
            Löschen
          </button>
          <button className="btn-primary" onClick={onEdit}>
            Bearbeiten
          </button>
        </div>
      </div>
    </Modal>
  );
}
