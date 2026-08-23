import { useState } from 'react';
import { deleteCommand, saveCommand } from '../api';
import type { Command, DogProfile } from '../types';
import Modal from './Modal';

interface Props {
  command: Command | null;
  dogs: DogProfile[];
  defaultDogId?: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function CommandModal({ command, dogs, defaultDogId, onClose, onChanged }: Props) {
  const [name, setName] = useState(command?.name ?? '');
  const [dogId, setDogId] = useState<string>(command?.dogId ?? defaultDogId ?? '');
  const [beschreibung, setBeschreibung] = useState(command?.beschreibung ?? '');
  const [tipp, setTipp] = useState(command?.tipp ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Bitte einen Namen eingeben.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveCommand({
        id: command?.id,
        dogId: dogId || null,
        name: trimmed,
        beschreibung: beschreibung.trim() || null,
        tipp: tipp.trim() || null
      });
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!command) return;
    if (!window.confirm(`Kommando „${command.name}" wirklich löschen?`)) return;
    try {
      await deleteCommand(command.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <Modal title={command ? 'Kommando bearbeiten' : 'Neues Kommando'} onClose={onClose}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="label">Name des Kommandos</label>
          <input
            className="input"
            autoFocus
            placeholder="z. B. Sitz"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />
        </div>

        {dogs.length > 0 && (
          <div>
            <label className="label">Hund</label>
            <select className="input" value={dogId} onChange={(ev) => setDogId(ev.target.value)}>
              <option value="">Ohne Hund</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Genaue Bezeichnung / Beschreibung</label>
          <textarea
            className="input min-h-24"
            placeholder="z. B. „Sitz“ – gesprochen, dazu Handzeichen: flache Hand nach unten…"
            value={beschreibung}
            onChange={(ev) => setBeschreibung(ev.target.value)}
          />
        </div>

        <div>
          <label className="label">Tipp der Trainerin</label>
          <textarea
            className="input min-h-20"
            placeholder="z. B. Belohnung erst nach dem Absitzen geben…"
            value={tipp}
            onChange={(ev) => setTipp(ev.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
          {command && (
            <button className="btn-danger" onClick={handleDelete}>
              Löschen
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </Modal>
  );
}
