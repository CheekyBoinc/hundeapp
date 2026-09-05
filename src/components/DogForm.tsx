import { useState } from 'react';
import { saveDogProfile } from '../api';
import type { DogProfile } from '../types';
import Modal from './Modal';

interface Props {
  dog: DogProfile | null;
  onClose: () => void;
  onSaved: (dogId: string) => void;
}

export default function DogForm({ dog, onClose, onSaved }: Props) {
  const [name, setName] = useState(dog?.name ?? '');
  const [rasse, setRasse] = useState(dog?.rasse ?? '');
  const [geburtsdatum, setGeburtsdatum] = useState(dog?.geburtsdatum ?? '');
  const [geschlecht, setGeschlecht] = useState<'w' | 'm' | ''>(dog?.geschlecht ?? '');
  const [chipNr, setChipNr] = useState(dog?.chipNr ?? '');
  const [registerNr, setRegisterNr] = useState(dog?.registerNr ?? '');
  const [tierarzt, setTierarzt] = useState(dog?.tierarzt ?? '');
  const [allergien, setAllergien] = useState(dog?.allergien ?? '');
  const [besonderheiten, setBesonderheiten] = useState(dog?.besonderheiten ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError('Bitte einen Namen eingeben.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveDogProfile({
        id: dog?.id,
        name: name.trim(),
        rasse: rasse.trim() || null,
        geburtsdatum: geburtsdatum || null,
        geschlecht: geschlecht || null,
        chipNr: chipNr.trim() || null,
        registerNr: registerNr.trim() || null,
        tierarzt: tierarzt.trim() || null,
        allergien: allergien.trim() || null,
        besonderheiten: besonderheiten.trim() || null
      });
      onSaved(saved.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  return (
    <Modal title={dog ? 'Hund bearbeiten' : 'Neuer Hund'} onClose={onClose}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            autoFocus
            placeholder="z. B. Luna"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Rasse</label>
            <input
              className="input"
              placeholder="z. B. Australian Shepherd"
              value={rasse}
              onChange={(ev) => setRasse(ev.target.value)}
            />
          </div>
          <div>
            <label className="label">Geburtsdatum</label>
            <input
              type="date"
              className="input"
              value={geburtsdatum}
              onChange={(ev) => setGeburtsdatum(ev.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Geschlecht</label>
          <div className="flex gap-1.5">
            {(['w', 'm'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGeschlecht(g)}
                className={`chip ${geschlecht === g ? 'bg-accent text-white' : 'bg-stone-100 text-stone-700'}`}
              >
                {g === 'w' ? 'Hündin' : 'Rüde'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Chip-Nummer</label>
            <input className="input" value={chipNr} onChange={(ev) => setChipNr(ev.target.value)} />
          </div>
          <div>
            <label className="label">Register-Nummer</label>
            <input
              className="input"
              value={registerNr}
              onChange={(ev) => setRegisterNr(ev.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Tierarzt</label>
          <input
            className="input"
            placeholder="Name / Praxis"
            value={tierarzt}
            onChange={(ev) => setTierarzt(ev.target.value)}
          />
        </div>
        <div>
          <label className="label">Allergien</label>
          <input
            className="input"
            placeholder="z. B. Huhn, Grasmilben"
            value={allergien}
            onChange={(ev) => setAllergien(ev.target.value)}
          />
        </div>
        <div>
          <label className="label">Besonderheiten</label>
          <textarea
            className="input min-h-20"
            placeholder="z. B. ängstlich bei Gewitter, bevorzugt…"
            value={besonderheiten}
            onChange={(ev) => setBesonderheiten(ev.target.value)}
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
