import type { Settings } from '../settings';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

function Toggle({ label, hint, value, onToggle }: { label: string; hint?: string; value: boolean; onToggle: () => void }) {
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
          value ? 'bg-orange-500' : 'bg-stone-300'
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />
      <div className="relative max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-3xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Einstellungen</h2>
          <button className="btn-secondary px-3 py-1.5" onClick={onClose}>
            Schließen
          </button>
        </div>

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
      </div>
    </div>
  );
}
