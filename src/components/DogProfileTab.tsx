import { useCallback, useEffect, useState } from 'react';
import { fetchWeights } from '../api';
import { useLiveReload } from '../hooks';
import type { DogProfile, WeightEntry } from '../types';
import { formatAge, formatDateShort, formatKg } from '../utils';

interface Props {
  dog: DogProfile;
  onEdit: () => void;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-stone-100 py-2.5 last:border-0">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="text-right text-sm font-medium text-stone-800">{value || '–'}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex-1 rounded-xl bg-stone-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-0.5 text-base font-bold text-stone-800">{value ?? '–'}</p>
    </div>
  );
}

export default function DogProfileTab({ dog, onEdit }: Props) {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const dogId = dog.id;

  const load = useCallback(async () => {
    try {
      setWeights(await fetchWeights(dogId));
    } catch {
      setWeights([]);
    }
  }, [dogId]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveReload(load);

  const latest = weights[weights.length - 1];
  const geschlecht = dog.geschlecht === 'w' ? 'Hündin' : dog.geschlecht === 'm' ? 'Rüde' : null;
  const subtitle = [dog.rasse, geschlecht].filter(Boolean).join(' · ');

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white"
          aria-hidden="true"
        >
          {dog.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-bold">{dog.name}</h3>
          <p className="truncate text-sm text-stone-500">{subtitle || 'Profil ausfüllen'}</p>
        </div>
        <button className="btn-secondary shrink-0 px-3 py-1.5 text-sm" onClick={onEdit}>
          Bearbeiten
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <Stat label="Alter" value={formatAge(dog.geburtsdatum)} />
        <Stat label="Gewicht" value={latest ? `${formatKg(latest.weightKg)}` : null} />
      </div>
      {latest && (
        <p className="mt-1 text-right text-[11px] text-stone-400">
          gewogen am {formatDateShort(latest.date)}
        </p>
      )}

      <div className="mt-3">
        <Row
          label="Geburtsdatum"
          value={dog.geburtsdatum ? formatDateShort(dog.geburtsdatum) : null}
        />
        <Row label="Chip-Nummer" value={dog.chipNr} />
        <Row label="Register-Nummer" value={dog.registerNr} />
        <Row label="Tierarzt" value={dog.tierarzt} />
        <Row label="Allergien" value={dog.allergien} />
        <Row label="Besonderheiten" value={dog.besonderheiten} />
      </div>
    </div>
  );
}
