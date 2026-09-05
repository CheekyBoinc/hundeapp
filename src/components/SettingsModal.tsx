import { useRef, useState } from 'react';
import type { Settings } from '../settings';
import { exportBackup, formatCounts, importBackup, readBackupFile } from '../backup';
import Modal from './Modal';
import SyncSetup from './SyncSetup';

interface Props {
  settings: Settings;
  configured: boolean;
  onChange: (s: Settings) => void;
  onConnected: (user: string, repo: string, token: string) => void;
  onDisconnect: () => void;
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
  onChange,
  onConnected,
  onDisconnect,
  onClose
}: Props) {
  const [showSyncSetup, setShowSyncSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
      const ok = window.confirm(
        `Die Datei enthält ${formatCounts(counts)}. Sie werden mit den vorhandenen Daten zusammengeführt, nichts wird überschrieben. Fortfahren?`
      );
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

  function handleDisconnect() {
    if (
      !window.confirm(
        'Synchronisierung trennen? Die Zugangsdaten werden von diesem Gerät entfernt. Deine Einträge bleiben lokal erhalten.'
      )
    )
      return;
    onDisconnect();
  }

  return (
    <Modal title="Einstellungen" onClose={onClose}>
      <div className="space-y-5">
        <Section title="Darstellung">
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

        <Section title="Erweitert">
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-stone-800">GitHub-Synchronisierung</p>
            {configured ? (
              <>
                <p className="mt-0.5 text-xs text-stone-500">
                  Verbunden. Beim Trennen bleiben alle Einträge auf diesem Gerät erhalten.
                </p>
                <button type="button" className="btn-danger mt-3" onClick={handleDisconnect}>
                  Synchronisierung trennen
                </button>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-stone-500">
                  Automatischer Abgleich zwischen Geräten über ein eigenes privates GitHub-Repo.
                  Braucht ein GitHub-Konto und einen Zugriffstoken.
                </p>
                <button
                  type="button"
                  className="btn-secondary mt-3"
                  onClick={() => setShowSyncSetup(true)}
                >
                  Einrichten
                </button>
              </>
            )}
          </div>
        </Section>

        <p className="text-center text-xs text-stone-500">
          <a
            href="https://cheekyboinc.github.io/hundeapp/datenschutz.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-stone-700"
          >
            Datenschutzerklärung
          </a>
        </p>
      </div>

      {showSyncSetup && (
        <SyncSetup
          onClose={() => setShowSyncSetup(false)}
          onDone={(user, repo, token) => {
            setShowSyncSetup(false);
            onConnected(user, repo, token);
          }}
        />
      )}
    </Modal>
  );
}
