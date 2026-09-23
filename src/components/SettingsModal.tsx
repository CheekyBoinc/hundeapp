import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../settings';
import type { ThemeSetting } from '../theme';
import {
  exportBackup,
  formatCounts,
  formatImportSummary,
  importBackup,
  previewImport,
  readBackupFile
} from '../backup';
import { Capacitor } from '@capacitor/core';
import { notificationsAllowed, requestNotificationPermission, sendTestReminder } from '../notify';
import Modal from './Modal';
import { CoffeeIcon } from './NavIcons';

interface Props {
  settings: Settings;
  configured: boolean;
  provider: 'github' | 'cloud';
  cloudAvailable: boolean;
  cloudEmail: string | null;
  onChange: (s: Settings) => void;
  onDisconnect: () => void;
  onOpenSyncSetup: () => void;
  onOpenAccountSetup: () => void;
  onDeleteAccount: () => void;
  onOpenHelp: () => void;
  onStartOnboarding: () => void;
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

const WEEKDAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 0, label: 'So' }
];

const NOTIFICATION_HINT =
  'Benachrichtigungen sind für die Hundeapp ausgeschaltet. Du kannst sie in den Systemeinstellungen erlauben.';

// Nur in Test-Builds gesetzt (siehe docs/entwicklung.md).
const DEBUG_REMINDERS = import.meta.env.VITE_DEBUG_REMINDERS === '1' && !import.meta.env.PROD;

// Feedback per Mail: vorausgefüllt werden nur App-Version und Plattform.
function feedbackMailto(): string {
  const platform = Capacitor.getPlatform();
  const name = platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : 'Web';
  const subject = encodeURIComponent('Hundeapp: Feedback');
  const body = encodeURIComponent(`App-Version ${__APP_VERSION__} (${name})`);
  return `mailto:hundeapp@thundermail.com?subject=${subject}&body=${body}`;
}

const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' }
];

