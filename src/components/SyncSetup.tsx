import { useState } from 'react';
import { SyncError, validateConfig } from '../github';
import Modal from './Modal';

interface Props {
  onDone: (user: string, repo: string, token: string) => void;
  onClose: () => void;
}

// Einrichtung der optionalen GitHub-Synchronisierung. Erreichbar über
// Einstellungen → Erweitert; die App selbst läuft ohne sie vollständig lokal.
export default function SyncSetup({ onDone, onClose }: Props) {
  const [user, setUser] = useState('');
  const [repo, setRepo] = useState('hundeapp-daten');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = user.trim();
    const r = repo.trim();
    const t = token.trim();
    if (!u || !r || !t) {
      setError('Bitte alle drei Felder ausfüllen.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await validateConfig({ user: u, repo: r, token: t });
      onDone(u, r, t);
    } catch (err) {
      setError(err instanceof SyncError ? err.message : 'Verbindung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="GitHub-Synchronisierung" onClose={onClose}>
      <p className="mb-4 text-sm text-stone-600">
        Für Fortgeschrittene: Die Daten werden in einem privaten GitHub-Repo gespeichert und
        zwischen allen Geräten abgeglichen, die denselben Token benutzen. Ohne GitHub-Konto nutze
        stattdessen die Sicherung als Datei.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">GitHub-Benutzername</label>
          <input
            className="input"
            placeholder="z. B. deinname"
            autoComplete="username"
            value={user}
            onChange={(ev) => setUser(ev.target.value)}
          />
        </div>
        <div>
          <label className="label">Repo-Name (privates Daten-Repo)</label>
          <input
            className="input"
            placeholder="hundeapp-daten"
            value={repo}
            onChange={(ev) => setRepo(ev.target.value)}
          />
        </div>
        <div>
          <label className="label">Personal Access Token</label>
          <input
            type="password"
            className="input"
            placeholder="github_pat_…"
            autoComplete="off"
            value={token}
            onChange={(ev) => setToken(ev.target.value)}
          />
          <p className="mt-1.5 text-xs text-stone-500">
            Auf github.com unter Settings → Developer settings → Personal access tokens →
            Fine-grained tokens erstellen. Nur für das Repo oben, Berechtigung „Contents: Read &
            Write“.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Verbinde…' : 'Verbinden & synchronisieren'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  );
}
