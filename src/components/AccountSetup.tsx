import { useState } from 'react';
import Modal from './Modal';
import { confirmCode, requestCode } from '../sync';

interface Props {
  onClose: () => void;
  onConnected: () => void;
}

// Anmeldung am Sync-Dienst: E-Mail-Adresse eingeben, Code aus der Mail
// eintragen, fertig. Der Code kommt per Mail, damit weder Zugangsdaten noch
// ein Link im Spiel sind.
export default function AccountSetup({ onClose, onConnected }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address) {
      setError('Bitte E-Mail-Adresse eingeben.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestCode(address);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der Code konnte nicht verschickt werden.');
    } finally {
      setBusy(false);
    }
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmCode(email.trim(), code);
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die Anmeldung ist fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Hundeapp-Sync" onClose={onClose}>
      <p className="mb-4 text-sm text-stone-600">
        Melde dich mit deiner E-Mail-Adresse an. Du bekommst einen Code zugeschickt und gibst ihn hier
        ein. Danach gleichen sich deine Geräte automatisch ab.
      </p>

      {!sent ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className="label">E-Mail-Adresse</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="name@beispiel.de"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Sende…' : 'Code senden'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={connect} className="space-y-4">
          <p className="text-sm text-stone-600">
            Wir haben einen Code an <strong className="break-all">{email.trim()}</strong> geschickt.
          </p>
          <div>
            <label className="label">Code aus der E-Mail</label>
            <input
              className="input tracking-widest"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(ev) => setCode(ev.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Verbinde…' : 'Verbinden'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSent(false);
                setCode('');
                setError(null);
              }}
            >
              Zurück
            </button>
          </div>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-stone-500">
        <a
          href="https://cheekyboinc.github.io/hundeapp/datenschutz.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-stone-700"
        >
          Datenschutz
        </a>
      </p>
    </Modal>
  );
}
