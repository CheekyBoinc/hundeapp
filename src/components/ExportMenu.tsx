import { useEffect, useState } from 'react';
import { fetchCommands, fetchEntries, fetchWeights } from '../api';
import { downloadCSV, downloadPDF } from '../export';
import type { DogProfile } from '../types';
import Modal from './Modal';

interface Props {
  dog: DogProfile;
  onClose: () => void;
}

function entryRows(entries: Awaited<ReturnType<typeof fetchEntries>>) {
  return entries.map((e) => ({
    Datum: e.date,
    Ort: e.ort ?? '',
    Kommandos: e.commands.map((c) => c.name).join('; '),
    'Was gemacht': e.was_gemacht ?? '',
    Übungsaufgaben: e.uebungsaufgaben ?? '',
    Tipps: e.tipps ?? '',
    Erledigt: e.erledigt ? 'ja' : 'nein'
  }));
}

export default function ExportMenu({ dog, onClose }: Props) {
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof fetchEntries>>>([]);
  const [commands, setCommands] = useState<Awaited<ReturnType<typeof fetchCommands>>>([]);
  const [weights, setWeights] = useState<Awaited<ReturnType<typeof fetchWeights>>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [e, c, w] = await Promise.all([
          fetchEntries(),
          fetchCommands(),
          fetchWeights(dog.id)
        ]);
        if (cancelled) return;
        setEntries(e.filter((x) => x.dogId === dog.id || x.dogId === null));
        setCommands(c.filter((x) => x.dogId === dog.id || x.dogId === null));
        setWeights(w);
      } catch {
        /* still – ExportButtons bleiben dann schlicht weg */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dog.id]);

  const dogEntries = entries.filter((e) => e.dogId === dog.id || e.dogId === null);
  const dogCommands = commands.filter((c) => c.dogId === dog.id || c.dogId === null);

  function run(fn: () => void) {
    setBusy(true);
    try {
      fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Export – ${dog.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <p className="label">CSV (Excel / Sheets)</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              disabled={busy || dogEntries.length === 0}
              onClick={() =>
                run(() => downloadCSV(`eintraege-${dog.name}.csv`, entryRows(dogEntries)))
              }
            >
              Einträge
            </button>
            <button
              className="btn-secondary"
              disabled={busy || weights.length === 0}
              onClick={() =>
                run(() =>
                  downloadCSV(
                    `gewicht-${dog.name}.csv`,
                    [...weights]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((w) => ({
                        Datum: w.date,
                        'Gewicht (kg)': String(w.weightKg).replace('.', ','),
                        Notiz: w.note ?? ''
                      }))
                  )
                )
              }
            >
              Gewicht
            </button>
            <button
              className="btn-secondary"
              disabled={busy || dogCommands.length === 0}
              onClick={() =>
                run(() =>
                  downloadCSV(
                    `kommandos-${dog.name}.csv`,
                    dogCommands.map((c) => ({
                      Kommando: c.name,
                      Beschreibung: c.beschreibung ?? '',
                      Tipp: c.tipp ?? ''
                    }))
                  )
                )
              }
            >
              Kommandos
            </button>
          </div>
        </div>

        <div>
          <p className="label">PDF-Bericht</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-primary"
              disabled={busy || dogEntries.length === 0}
              onClick={() => run(() => downloadPDF(dog, dogEntries, dogCommands, weights))}
            >
              Trainingstagebuch als PDF
            </button>
          </div>
        </div>

        <p className="text-xs text-stone-500">
          Einträge und Kommandos ohne Hund-Zuordnung werden mit exportiert.
        </p>
      </div>
    </Modal>
  );
}
