import { useCallback, useEffect, useState } from 'react';
import { deleteWeight, fetchWeights } from '../api';
import { useLiveReload } from '../hooks';
import {
  classifyWeight,
  findBreedRange,
  formatRange,
  STATUS_LABEL,
  type BreedRange,
  type WeightStatus
} from '../breeds';
import { findGrowth, rangeAt } from '../growth';
import type { DogProfile, WeightEntry } from '../types';
import { formatDateShort, formatKg } from '../utils';
import WeightModal from './WeightModal';
import { IconButton, PencilIcon, TrashIcon } from './NavIcons';

interface Props {
  dog: DogProfile;
}

// Alter in vollen Monaten zu einem Stichtag (Standard: heute).
function ageInMonths(geburtsdatum: string | null, atDate?: string): number | null {
  if (!geburtsdatum) return null;
  const birth = new Date(`${geburtsdatum}T00:00:00`);
  const at = atDate ? new Date(`${atDate}T00:00:00`) : new Date();
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return null;
  let months = (at.getFullYear() - birth.getFullYear()) * 12 + (at.getMonth() - birth.getMonth());
  if (at.getDate() < birth.getDate()) months -= 1;
  return months >= 0 ? months : null;
}

function WeightChart({ entries, range }: { entries: WeightEntry[]; range: BreedRange | null }) {
  if (entries.length < 2) return null;
  const width = 560;
  const height = 140;
  const pad = 26;
  const xs = entries.map((e) => e.date);
  const ys = entries.map((e) => e.weightKg);
  const minX = xs[0];
  const maxX = xs[xs.length - 1];

  // Y-Skala deckt Daten und Idealbereich ab (plus Luft), damit das Band immer
  // sichtbar ist und nichts am Rand klebt.
  const lowest = Math.min(...ys, range?.minKg ?? Infinity);
  const highest = Math.max(...ys, range?.maxKg ?? -Infinity);
  const spanY = highest - lowest || 1;
  const margin = spanY * 0.06;
  const low = lowest - margin;
  const high = highest + margin;
  const scale = high - low || 1;
  const Y = (v: number) => height - pad - ((v - low) / scale) * (height - pad * 2);
  const X = (d: string) =>
    pad +
    ((new Date(d).getTime() - new Date(minX).getTime()) /
      Math.max(1, new Date(maxX).getTime() - new Date(minX).getTime())) *
      (width - pad * 2);
  const points = entries.map((e) => `${X(e.date)},${Y(e.weightKg)}`).join(' ');

  const bandTop = range ? Y(range.maxKg) : 0;
  const bandBottom = range ? Y(range.minKg) : 0;
  const bandX = pad;
  const bandWidth = width - pad * 2;
  // Halo hinter Achsen-Beschriftungen, damit sie über dem Band lesbar bleiben.
  const halo = { paintOrder: 'stroke' as const, stroke: 'var(--color-stone-50)', strokeWidth: 3 };
  // Label liegt innerhalb des Bandes; ist das Band zu dünn, rutscht es über die Oberkante.
  const bandHeight = bandBottom - bandTop;
  const labelY = bandHeight >= 22 ? bandTop + 14 : Math.max(10, bandTop - 5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full rounded-xl bg-stone-50">
      {range && (
        <>
          <rect
            x={bandX}
            y={bandTop}
            width={bandWidth}
            height={bandHeight}
            fill="var(--color-emerald-100)"
            opacity={0.5}
          />
          <line
            x1={bandX}
            y1={bandTop}
            x2={bandX + bandWidth}
            y2={bandTop}
            stroke="var(--color-emerald-500)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />
          <line
            x1={bandX}
            y1={bandBottom}
            x2={bandX + bandWidth}
            y2={bandBottom}
            stroke="var(--color-emerald-500)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />
          <text
            x={bandX + 6}
            y={labelY}
            className="fill-emerald-700 text-[10px] font-semibold"
            {...halo}
          >
            Ideal: {formatRange(range)}
          </text>
        </>
      )}
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {entries.map((e) => (
        <circle key={e.id} cx={X(e.date)} cy={Y(e.weightKg)} r="4" fill="var(--color-accent)" />
      ))}
      <text x={pad} y={pad - 8} className="fill-stone-500 text-[10px]" {...halo}>
        {formatKg(high)}
      </text>
      <text x={pad} y={height - pad - 8} className="fill-stone-500 text-[10px]" {...halo}>
        {formatKg(low)}
      </text>
      <text x={width - pad} y={height - 6} className="fill-stone-500 text-[10px]" textAnchor="end">
        {formatDateShort(maxX)}
      </text>
      <text x={pad} y={height - 6} className="fill-stone-400 text-[10px]">
        {formatDateShort(minX)}
      </text>
    </svg>
  );
}

