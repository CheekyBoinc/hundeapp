import { useState } from 'react';
import { saveVet } from '../api';
import type { VetVisit } from '../types';
import { todayLocal } from '../utils';

interface Props {
  dogId: string;
  entry: VetVisit | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function VetModal({ dogId, entry, onClose, onSaved }: Props) {
  const [date, setDate] = useState(entry?.date ?? todayLocal());
  const [clinic, setClinic] = useState(entry?.clinic ?? '');
  const [reason, setReason] = useState(entry?.reason ?? '');
  const [diagnosis, setDiagnosis] = useState(entry?.diagnosis ?? '');
  const [treatment, setTreatment] = useState(entry?.treatment ?? '');
  const [medication, setMedication] = useState(entry?.medication ?? '');
  const [followUp, setFollowUp] = useState(entry?.followUp ?? '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!date) {
      setError('Bitte ein Datum auswählen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveVet({
        id: entry?.id,
        dogId,
        date,
        clinic: clinic.trim() || null,
        reason: reason.trim() || null,
        diagnosis: diagnosis.trim() || null,
        treatment: treatment.trim() || null,
        medication: medication.trim() || null,
        followUp: followUp || null,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />
      <div className="relative max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-3xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{entry ? 'Tierarztbesuch bearbeiten' : 'Tierarztbesuch hinzufügen'}</h2>
          <button className="btn-secondary px-3 py-1.5" onClick={onClose}>Schließen</button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={date} onChange={(ev) => setDate(ev.target.value)} />
            </div>
            <div>
              <label className="label">Praxis</label>
              <input className="input" value={clinic} onChange={(ev) => setClinic(ev.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Grund</label>
            <input className="input" placeholder="z. B. Impfung, Kontrolle, Notfall" value={reason} onChange={(ev) => setReason(ev.target.value)} />
          </div>
          <div>
            <label className="label">Befund</label>
            <input className="input" value={diagnosis} onChange={(ev) => setDiagnosis(ev.target.value)} />
          </div>
          <div>
            <label className="label">Behandlung</label>
            <textarea className="input min-h-16" value={treatment} onChange={(ev) => setTreatment(ev.target.value)} />
          </div>
          <div>
            <label className="label">Medikamente</label>
            <textarea className="input min-h-16" value={medication} onChange={(ev) => setMedication(ev.target.value)} />
          </div>
          <div>
            <label className="label">Folgetermin</label>
            <input type="date" className="input" value={followUp} onChange={(ev) => setFollowUp(ev.target.value)} />
          </div>
          <div>
            <label className="label">Notiz</label>
            <textarea className="input min-h-16" value={note} onChange={(ev) => setNote(ev.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
            <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          </div>
        </div>
      </div>
    </div>
  );
}
