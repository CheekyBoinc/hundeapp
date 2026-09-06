import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { closeTopModal } from './modalStack';
import {
  clearConfig,
  isConfigured,
  onChange,
  onSyncError,
  onSyncNotice,
  pullNow,
  pushNow,
  setConfig
} from './github';
import { loadSettings, saveSettings, type Settings } from './settings';
import { applyTheme } from './theme';
import { discardUntouchedDemoData } from './localStore';
import { fetchDogs } from './api';
import { useLiveReload } from './hooks';
import type { DogProfile } from './types';
import EntriesPage from './components/EntriesPage';
import CommandsPage from './components/CommandsPage';
import DogsPage from './components/DogsPage';
import CalendarPage from './components/CalendarPage';
import SettingsModal from './components/SettingsModal';
import DogPicker from './components/DogPicker';
import { BrandMark } from './components/BrandMark';
import {
  CalendarIcon,
  ChevronDownIcon,
  ListCheckIcon,
  NotebookIcon,
  PawOutlineIcon
} from './components/NavIcons';

type Tab = 'eintraege' | 'kommandos' | 'hunde' | 'kalender';

const TABS: { id: Tab; label: string; Icon: (p: { className?: string }) => ReactElement }[] = [
  { id: 'eintraege', label: 'Einträge', Icon: NotebookIcon },
  { id: 'kommandos', label: 'Kommandos', Icon: ListCheckIcon },
  { id: 'hunde', label: 'Hunde', Icon: PawOutlineIcon },
  { id: 'kalender', label: 'Kalender', Icon: CalendarIcon }
];

export default function App() {
  const [configured, setConfigured] = useState(isConfigured());
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [tab, setTab] = useState<Tab>('eintraege');
  const [status, setStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  // Sync-Text nur kurz einblenden: beim Sync und bei Fehlern offen, nach
  // Erfolg klappt er nach kurzer Zeit ein und der Punkt rückt nach rechts.
  const [statusOpen, setStatusOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDogPicker, setShowDogPicker] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [dogs, setDogs] = useState<DogProfile[]>([]);

  const handleSettings = useCallback((s: Settings) => setSettings(s), []);
  // Speichern und Design als Effekte, damit Setter stabil bleiben und keine
  // veralteten Einstellungen überschrieben werden.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);
  const [notice, setNotice] = useState<string | null>(null);

  // Hunde für die Kopfzeile; der aktive Hund wird in den Einstellungen gemerkt.
  const loadDogs = useCallback(async () => {
    try {
      setDogs(await fetchDogs());
    } catch {
      /* Kopfzeile fällt dann auf "Hundeapp" zurück */
    }
  }, []);
  useEffect(() => {
    loadDogs();
  }, [loadDogs]);
  useLiveReload(loadDogs);

  const activeDog = dogs.find((d) => d.id === settings.activeDogId) ?? dogs[0] ?? null;
  const setActiveDog = useCallback(
    (dogId: string | null) => setSettings((prev) => ({ ...prev, activeDogId: dogId })),
    []
  );

  // Android-Zurück-Taste: erst offenes Modal schließen, dann zur Startseite,
  // erst danach die App verlassen (Standard wäre sofortiges Beenden).
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapApp.addListener('backButton', () => {
      if (closeTopModal()) return;
      if (tabRef.current !== 'eintraege') {
        setTab('eintraege');
        return;
      }
      void CapApp.exitApp();
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, []);

  useEffect(() => {
    if (status === 'idle') {
      setStatusOpen(false);
      return;
    }
    setStatusOpen(true);
    if (status !== 'ok') return;
    const timer = setTimeout(() => setStatusOpen(false), 2500);
    return () => clearTimeout(timer);
  }, [status, lastSync]);

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
    const unsubError = onSyncError((message) => {
      if (!cancelled) {
        setStatus('error');
        setErrorMsg(message);
      }
    });
    const unsubNotice = onSyncNotice((message) => {
      if (!cancelled) setNotice(message);
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setStatus('syncing');
        pullNow()
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
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      unsub();
      unsubError();
      unsubNotice();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [configured]);

  const handleConnected = (user: string, repo: string, token: string) => {
    // Unveränderte Beispieldaten nicht in ein (bestehendes) Repo mischen.
    discardUntouchedDemoData();
    setConfig({ user, repo, token });
    setConfigured(true);
  };

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
    setStatus('idle');
    setErrorMsg(null);
    setShowSettings(false);
  };

  const statusDot = {
    idle: 'bg-stone-300',
    syncing: 'bg-amber-400',
    ok: 'bg-emerald-500',
    error: 'bg-red-500'
  }[status];

  const navButtons = (
    <div className="mx-auto flex max-w-5xl px-2 pt-1.5 pb-1">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold ${
              active ? 'text-accent-strong' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span
              className={`flex h-8 w-14 items-center justify-center rounded-full ${
                active ? 'bg-accent-soft' : ''
              }`}
            >
              <Icon className="h-5.5 w-5.5" />
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );

  const title = activeDog?.name ?? 'Hundeapp';
  const canSwitchDog = dogs.length > 1;

  const headerInner = (
    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark className="h-11 w-11 shrink-0 text-accent" />
        {settings.headerText && (
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => canSwitchDog && setShowDogPicker(true)}
            disabled={!canSwitchDog}
            title={canSwitchDog ? 'Hund wechseln' : undefined}
          >
            <span className="flex items-center gap-1">
              <span className="truncate text-xl font-bold leading-tight tracking-tight">
                {title}
              </span>
              {canSwitchDog && <ChevronDownIcon className="h-4 w-4 shrink-0 text-stone-400" />}
            </span>
            <span className="block text-xs text-stone-500">Trainingstagebuch</span>
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {configured && (
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            onClick={handleSyncNow}
            title="Jetzt synchronisieren"
            aria-label="Jetzt synchronisieren"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-5 w-5 ${status === 'syncing' ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        )}
        {configured && (
          <span className="flex items-center overflow-hidden" aria-live="polite">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-300 ${statusDot} ${
                status === 'syncing' ? 'animate-pulse' : ''
              }`}
            />
            <span
              className={`whitespace-nowrap text-xs text-stone-500 transition-all duration-500 ease-out ${
                statusOpen ? 'ml-1.5 max-w-40 opacity-100' : 'ml-0 max-w-0 opacity-0'
              }`}
            >
              {status === 'syncing' && 'Sync…'}
              {status === 'ok' && (lastSync ? `Sync ${lastSync}` : 'Synchron')}
              {status === 'error' && 'Sync-Fehler'}
            </span>
          </span>
        )}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700"
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
      {notice && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <span>{notice}</span>
          <button
            type="button"
            className="tap-target shrink-0 font-semibold underline"
            onClick={() => setNotice(null)}
          >
            OK
          </button>
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-4 pb-28">
        {tab === 'eintraege' && <EntriesPage />}
        {tab === 'kommandos' && <CommandsPage />}
        {tab === 'hunde' && (
          <DogsPage activeDogId={activeDog?.id ?? null} onActiveDogChange={setActiveDog} />
        )}
        {tab === 'kalender' && <CalendarPage />}
      </main>

      {!settings.navTop && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          {navButtons}
        </nav>
      )}

      {showDogPicker && (
        <DogPicker
          dogs={dogs}
          activeDogId={activeDog?.id ?? null}
          onSelect={setActiveDog}
          onClose={() => setShowDogPicker(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          configured={configured}
          onChange={handleSettings}
          onConnected={handleConnected}
          onDisconnect={handleDisconnect}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
