import type { DogProfile } from '../types';
import { formatDateShort } from '../utils';

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

export default function DogProfileTab({ dog, onEdit }: Props) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{dog.name}</h3>
        <button className="btn-secondary px-3 py-1.5 text-sm" onClick={onEdit}>
          Bearbeiten
        </button>
      </div>

      <div>
        <Row label="Rasse" value={dog.rasse} />
        <Row
          label="Geburtsdatum"
          value={dog.geburtsdatum ? formatDateShort(dog.geburtsdatum) : null}
        />
        <Row
          label="Geschlecht"
          value={dog.geschlecht === 'w' ? 'Hündin' : dog.geschlecht === 'm' ? 'Rüde' : null}
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
