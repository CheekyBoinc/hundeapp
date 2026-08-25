import { useState } from 'react';
import { saveStool } from '../api';
import { useFormSave } from '../hooks';
import type { StoolEntry } from '../types';
import { todayLocal } from '../utils';
import Modal from './Modal';

interface Props {
  dogId: string;
  entry: StoolEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

const COLORS = ['braun', 'dunkelbraun', 'gelb', 'grün', 'schwarz', 'rötlich', 'hell', 'sonstiges'];
const AMOUNTS = ['wenig', 'normal', 'viel'] as const;

const BRISTOL: { n: number; label: string }[] = [
  { n: 1, label: 'hart & trocken' },
  { n: 2, label: 'fest, geformt' },
  { n: 3, label: 'normal, geformt' },
  { n: 4, label: 'normal, weich' },
  { n: 5, label: 'weich, matschig' },
  { n: 6, label: 'breiig, formlos' },
  { n: 7, label: 'wässrig, flüssig' }
];

export default function StoolModal({ dogId, entry, onClose, onSaved }: Props) {
  const [date, setDate] = useState(entry?.date ?? todayLocal());
  const [consistency, setConsistency] = useState(entry?.consistency ?? 0);
  const [color, setColor] = useState(entry?.color ?? '');
  const [amount, setAmount] = useState<'wenig' | 'normal' | 'viel' | null>(entry?.amount ?? null);
  const [abnormal, setAbnormal] = useState(entry?.abnormal ?? false);
  const [note, setNote] = useState(entry?.note ?? '');
  const [inputError, setInputError] = useState<string | null>(null);
  const { saving, error, run } = useFormSave(
    async () => {
      await saveStool({
        id: entry?.id,
        dogId,
        date,
        consistency,
        color: color || null,
        amount,
        abnormal,
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
    setInputError(null);
    run();
  }

  return (
    <Modal title={entry ? 'Kot-Eintrag bearbeiten' : 'Kot-Eintrag hinzufügen'} onClose={onClose}>
      {(error || inputError) && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error ?? inputError}
        </div>
      )}

      <div className="space-y-4">
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
          <label className="label">Konsistenz (Bristol)</label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {BRISTOL.map((b) => (
              <button
                key={b.n}
                type="button"
                onClick={() => setConsistency(b.n)}
                className={`rounded-xl border px-2 py-1.5 text-left text-xs ${
                  consistency === b.n
                    ? 'border-accent-mid bg-accent-tint text-accent-dark'
                    : 'border-stone-200 bg-white text-stone-600'
                }`}
              >
                <span className="block font-semibold">{b.n}</span>
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Farbe</label>
            <select className="input" value={color} onChange={(ev) => setColor(ev.target.value)}>
              <option value="">–</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Menge</label>
            <select
              className="input"
              value={amount ?? ''}
              onChange={(ev) => setAmount((ev.target.value || null) as typeof amount)}
            >
              <option value="">–</option>
              {AMOUNTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-5 w-5 accent-accent"
            checked={abnormal}
            onChange={(ev) => setAbnormal(ev.target.checked)}
          />
          Auffällig
        </label>

        <div>
          <label className="label">Notiz</label>
          <textarea
            className="input min-h-20"
            placeholder="optional"
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
