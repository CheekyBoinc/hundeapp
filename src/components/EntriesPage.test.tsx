// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Erster Komponenten-Test, ohne zusätzliche Bibliothek: react-dom rendert in
// happy-dom, act() wartet auf Effekte und Zustandswechsel.

vi.mock('../notify', () => ({
  rescheduleReminders: () => undefined,
  rescheduleIfStale: () => undefined,
  forgetReminderPlan: () => undefined,
  onNotificationTab: () => undefined
}));

const speicherVoll = 'Speichern nicht möglich: Der Speicher ist voll oder gesperrt.';

vi.mock('../api', async (importOriginal) => {
  const echt = await importOriginal<typeof import('../api')>();
  return {
    ...echt,
    toggleEntryDone: vi.fn(() => Promise.reject(new Error(speicherVoll)))
  };
});

import EntriesPage from './EntriesPage';
import ErrorBanner from './ErrorBanner';
import { saveEntry } from '../localStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(element: React.ReactElement) {
  await act(async () => {
    root.render(element);
  });
}

describe('EntriesPage', () => {
  it('zeigt einen Fehler beim Abhaken an, statt ihn zu verschlucken', async () => {
    saveEntry(
      {
        date: '2026-10-01',
        ort: 'Hundeschule',
        was_gemacht: 'Sitz geübt',
        uebungsaufgaben: null,
        tipps: null,
        erledigt: false
      },
      []
    );
    await render(<EntriesPage />);

    const haken = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(haken).not.toBeNull();
    await act(async () => {
      haken!.click();
    });

    const meldung = container.querySelector('[role="alert"]');
    expect(meldung?.textContent).toContain(speicherVoll);
  });
});

describe('ErrorBanner', () => {
  it('zeichnet ohne Fehler nichts', async () => {
    await render(<ErrorBanner error={null} onRetry={() => undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('ruft beim Tipp auf „Erneut versuchen" das Neuladen auf', async () => {
    const onRetry = vi.fn();
    await render(<ErrorBanner error="Fehler beim Laden" onRetry={onRetry} />);
    expect(container.textContent).toContain('Fehler beim Laden');
    await act(async () => {
      container.querySelector('button')!.click();
    });
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
