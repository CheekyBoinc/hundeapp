import { useState } from 'react';
import { saveEntry } from '../api';
import { useFormSave } from '../hooks';
import type { Entry } from '../types';
import { todayLocal } from '../utils';
import Modal from './Modal';

interface Props {
  source: Entry;
  onClose: () => void;
  onSaved: () => void;
}

// „Heute geübt": ein kurzer Eintrag zu den Aufgaben aus der letzten Stunde. Er
// trägt selbst keine Übungsaufgaben, damit die Karte nicht wieder aufpoppt.
export default function PracticeModal({ source, onClose, onSaved }: Props) {
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [gewaehlt, setGewaehlt] = useState<string[]>(source.commands.map((c) => c.id));
  const [inputError, setInputError] = useState<string | null>(null);
  const { saving, error, run } = useFormSave(
    async () => {
      await saveEntry(
        {
          dogId: source.dogId,
          date,
          ort: null,
          was_gemacht: note.trim() || null,
          uebungsaufgaben: null,
          tipps: null,
          erledigt: false
        },
        gewaehlt
      );
    },
    () => {
      onSaved();
      onClose();
    }
  );

  function toggle(id: string) {
    setGewaehlt((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  function handleSave() {
    if (!date) {
      setInputError('Bitte ein Datum auswählen.');
      return;
    }
    setInputError(null);
    run();
  }

  return (
    <Modal title="Heute geübt" onClose={onClose}>
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

        {source.commands.length > 0 && (
          <div>
            <label className="label">Geübte Kommandos</label>
            <div className="flex flex-wrap gap-2">
              {source.commands.map((c) => {
                const an = gewaehlt.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`chip-toggle ${
                      an
                        ? 'border-accent bg-accent text-white'
                        : 'border-stone-300 bg-control text-stone-700'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="label">Notiz</label>
          <textarea
            className="input min-h-20"
            placeholder="z. B. zweimal fünf Minuten, klappt schon besser"
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
