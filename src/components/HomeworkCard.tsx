import { useState } from 'react';
import type { Entry } from '../types';
import { formatDateShort } from '../utils';

interface Props {
  entry: Entry;
  dogName: string | null;
  onPractice: () => void;
  onDone: () => void;
}

// Karte oben auf der Einträge-Seite: die jüngste Stunde mit offenen Aufgaben.
export default function HomeworkCard({ entry, dogName, onPractice, onDone }: Props) {
  const [ganz, setGanz] = useState(false);
  const aufgaben = entry.uebungsaufgaben ?? '';
  const kuerzbar = aufgaben.length > 140;

  return (
    <section className="mb-4 rounded-2xl border border-accent-mid/40 bg-accent-tint p-4">
      <p className="label mb-0">Übungsaufgaben{dogName ? ` · ${dogName}` : ''}</p>
      <p className="mt-0.5 text-xs text-stone-600">
        Aus der Stunde vom {formatDateShort(entry.date)}
      </p>
      <p className={`prose-serif mt-2 text-sm text-stone-800 ${ganz ? '' : 'line-clamp-3'}`}>
        {aufgaben}
      </p>
      {kuerzbar && (
        <button
          type="button"
          className="mt-1 text-xs font-semibold underline"
          onClick={() => setGanz((v) => !v)}
        >
          {ganz ? 'weniger' : 'mehr'}
        </button>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={onPractice}>
          Heute geübt
        </button>
        <button className="btn-secondary" onClick={onDone}>
          Erledigt
        </button>
      </div>
    </section>
  );
}
