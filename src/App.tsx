import { useEffect, useState } from 'react';
import { clearConfig, isConfigured, onChange, pullNow, pushNow, setConfig } from './github';
import EntriesPage from './components/EntriesPage';
import CommandsPage from './components/CommandsPage';
import SyncSetup from './components/SyncSetup';
import { PawIcon } from './components/PawIcon';

type Tab = 'eintraege' | 'kommandos';

export default function App() {
  const [configured, setConfigured] = useState(isConfigured());
  const [skipSetup, setSkipSetup] = useState(false);
  const [tab, setTab] = useState<Tab>('eintraege');
  const [status, setStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    const run = () => {
      setStatus('syncing');
      pushNow()
        .then(() => {
          if (cancelled) return;
          setStatus('ok');
          setLastSync(new Date().toLocaleTimeString('de-DE'));
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setStatus('error');
          setErrorMsg(err.message);
        });
    };
    run();
    const unsub = onChange(() => {
      if (!cancelled) {
        setStatus('ok');
        setLastSync(new Date().toLocaleTimeString('de-DE'));
      }
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        pullNow().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      unsub();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [configured]);

  if (!configured && !skipSetup) {
    return (
      <SyncSetup
        onSkip={() => setSkipSetup(true)}
        onDone={(user, repo, token) => {
          setConfig({ user, repo, token });
          setConfigured(true);
        }}
      />
    );
  }

  const handleSyncNow = () => {
    setStatus('syncing');
    pushNow()
      .then(() => {
        setStatus('ok');
        setLastSync(new Date().toLocaleTimeString('de-DE'));
      })
      .catch((err: Error) => {
        setStatus('error');
        setErrorMsg(err.message);
      });
  };

  const handleDisconnect = () => {
    clearConfig();
    setConfigured(false);
  };

  const statusDot = {
    syncing: 'bg-amber-400',
    ok: 'bg-emerald-500',
    error: 'bg-red-500'
  }[status as 'syncing' | 'ok' | 'error'];

  return (
    <div className="min-h-dvh bg-stone-50 pb-24 text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#faf7f2]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
              <PawIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Hundeapp</h1>
              <p className="text-xs text-stone-500">Trainingstagebuch</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 sm:px-3 sm:py-1.5 sm:text-sm"
              onClick={handleSyncNow}
              title="Jetzt synchronisieren"
            >
              Aktualisieren
            </button>
            <button
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 sm:px-3 sm:py-1.5 sm:text-sm"
              onClick={handleDisconnect}
              title="Synchronisierung trennen"
            >
              Trennen
            </button>
            <span className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot}`} />
              <span className="hidden text-xs text-stone-500 min-[420px]:inline">
                {status === 'syncing' && 'Sync…'}
                {status === 'ok' && (lastSync ? `Sync ${lastSync}` : 'Synchron')}
                {status === 'error' && 'Sync-Fehler'}
                {status === 'idle' && ''}
              </span>
            </span>
          </div>
        </div>
      </header>

      {status === 'error' && errorMsg && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-700">
          {errorMsg}
        </div>
      )}
      {!configured && skipSetup && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <span>Nur auf diesem Gerät gespeichert – ohne GitHub-Sync.</span>
          <button
            className="font-semibold underline"
            onClick={() => {
              setSkipSetup(false);
            }}
          >
            Sync einrichten
          </button>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-4">
        {tab === 'eintraege' ? <EntriesPage /> : <CommandsPage />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-1 px-4 py-2">
          {(
            [
              ['eintraege', 'Einträge'],
              ['kommandos', 'Kommandos']
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                tab === id ? 'bg-orange-100 text-orange-900' : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
