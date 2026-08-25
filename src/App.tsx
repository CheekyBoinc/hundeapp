import { useEffect, useState } from 'react';
import { clearConfig, isConfigured, onChange, pullNow, pushNow, setConfig } from './github';
import { loadSettings, saveSettings, type Settings } from './settings';
import EntriesPage from './components/EntriesPage';
import CommandsPage from './components/CommandsPage';
import DogsPage from './components/DogsPage';
import SyncSetup from './components/SyncSetup';
import SettingsModal from './components/SettingsModal';
import { PawIcon } from './components/PawIcon';

type Tab = 'eintraege' | 'kommandos' | 'hunde';

export default function App() {
  const [configured, setConfigured] = useState(isConfigured());
  const [skipSetup, setSkipSetup] = useState(false);
  const [tab, setTab] = useState<Tab>('eintraege');
  const [status, setStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

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

  const handleSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  const tabs: [Tab, string][] = [
    ['eintraege', 'Einträge'],
    ['kommandos', 'Kommandos'],
    ['hunde', 'Hunde']
  ];

  const statusDot = {
    syncing: 'bg-amber-400',
    ok: 'bg-emerald-500',
    error: 'bg-red-500'
  }[status as 'syncing' | 'ok' | 'error'];

  const navButtons = (
    <div className="mx-auto flex max-w-5xl gap-1 px-4 py-2">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
            tab === id ? 'bg-accent-soft text-accent-dark' : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const headerInner = (
    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
          <PawIcon className="h-6 w-6" />
        </div>
        {settings.headerText && (
          <div>
            <h1 className="text-lg font-bold leading-tight">Hundeapp</h1>
            <p className="text-xs text-stone-500">Trainingstagebuch</p>
          </div>
        )}
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
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          onClick={() => setShowSettings(true)}
          title="Einstellungen"
          aria-label="Einstellungen"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      {settings.navTop ? (
        <div className="sticky top-0 z-20">
          <header className="border-b border-stone-200 bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
            {headerInner}
          </header>
          <nav className="border-b border-stone-200 bg-white/95 backdrop-blur">{navButtons}</nav>
        </div>
      ) : (
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          {headerInner}
        </header>
      )}

      {status === 'error' && errorMsg && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-700">
          {errorMsg}
        </div>
      )}
      {offline && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
          Keine Verbindung – Änderungen werden gespeichert und später synchronisiert.
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

      <main className="mx-auto max-w-5xl px-4 py-4 pb-24">
        {tab === 'eintraege' && <EntriesPage />}
        {tab === 'kommandos' && <CommandsPage />}
        {tab === 'hunde' && <DogsPage />}
      </main>

      {!settings.navTop && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          {navButtons}
        </nav>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={handleSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
