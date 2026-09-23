import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { loadState } from './localStore';
import { notifyNotice } from './sync';
import { loadSettings } from './settings';
import { planReminders } from './reminders';

// Anbindung der Erinnerungen an das System. Nur auf echten Geräten; im Browser
// gibt es keine lokalen Benachrichtigungen.

const DEBOUNCE_MS = 1000;
const STALE_MS = 12 * 60 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | undefined;
let lastPlanned = 0;
let laufend: Promise<void> | null = null;
let erneut = false;

async function plan(): Promise<void> {
  try {
    // Erst planen, dann aufräumen: Geht das Planen schief, bleiben die
    // bisherigen Erinnerungen bestehen, statt dass der Nutzer ohne dasteht.
    const neu = planReminders(loadState(), loadSettings(), new Date());
    if (neu.length > 0) await LocalNotifications.schedule({ notifications: neu });
    const neueIds = new Set(neu.map((n) => n.id));
    const alte = await LocalNotifications.getPending();
    const ueberzaehlig = alte.notifications.filter((n) => !neueIds.has(n.id));
    if (ueberzaehlig.length > 0) {
      await LocalNotifications.cancel({
        notifications: ueberzaehlig.map((n) => ({ id: n.id }))
      });
    }
    lastPlanned = Date.now();
  } catch {
    // Ein Fehler darf die App nicht stören, aber auch nicht stumm bleiben.
    notifyNotice('Erinnerungen konnten nicht geplant werden.');
  }
}

// Nur ein Lauf zur Zeit; kommt währenddessen ein neuer Wunsch, wird danach
// genau einmal nachgeplant.
function anstossen(): void {
  if (laufend) {
    erneut = true;
    return;
  }
  laufend = plan().finally(() => {
    laufend = null;
    if (erneut) {
      erneut = false;
      anstossen();
    }
  });
}

// Nach Änderungen aufrufen: kurz warten, dann alles neu planen. Das ersetzt
// auch Erinnerungen, die durch Löschen oder Erledigen hinfällig geworden sind.
export function rescheduleReminders(): void {
  if (!Capacitor.isNativePlatform()) return;
  clearTimeout(timer);
  timer = setTimeout(anstossen, DEBOUNCE_MS);
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
  if (!Capacitor.isNativePlatform() || import.meta.env.PROD) return;
  if (import.meta.env.VITE_DEBUG_REMINDERS !== '1') return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          // Außerhalb des Hash-Bereichs (0 … 2^31-1) der echten Erinnerungen.
          id: -424242,
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
