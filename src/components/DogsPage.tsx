import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDog, fetchDogs } from '../api';
import { useLiveReload } from '../hooks';
import type { DogProfile } from '../types';
import DogForm from './DogForm';
import DogProfileTab from './DogProfileTab';
import WeightTab from './WeightTab';
import StoolTab from './StoolTab';
import VetTab from './VetTab';
import VaccinationTab from './VaccinationTab';

type SubTab = 'profil' | 'gewicht' | 'kot' | 'tierarzt' | 'impfungen';

const SUB_TABS: [SubTab, string][] = [
  ['profil', 'Profil'],
  ['gewicht', 'Gewicht'],
  ['kot', 'Kot'],
  ['tierarzt', 'Tierarzt'],
  ['impfungen', 'Impfungen']
];

export default function DogsPage() {
  const [dogs, setDogs] = useState<DogProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('profil');
  const [addingDog, setAddingDog] = useState(false);
  const [editingDog, setEditingDog] = useState<DogProfile | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchDogs();
      setDogs(d);
      setError(null);
      setSelectedId((prev) => {
        if (d.length === 0) return null;
        if (prev && d.some((x) => x.id === prev)) return prev;
        return d[0].id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveReload(load);

  const selected = useMemo(() => dogs.find((d) => d.id === selectedId) ?? null, [dogs, selectedId]);

  async function handleDelete(dog: DogProfile) {
    if (!window.confirm(`Alle Daten von „${dog.name}" wirklich löschen?`)) return;
    try {
      await deleteDog(dog.id);
      setSelectedId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <div>
      {loading ? (
        <p className="py-10 text-center text-stone-500">Wird geladen…</p>
      ) : dogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="font-semibold text-stone-700">Noch kein Hund angelegt</p>
          <p className="mt-1 text-sm text-stone-500">
            Lege deinen ersten Hund an, um Profil, Gewicht, Kot, Tierarzt und Impfungen zu
            verwalten.
          </p>
          <button className="btn-primary mt-4" onClick={() => setAddingDog(true)}>
            Hund hinzufügen
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <select
              className="input flex-1"
              value={selectedId ?? ''}
              onChange={(ev) => setSelectedId(ev.target.value || null)}
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button className="btn-secondary shrink-0" onClick={() => setAddingDog(true)}>
              + Hund
            </button>
            {selected && (
              <button
                className="tap-target shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-stone-400 hover:text-red-600"
                onClick={() => handleDelete(selected)}
              >
                Löschen
              </button>
            )}
          </div>

          {selected && (
            <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
              {SUB_TABS.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setSubTab(id)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold ${
                    subTab === id
                      ? 'bg-accent-soft text-accent-dark'
                      : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button className="shrink-0 font-semibold underline" onClick={load}>
                Erneut versuchen
              </button>
            </div>
          )}

          {selected && subTab === 'profil' && (
            <DogProfileTab dog={selected} onEdit={() => setEditingDog(selected)} />
          )}
          {selected && subTab === 'gewicht' && <WeightTab dog={selected} />}
          {selected && subTab === 'kot' && <StoolTab dogId={selected.id} />}
          {selected && subTab === 'tierarzt' && <VetTab dogId={selected.id} />}
          {selected && subTab === 'impfungen' && <VaccinationTab dogId={selected.id} />}
        </>
      )}

      {(addingDog || editingDog) && (
        <DogForm
          dog={editingDog}
          onClose={() => {
            setAddingDog(false);
            setEditingDog(null);
          }}
          onSaved={(dogId) => {
            setSelectedId(dogId);
            load();
          }}
        />
      )}
    </div>
  );
}
