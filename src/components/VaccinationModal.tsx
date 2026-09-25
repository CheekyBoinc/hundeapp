import { useState } from 'react';
import { saveVaccination } from '../api';
import { useFormSave } from '../hooks';
import type { Vaccination, VaccinationKind } from '../types';
import { addMonths, todayLocal, VACCINATION_KINDS } from '../utils';
import Modal from './Modal';

// Platzhalter je Art, ohne Markennamen.
const PLACEHOLDERS: Record<VaccinationKind, string> = {
  impfung: 'z. B. Tollwut, Staupe',
  entwurmung: 'Name des Präparats',
  parasiten: 'z. B. Zeckenschutz',
  sonstiges: 'z. B. Zahnkontrolle'
};

const DUE_CHOICES = [
  { label: 'in 1 Monat', months: 1 },
  { label: 'in 3 Monaten', months: 3 },
  { label: 'in 1 Jahr', months: 12 },
  { label: 'in 3 Jahren', months: 36 }
];

interface Props {
  dogId: string;
  entry: Vaccination | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function VaccinationModal({ dogId, entry, onClose, onSaved }: Props) {
  const [date, setDate] = useState(entry?.date ?? todayLocal());
  const [name, setName] = useState(entry?.name ?? '');
  const [kind, setKind] = useState<VaccinationKind>(entry?.kind ?? 'impfung');
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
        kind,
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
      setInputError('Bitte eine Bezeichnung angeben.');
      return;
    }
    setInputError(null);
    run();
  }

  return (
    <Modal title={entry ? 'Vorsorge bearbeiten' : 'Vorsorge hinzufügen'} onClose={onClose}>
      {(error || inputError) && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error ?? inputError}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="label">Art</label>
          <div className="flex flex-wrap gap-2">
            {VACCINATION_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={`chip-toggle ${
                  kind === k.value
                    ? 'border-accent bg-accent text-white'
                    : 'border-stone-300 bg-control text-stone-700'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

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
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DUE_CHOICES.map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  className="chip-toggle border-stone-300 bg-control text-stone-700"
                  onClick={() => setNextDue(addMonths(date || todayLocal(), choice.months))}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Bezeichnung</label>
          <input
            className="input"
            placeholder={PLACEHOLDERS[kind]}
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
