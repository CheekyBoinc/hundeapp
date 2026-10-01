// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Der Fix: Auch ohne Sync muss eine lokale Änderung die Erinnerungen neu planen.
const huelle = vi.hoisted(() => ({ rescheduleReminders: vi.fn() }));

vi.mock('./notify', () => ({
  rescheduleReminders: huelle.rescheduleReminders,
  rescheduleIfStale: () => undefined,
  forgetReminderPlan: () => undefined,
  onNotificationTab: () => undefined
}));

import { saveCommand } from './api';
import { saveState } from './localStore';
import type { SyncState } from './sync/types';

function leererStand(): SyncState {
  return {
    commands: [],
    entries: [],
    dogs: [],
    weight: [],
    stool: [],
    vet: [],
    vaccinations: [],
    deleted: {
      commands: [],
      entries: [],
      dogs: [],
      weight: [],
      stool: [],
      vet: [],
      vaccinations: []
    }
  };
}

describe('Erinnerungen nach lokalen Änderungen', () => {
  beforeEach(() => {
    saveState(leererStand());
    huelle.rescheduleReminders.mockClear();
  });

  it('stößt nach einer lokalen Änderung eine Planung an', async () => {
    await saveCommand({ name: 'Sitz' });

    expect(huelle.rescheduleReminders).toHaveBeenCalledTimes(1);
  });

  it('stößt auch bei weiteren Änderungen jedes Mal an', async () => {
    await saveCommand({ name: 'Platz' });
    await saveCommand({ name: 'Bleib' });

    expect(huelle.rescheduleReminders).toHaveBeenCalledTimes(2);
  });
});
