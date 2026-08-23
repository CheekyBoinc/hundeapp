import { useState } from 'react';
import { saveWeight } from '../api';
import type { WeightEntry } from '../types';
import { todayLocal } from '../utils';
import Modal from './Modal';

interface Props {
  dogId: string;
  entry: WeightEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

function parseFloatDE(value: string): number | null {
  const norm = value.trim().replace(',', '.');
  if (!norm) return null;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

export default function WeightModal({ dogId, entry, onClose, onSaved }: Props) {
  const [date, setDate] = useState(entry?.date ?? todayLocal());
  const [weight, setWeight] = useState(entry ? String(entry.weightKg).replace('.', ',') : '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const kg = parseFloatDE(weight);
    if (!date) {
      setError('Bitte ein Datum auswählen.');
      return;
    }
    if (kg === null || kg <= 0) {
      setError('Bitte ein gültiges Gewicht in kg angeben.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveWeight({
        id: entry?.id,
        dogId,
        date,
        weightKg: kg,
        note: note.trim() || null
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  return (
    <Modal title={entry ? 'Gewicht bearbeiten' : 'Gewicht hinzufügen'} onClose={onClose}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Datum</label>
            <input type="date" className="input" value={date} onChange={(ev) => setDate(ev.target.value)} />
          </div>
          <div>
            <label className="label">Gewicht (kg)</label>
            <input
              className="input"
              inputMode="decimal"
              placeholder="z. B. 18,5"
              value={weight}
              onChange={(ev) => setWeight(ev.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Notiz</label>
          <textarea className="input min-h-20" placeholder="optional" value={note} onChange={(ev) => setNote(ev.target.value)} />
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
