import { useState } from 'react';
import { SyncError, validateConfig } from '../github';

interface Props {
  onDone: (user: string, repo: string, token: string) => void;
  onSkip: () => void;
}

export default function SyncSetup({ onDone, onSkip }: Props) {
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
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-accent-soft via-accent-tint to-stone-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Hundeapp</h1>
          <p className="mt-1 text-sm text-stone-600">
            Euer gemeinsames Trainingstagebuch. Jetzt Synchronisierung einrichten
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg">
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
            <label className="label">Repo-Name (Datenrepositium)</label>
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
              Erstellt ihr auf github.com unter Settings → Developer settings → Personal access
              tokens → Fine-grained tokens. Gilt nur für das Repo oben, Berechtigung „Contents:
              Read & Write“.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Verbinde…' : 'Verbinden & synchronisieren'}
          </button>

          <button
            type="button"
            className="w-full text-sm font-medium text-stone-500 underline hover:text-stone-700"
            onClick={onSkip}
          >
            Ohne Sync fortfahren (nur dieses Gerät)
          </button>
        </form>
      </div>
    </div>
  );
}
