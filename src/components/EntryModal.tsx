import { useState, type FormEvent } from 'react';
import { deleteEntry, saveCommand, saveEntry, translate } from '../api';
import type { Command, Entry } from '../types';
import { todayLocal } from '../utils';

interface Props {
  entry: Entry | null;
  commands: Command[];
  onClose: () => void;
  onChanged: () => void;
}

export default function EntryModal({ entry, commands: commandsProp, onClose, onChanged }: Props) {
  const [date, setDate] = useState(entry?.date ?? todayLocal());
  const [ort, setOrt] = useState(entry?.ort ?? '');
  const [wasGemacht, setWasGemacht] = useState(entry?.was_gemacht ?? '');
  const [aufgaben, setAufgaben] = useState(entry?.uebungsaufgaben ?? '');
  const [tipps, setTipps] = useState(entry?.tipps ?? '');
  const [erledigt, setErledigt] = useState(entry?.erledigt ?? false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(entry?.commands.map((c) => c.id) ?? [])
  );
  const [commands, setCommands] = useState<Command[]>(commandsProp);
  const [newCommand, setNewCommand] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedCommands = [...commands].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  function toggleCommand(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddCommand(ev: FormEvent) {
    ev.preventDefault();
    const name = newCommand.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const cmd = await saveCommand({ name });
      setCommands((prev) => [...prev, cmd]);
      setSelected((prev) => new Set(prev).add(cmd.id));
      setNewCommand('');
    } catch (err) {
      setError(translate(err instanceof Error ? err.message : 'Fehler beim Anlegen'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!date) {
      setError('Bitte ein Datum auswählen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveEntry(
        {
          id: entry?.id,
          date,
          ort: ort.trim() || null,
          was_gemacht: wasGemacht.trim() || null,
          uebungsaufgaben: aufgaben.trim() || null,
          tipps: tipps.trim() || null,
          erledigt
        },
        [...selected]
      );
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    if (!window.confirm('Diesen Eintrag wirklich löschen?')) return;
    try {
      await deleteEntry(entry.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />
      <div className="relative max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-3xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{entry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>
          <button className="btn-secondary px-3 py-1.5" onClick={onClose}>
            Schließen
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
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
              <label className="label">Ort</label>
              <input
                className="input"
                list="ort-vorschlaege"
                placeholder="z. B. Hundeschule"
                value={ort}
                onChange={(ev) => setOrt(ev.target.value)}
              />
              <datalist id="ort-vorschlaege">
                <option value="Hundeschule" />
                <option value="Zuhause" />
                <option value="Spaziergang" />
                <option value="Garten" />
                <option value="Wald" />
                <option value="Feld" />
                <option value="Stadt" />
              </datalist>
            </div>
          </div>

          <div>
            <label className="label">Kommandos (geübt)</label>
            {sortedCommands.length === 0 ? (
              <p className="text-sm text-stone-500">
                Noch keine Kommandos angelegt. Lege unten dein erstes Kommando an.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sortedCommands.map((c) => {
                  const on = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCommand(c.id)}
                      className={
                        on
                          ? 'chip bg-orange-500 text-white'
                          : 'chip bg-stone-100 text-stone-700'
                      }
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            <form className="mt-2 flex gap-2" onSubmit={handleAddCommand}>
              <input
                className="input"
                placeholder="Neues Kommando anlegen…"
                value={newCommand}
                onChange={(ev) => setNewCommand(ev.target.value)}
              />
              <button
                type="submit"
                className="btn-secondary shrink-0"
                disabled={busy || !newCommand.trim()}
              >
                Hinzufügen
              </button>
            </form>
          </div>

          <div>
            <label className="label">Was haben wir gemacht?</label>
            <textarea
              className="input min-h-20"
              placeholder="z. B. Sitz im Garten geübt, danach 30 Min. Spaziergang…"
              value={wasGemacht}
              onChange={(ev) => setWasGemacht(ev.target.value)}
            />
          </div>

          <div>
            <label className="label">Übungsaufgaben (von der Hundeschule)</label>
            <textarea
              className="input min-h-20"
              placeholder="z. B. Täglich 3× Sitz mit Belohnung üben…"
              value={aufgaben}
              onChange={(ev) => setAufgaben(ev.target.value)}
            />
          </div>

          <div>
            <label className="label">Tipps / Erklärungen der Trainerin</label>
            <textarea
              className="input min-h-20"
              placeholder="z. B. Belohnung schneller geben, damit der Hund das Verhalten verknüpft…"
              value={tipps}
              onChange={(ev) => setTipps(ev.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-5 w-5 accent-orange-500"
              checked={erledigt}
              onChange={(ev) => setErledigt(ev.target.checked)}
            />
            Übungsaufgaben erledigt
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
            {entry && (
              <button className="btn-danger" onClick={handleDelete}>
                Löschen
              </button>
            )}
            <button className="btn-secondary" onClick={onClose}>
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
