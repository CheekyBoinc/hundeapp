import { useState } from 'react';
import { saveVaccination } from '../api';
import { useFormSave } from '../hooks';
import type { Vaccination } from '../types';
import { todayLocal } from '../utils';
import Modal from './Modal';

interface Props {
  dogId: string;
  entry: Vaccination | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function VaccinationModal({ dogId, entry, onClose, onSaved }: Props) {
  const [date, setDate] = useState(entry?.date ?? todayLocal());
  const [name, setName] = useState(entry?.name ?? '');
  const [nextDue, setNextDue] = useState(entry?.nextDue ?? '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [inputError, setInputError] = useState<string | null>(null);
  const { saving, error, run } = useFormSave(
    async () => {
      await saveVaccination({
        id: entry?.id,
        dogId,
        date,
        name: name.trim(),
        nextDue: nextDue || null,
        note: note.trim() || null
      });
    },
    () => {
      onSaved();
      onClose();
    }
  );

  function handleSave() {
    if (!date) {
      setInputError('Bitte ein Datum auswählen.');
      return;
    }
    if (!name.trim()) {
      setInputError('Bitte einen Impfstoff angeben.');
      return;
    }
    setInputError(null);
    run();
  }

  return (
    <Modal title={entry ? 'Impfung bearbeiten' : 'Impfung hinzufügen'} onClose={onClose}>
      {(error || inputError) && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error ?? inputError}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Datum</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(ev) => setDate(ev.target.value)}
            />
          </div>
          <div>
            <label className="label">Nächste Fälligkeit</label>
            <input
              type="date"
              className="input"
              value={nextDue}
              onChange={(ev) => setNextDue(ev.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Impfstoff</label>
          <input
            className="input"
            placeholder="z. B. Tollwut, Staupe, Leptospirose"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />
        </div>

        <div>
          <label className="label">Notiz</label>
          <textarea
            className="input min-h-20"
            placeholder="z. B. Chlamys, Wurmkur…"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </Modal>
  );
}
