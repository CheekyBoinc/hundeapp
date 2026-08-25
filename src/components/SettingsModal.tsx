import type { Settings } from '../settings';
import Modal from './Modal';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

function Toggle({
  label,
  hint,
  value,
  onToggle
}: {
  label: string;
  hint?: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-stone-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          value ? 'bg-accent' : 'bg-stone-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default function SettingsModal({ settings, onChange, onClose }: Props) {
  return (
    <Modal title="Einstellungen" onClose={onClose}>
      <div className="space-y-3">
        <Toggle
          label="Buttons oben anzeigen"
          hint="Einträge / Kommandos oben statt unten"
          value={settings.navTop}
          onToggle={() => onChange({ ...settings, navTop: !settings.navTop })}
        />
        <Toggle
          label="Kopfzeile kompakt"
          hint="App-Name und Untertitel ausblenden"
          value={!settings.headerText}
          onToggle={() => onChange({ ...settings, headerText: !settings.headerText })}
        />
      </div>
    </Modal>
  );
}
