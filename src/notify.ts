import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { loadState } from './localStore';
import { loadSettings } from './settings';
import { planReminders } from './reminders';

// Anbindung der Erinnerungen an das System. Nur auf echten Geräten; im Browser
// gibt es keine lokalen Benachrichtigungen.

const DEBOUNCE_MS = 1000;
const STALE_MS = 12 * 60 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | undefined;
let lastPlanned = 0;

async function plan(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id }))
      });
    }
    const plan = planReminders(loadState(), loadSettings(), new Date());
    if (plan.length > 0) await LocalNotifications.schedule({ notifications: plan });
    lastPlanned = Date.now();
  } catch {
    // Erinnerungen sind Beiwerk; ein Fehler darf die App nicht stören.
  }
}

// Nach Änderungen aufrufen: kurz warten, dann alles neu planen. Das ersetzt
// auch Erinnerungen, die durch Löschen oder Erledigen hinfällig geworden sind.
export function rescheduleReminders(): void {
  if (!Capacitor.isNativePlatform()) return;
  clearTimeout(timer);
  timer = setTimeout(() => void plan(), DEBOUNCE_MS);
}

// Beim Zurückkehren in die App: nur, wenn die letzte Planung lange her ist.
export function rescheduleIfStale(): void {
  if (Date.now() - lastPlanned > STALE_MS) rescheduleReminders();
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

export async function notificationsAllowed(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}

// Nur für Test-Builds mit VITE_DEBUG_REMINDERS: eine Erinnerung in einer Minute.
export async function sendTestReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform() || import.meta.env.VITE_DEBUG_REMINDERS !== '1') return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 424242,
          title: 'Test-Erinnerung',
          body: 'Wenn du das siehst, funktionieren die Erinnerungen.',
          schedule: {
            at: new Date(Date.now() + 60 * 1000),
            allowWhileIdle: true
          },
          extra: { tab: 'eintraege' },
          isExactNotification: false
        }
      ]
    });
  } catch {
    // nichts weiter
  }
}

// Tippen auf eine Erinnerung: Ziel-Tab melden und, falls das Ereignis vor dem
// ersten Render eintrifft, für den Aufrufer merken.
type TabKey = 'kalender' | 'eintraege';

let pendingTab: TabKey | null = null;
let listenerStarted = false;
let tabHandler: ((tab: TabKey) => void) | null = null;

function startListener(): void {
  if (listenerStarted || !Capacitor.isNativePlatform()) return;
  listenerStarted = true;
  void LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const ziel = (action.notification.extra as { tab?: TabKey } | undefined)?.tab;
    if (ziel !== 'kalender' && ziel !== 'eintraege') return;
    if (tabHandler) tabHandler(ziel);
    else pendingTab = ziel;
  }).catch(() => undefined);
}

export function onNotificationTab(fn: (tab: TabKey) => void): void {
  startListener();
  tabHandler = fn;
  if (pendingTab) {
    const ziel = pendingTab;
    pendingTab = null;
    fn(ziel);
  }
}
