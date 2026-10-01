// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Paket 5: unveränderte Pläne werden übersprungen. Geprüft wird über
// getPending, weil es bei jedem durchgeführten Lauf aufgerufen wird – auch
// wenn der Plan leer ist und deshalb nichts einzuplanen gibt.
const mocks = vi.hoisted(() => ({
  schedule: vi.fn(async () => undefined),
  getPending: vi.fn(async () => ({ notifications: [] as { id: number }[] })),
  cancel: vi.fn(async () => undefined),
  requestPermissions: vi.fn(async () => ({ display: 'granted' })),
  checkPermissions: vi.fn(async () => ({ display: 'granted' })),
  addListener: vi.fn(async () => ({ remove: async () => undefined }))
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: mocks }));

// Modulzustand (der gemerkte Plan) liegt im Modul; für jeden Test neu laden.
async function lade(): Promise<typeof import('./notify')> {
  vi.resetModules();
  return await import('./notify');
}

describe('Erinnerungen nur bei geändertem Plan', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const fn of Object.values(mocks)) fn.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ruft das Plugin bei gleichem Stand nur einmal auf', async () => {
    const notify = await lade();

    notify.rescheduleReminders();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.getPending).toHaveBeenCalledTimes(1);

    notify.rescheduleReminders();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.getPending).toHaveBeenCalledTimes(1);
  });

  it('plant nach dem Verwerfen wieder', async () => {
    const notify = await lade();

    notify.rescheduleReminders();
    await vi.advanceTimersByTimeAsync(1000);
    notify.forgetReminderPlan();
    notify.rescheduleReminders();
    await vi.advanceTimersByTimeAsync(1000);

    expect(mocks.getPending).toHaveBeenCalledTimes(2);
  });

  it('verwirft den Plan auch bei langer Pause', async () => {
    const notify = await lade();

    notify.rescheduleReminders();
    await vi.advanceTimersByTimeAsync(1000);
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000);
    notify.rescheduleIfStale();
    await vi.advanceTimersByTimeAsync(1000);

    expect(mocks.getPending).toHaveBeenCalledTimes(2);
  });

  it('tut im Browser nichts', async () => {
    const notify = await lade();
    notify.rescheduleReminders();
    await vi.advanceTimersByTimeAsync(1000);
    // Ohne echte Plattform bleibt es beim Zugriff auf die Erinnerungen aus;
    // der gemerkte Plan ist danach gesetzt, ein zweiter Lauf spart die Arbeit.
    notify.rescheduleReminders();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
