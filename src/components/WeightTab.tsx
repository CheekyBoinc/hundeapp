import { useCallback, useEffect, useState } from 'react';
import { deleteWeight, fetchWeights } from '../api';
import { useLiveReload } from '../hooks';
import type { WeightEntry } from '../types';
import { formatDateShort, formatKg } from '../utils';
import WeightModal from './WeightModal';

interface Props {
  dogId: string;
}

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;
  const width = 560;
  const height = 140;
  const pad = 26;
  const xs = entries.map((e) => e.date);
  const ys = entries.map((e) => e.weightKg);
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const X = (d: string) => pad + ((new Date(d).getTime() - new Date(minX).getTime()) / Math.max(1, new Date(maxX).getTime() - new Date(minX).getTime())) * (width - pad * 2);
  const Y = (v: number) => height - pad - ((v - minY) / spanY) * (height - pad * 2);
  const points = entries.map((e) => `${X(e.date)},${Y(e.weightKg)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full rounded-xl bg-stone-50">
      <polyline points={points} fill="none" stroke="#ea7c3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {entries.map((e) => (
        <circle key={e.id} cx={X(e.date)} cy={Y(e.weightKg)} r="4" fill="#ea7c3a" />
      ))}
      <text x={pad} y={pad - 8} className="fill-stone-400 text-[10px]">{formatKg(maxY)}</text>
      <text x={pad} y={height - 6} className="fill-stone-400 text-[10px]">{formatKg(minY)}</text>
      <text x={width - pad} y={height - 6} className="fill-stone-400 text-[10px]" textAnchor="end">{formatDateShort(maxX)}</text>
      <text x={pad} y={height - 6} className="fill-stone-400 text-[10px]">{formatDateShort(minX)}</text>
    </svg>
  );
}

export default function WeightTab({ dogId }: Props) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<WeightEntry | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await fetchWeights(dogId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveReload(load);

  async function handleDelete(e: WeightEntry) {
    if (!window.confirm(`Gewicht vom ${formatDateShort(e.date)} wirklich löschen?`)) return;
    try {
      await deleteWeight(e.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const diff = latest && prev ? latest.weightKg - prev.weightKg : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1">
          {latest && (
            <p className="text-lg font-bold">{formatKg(latest.weightKg)}</p>
          )}
          {diff !== null && (
            <p className={`text-xs font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {diff >= 0 ? '+' : ''}
              {diff.toLocaleString('de-DE')} kg seit {formatDateShort(prev!.date)}
            </p>
          )}
        </div>
        <button className="btn-primary shrink-0" onClick={() => setAdding(true)}>
          Gewicht hinzufügen
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button className="shrink-0 font-semibold underline" onClick={load}>Erneut versuchen</button>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-stone-500">Wird geladen…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <p className="font-semibold text-stone-700">Keine Gewichtseinträge</p>
          <p className="mt-1 text-sm text-stone-500">Trage das erste Gewicht ein, um den Verlauf zu sehen.</p>
          <button className="btn-primary mt-4" onClick={() => setAdding(true)}>Gewicht hinzufügen</button>
        </div>
      ) : (
        <>
          {entries.length >= 2 && <WeightChart entries={entries} />}
          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {[...entries].reverse().map((e, i) => (
              <div
                key={e.id}
                className={`flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-2.5 last:border-0 ${i === 0 ? 'bg-orange-50/40' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium">{formatDateShort(e.date)}</p>
                  {e.note && <p className="text-xs text-stone-500">{e.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{formatKg(e.weightKg)}</span>
                  <button className="text-xs font-medium text-stone-400 hover:text-orange-600" onClick={() => setEditing(e)}>Bearbeiten</button>
                  <button className="text-xs font-medium text-stone-400 hover:text-red-600" onClick={() => handleDelete(e)}>Löschen</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {(adding || editing) && (
        <WeightModal
          dogId={dogId}
          entry={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}