const STATUS_CHIP_CLASS: Record<WeightStatus, string> = {
  norm: 'bg-emerald-100 text-emerald-800',
  under: 'bg-amber-100 text-amber-800',
  over: 'bg-red-100 text-red-800'
};

function statusChip(weightKg: number, range: BreedRange | null) {
  const status = classifyWeight(weightKg, range);
  if (!status || !range) return null;
  return <span className={`chip ${STATUS_CHIP_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

// Kompakte Status-Icons für die Liste: roter Pfeil hoch = Übergewicht,
// grüner Haken = Idealbereich, roter Pfeil runter = Untergewicht.
function statusIcon(weightKg: number, range: BreedRange | null) {
  const status = classifyWeight(weightKg, range);
  if (!status) return null;
  if (status === 'norm') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-emerald-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Im Idealbereich"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-red-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={status === 'over' ? 'Übergewicht' : 'Untergewicht'}
    >
      {status === 'over' ? (
        <path d="M12 19V5M5 12l7-7 7 7" />
      ) : (
        <path d="M12 5v14M19 12l-7 7-7-7" />
      )}
    </svg>
  );
}

export default function WeightTab({ dog }: Props) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<WeightEntry | null>(null);

  const breedRange = findBreedRange(dog.rasse);
  const growth = findGrowth(dog.rasse);
  const dogId = dog.id;

  // Richtbereich für ein bestimmtes Datum: Für Jungtiere das altersabhängige
  // Wachstumsband (Alter zum Eintragsdatum, nicht heute), sonst die adult-Spanne.
  const rangeForDate = (date: string): { range: BreedRange | null; growth: boolean } => {
    const months = ageInMonths(dog.geburtsdatum, date);
    const growthRange = months !== null && growth !== null ? rangeAt(months, growth) : null;
    return growthRange
      ? { range: growthRange, growth: true }
      : { range: breedRange, growth: false };
  };

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
  const latestRange = latest ? rangeForDate(latest.date) : { range: breedRange, growth: false };
  const latestAgeMonths = latest ? ageInMonths(dog.geburtsdatum, latest.date) : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1">
          {latest && <p className="text-lg font-bold">{formatKg(latest.weightKg)}</p>}
          {latest && statusChip(latest.weightKg, latestRange.range)}
          {latest && latestRange.range && (
            <p className="mt-1 text-xs text-stone-500">
              {latestRange.growth && latestAgeMonths !== null
                ? `Richtwert mit ${latestAgeMonths} Monaten: ${formatRange(latestRange.range)}`
                : `Richtwert für die Rasse: ${formatRange(latestRange.range)}`}
            </p>
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
          <button className="shrink-0 font-semibold underline" onClick={load}>
            Erneut versuchen
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-stone-500">Wird geladen…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <p className="font-semibold text-stone-700">Keine Gewichtseinträge</p>
          <p className="mt-1 text-sm text-stone-500">
            Trage das erste Gewicht ein, um den Verlauf zu sehen.
          </p>
          <button className="btn-primary mt-4" onClick={() => setAdding(true)}>
            Gewicht hinzufügen
          </button>
        </div>
      ) : (
        <>
          {entries.length >= 2 && <WeightChart entries={entries} range={latestRange.range} />}
          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {[...entries].reverse().map((e, i) => (
              <div
                key={e.id}
                className={`flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-2.5 last:border-0 ${i === 0 ? 'bg-accent-tint/40' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium">{formatDateShort(e.date)}</p>
                  {e.note && <p className="text-xs text-stone-500">{e.note}</p>}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {statusIcon(e.weightKg, rangeForDate(e.date).range)}
                  <span className="text-sm font-semibold">{formatKg(e.weightKg)}</span>
                  <IconButton label="Bearbeiten" onClick={() => setEditing(e)}>
                    <PencilIcon className="h-5 w-5" />
                  </IconButton>
                  <IconButton label="Löschen" danger onClick={() => handleDelete(e)}>
                    <TrashIcon className="h-5 w-5" />
                  </IconButton>
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
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={load}
        />
      )}
    </div>
  );
}