function ThemePicker({
  value,
  onChange
}: {
  value: ThemeSetting;
  onChange: (t: ThemeSetting) => void;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <span className="block text-sm font-medium text-stone-800">Design</span>
      <span className="mt-0.5 block text-xs text-stone-500">
        „System" folgt der Einstellung deines Handys.
      </span>
      <div
        role="radiogroup"
        aria-label="Design"
        className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1"
      >
        {THEME_OPTIONS.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`min-h-10 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? 'bg-white text-accent-dark shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="label">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function SettingsModal({
  settings,
  configured,
  provider,
  cloudAvailable,
  cloudEmail,
  onChange,
  onDisconnect,
  onOpenSyncSetup,
  onOpenAccountSetup,
  onDeleteAccount,
  onOpenHelp,
  onStartOnboarding,
  onClose
}: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeCloud = provider === 'cloud' && configured;
  const activeGithub = provider === 'github' && configured;

  // Beim Öffnen prüfen, ob die Erlaubnis noch steht: Wurde sie im System
  // entzogen, bleiben die Schalter aus.
  useEffect(() => {
    if (!settings.remindHealth && !settings.remindTraining) return;
    void notificationsAllowed().then((erlaubt) => {
      if (!erlaubt) onChange({ ...settings, remindHealth: false, remindTraining: false });
    });
  }, [settings, onChange]);

  async function enableReminders(art: 'health' | 'training') {
    if (art === 'health' ? settings.remindHealth : settings.remindTraining) {
      onChange({
        ...settings,
        ...(art === 'health' ? { remindHealth: false } : { remindTraining: false })
      });
      return;
    }
    if (await requestNotificationPermission()) {
      onChange({
        ...settings,
        ...(art === 'health' ? { remindHealth: true } : { remindTraining: true })
      });
    } else {
      setNotice({ kind: 'error', text: NOTIFICATION_HINT });
    }
  }

  function toggleDay(tag: number) {
    const tage = settings.trainingDays.includes(tag)
      ? settings.trainingDays.filter((t) => t !== tag)
      : [...settings.trainingDays, tag].sort((a, b) => a - b);
    onChange({ ...settings, trainingDays: tage });
  }

  async function handleExport() {
    setBusy(true);
    setNotice(null);
    try {
      await exportBackup();
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Sicherung konnte nicht erstellt werden.'
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFile(file: File) {
    setBusy(true);
    setNotice(null);
    try {
      const { state, counts } = await readBackupFile(file);
      const ok = window.confirm(formatImportSummary(counts, previewImport(state)));
      if (!ok) return;
      importBackup(state);
      setNotice({ kind: 'ok', text: `Sicherung eingespielt: ${formatCounts(counts)}.` });
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Die Datei konnte nicht gelesen werden.'
      });
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <Modal title="Einstellungen" onClose={onClose}>
      <div className="space-y-5">
        <Section title="Darstellung">
          <ThemePicker
            value={settings.theme}
            onChange={(t) => onChange({ ...settings, theme: t })}
          />
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
        </Section>

        <Section title="Erinnerungen">
          <Toggle
            label="Fällige Impfungen, Vorsorge und Tierarzttermine"
            hint="Sieben Tage vorher und am Tag selbst, morgens um 9 Uhr"
            value={settings.remindHealth}
            onToggle={() => void enableReminders('health')}
          />
          <Toggle
            label="Übungserinnerung"
            hint="Erinnert an die Aufgaben aus der letzten Stunde"
            value={settings.remindTraining}
            onToggle={() => void enableReminders('training')}
          />
          {settings.remindTraining && (
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <span className="label">Wochentage</span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((tag) => {
                  const an = settings.trainingDays.includes(tag.value);
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleDay(tag.value)}
                      className={`chip-toggle ${
                        an
                          ? 'border-accent bg-accent text-white'
                          : 'border-stone-300 bg-white text-stone-700'
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <label className="label">Uhrzeit</label>
                <input
                  type="time"
                  className="input"
                  value={settings.trainingTime}
                  onChange={(ev) => onChange({ ...settings, trainingTime: ev.target.value })}
                />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                Jedes Gerät plant seine eigenen Erinnerungen.
              </p>
            </div>
          )}
          {DEBUG_REMINDERS && (
            <button className="btn-secondary" onClick={() => void sendTestReminder()}>
              Test-Erinnerung in 1 Minute
            </button>
          )}
        </Section>

        <Section title="Hilfe">
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-stone-800">Einführung und Hilfe</p>
            <p className="mt-0.5 text-xs text-stone-500">
              Kurze Erklärungen zu den Bereichen der App, zur Sicherung und zum Abgleich zweier
              Handys.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={onOpenHelp}>
                Hilfe öffnen
              </button>
              <button type="button" className="btn-secondary" onClick={onStartOnboarding}>
                Einführung erneut zeigen
              </button>
            </div>
          </div>
        </Section>

        <Section title="Sicherung">
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs text-stone-500">
              Alle Daten als Datei sichern, z. B. für den Handywechsel oder um sie einem zweiten
              Gerät zu geben. Beim Einspielen wird zusammengeführt, nichts geht verloren.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-primary" disabled={busy} onClick={handleExport}>
                Sicherung erstellen
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                Sicherung einspielen
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(ev) => {
                  const file = ev.target.files?.[0];
                  if (file) void handleImportFile(file);
                }}
              />
            </div>
            {notice && (
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                  notice.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
                }`}
              >
                {notice.text}
              </p>
            )}
          </div>
        </Section>

        <Section title="Abgleich zwischen Geräten">
          {cloudAvailable && (
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-stone-800">Hundeapp-Sync</p>
              {activeCloud ? (
                <>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {cloudEmail ? `Verbunden als ${cloudEmail}.` : 'Verbunden.'} Beim Trennen
                    bleiben alle Einträge auf diesem Gerät erhalten.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-danger" onClick={onDisconnect}>
                      Verbindung trennen
                    </button>
                    <button type="button" className="btn-secondary" onClick={onDeleteAccount}>
                      Konto löschen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Konto per E-Mail, in der Einführungsphase kostenlos. Einträge, Kommandos und
                    Hunde gleichen sich dann von selbst zwischen deinen Geräten ab.
                  </p>
                  <button type="button" className="btn-secondary mt-3" onClick={onOpenAccountSetup}>
                    Verbinden
                  </button>
                </>
              )}
            </div>
          )}

          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-stone-800">Eigenes GitHub-Repo</p>
            {activeGithub ? (
              <>
                <p className="mt-0.5 text-xs text-stone-500">
                  Verbunden. Beim Trennen bleiben alle Einträge auf diesem Gerät erhalten.
                </p>
                <button type="button" className="btn-danger mt-3" onClick={onDisconnect}>
                  Synchronisierung trennen
                </button>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-stone-500">
                  Kostenlos, für Fortgeschrittene: Abgleich über ein eigenes privates GitHub-Repo.
                  Braucht ein GitHub-Konto und einen Zugriffstoken.
                </p>
                <button type="button" className="btn-secondary mt-3" onClick={onOpenSyncSetup}>
                  Einrichten
                </button>
              </>
            )}
          </div>
        </Section>

        <Section title="Über die App">
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            {Capacitor.getPlatform() !== 'ios' && (
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                  <CoffeeIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-stone-800">
                    Gefällt dir die Hundeapp?
                  </span>
                  <span className="block text-xs text-stone-500">
                    Kostenlos und ohne Werbung. Ein Kaffee hilft beim Weiterbauen.
                  </span>
                </span>
                <a
                  href="https://ko-fi.com/cloudplay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                >
                  Unterstützen
                </a>
              </div>
            )}
            <div
              className={`${
                Capacitor.getPlatform() !== 'ios' ? 'mt-3 border-t border-stone-100 pt-3' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-stone-500">
                  Fehler gefunden oder eine Idee? Schreib mir eine Mail.
                </span>
                <a href={feedbackMailto()} className="btn-secondary px-3 py-1.5 text-xs">
                  Feedback senden
                </a>
              </div>
              <p className="mt-1 text-xs text-stone-500">hundeapp@thundermail.com</p>
            </div>
            <p
              className={`text-center text-xs text-stone-500 ${
                Capacitor.getPlatform() !== 'ios' ? 'mt-3 border-t border-stone-100 pt-3' : ''
              }`}
            >
              Version {__APP_VERSION__} ·{' '}
              <a
                href="https://cheekyboinc.github.io/hundeapp/datenschutz.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-stone-700"
              >
                Datenschutz
              </a>{' '}
              ·{' '}
              <a
                href="https://cheekyboinc.github.io/hundeapp/datenschutz.html#impressum"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-stone-700"
              >
                Impressum
              </a>
            </p>
          </div>
        </Section>
      </div>
    </Modal>
  );
}
