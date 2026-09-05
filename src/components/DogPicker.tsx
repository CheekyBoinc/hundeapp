import type { DogProfile } from '../types';
import Modal from './Modal';

interface Props {
  dogs: DogProfile[];
  activeDogId: string | null;
  onSelect: (dogId: string) => void;
  onClose: () => void;
}

// Kleiner Wechsler für den aktiven Hund, erreichbar über die Kopfzeile.
export default function DogPicker({ dogs, activeDogId, onSelect, onClose }: Props) {
  return (
    <Modal title="Hund wählen" onClose={onClose}>
      <div className="space-y-2">
        {dogs.map((d) => {
          const active = d.id === activeDogId;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                onSelect(d.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                active
                  ? 'border-accent-mid bg-accent-tint'
                  : 'border-stone-200 bg-white hover:bg-stone-100'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-bold text-accent-dark">
                {d.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-stone-800">{d.name}</span>
                {d.rasse && <span className="block text-xs text-stone-500">{d.rasse}</span>}
              </span>
              {active && <span className="chip bg-accent-soft text-accent-dark">Aktiv</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
