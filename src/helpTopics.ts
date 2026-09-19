// Inhalte der Hilfe. Als Daten gehalten, damit die Komponente nur darstellt
// und die Formulierungen an einer Stelle liegen.
//
// Die Schritte zum Abgleich stehen ausführlicher in docs/einrichtung.md.
// Wird dort etwas geändert, gehört es hierher mit.

export interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  steps?: string[];
  // Themen mit einer Aktion bekommen unten einen Knopf.
  action?: 'sync' | 'onboarding';
  // Themen mit einem Schaubild bekommen es nach den Absätzen.
  diagram?: 'sync';
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'erste-schritte',
    title: 'Erste Schritte',
    summary: 'Hund anlegen, ersten Eintrag schreiben, Kommandos pflegen.',
    paragraphs: [
      'Lege zuerst deinen Hund unter „Hunde" an. Dort verwaltest du auch Gewicht, Kot-Tagebuch, Tierarztbesuche und Impfungen.',
      'Nach jedem Besuch in der Hundeschule schreibst du unter „Einträge" auf, was ihr gemacht habt: Ort, geübte Kommandos, Aufgaben und die Tipps der Trainerin.',
      'Unter „Kommandos" sammelst du die Übungen mit Beschreibung und Tipp. Die App zeigt dir, was du lange nicht geübt hast.'
    ]
  },
  {
    id: 'abgleich',
    title: 'Abgleich einrichten',
    summary: 'Zwei Handys über ein privates GitHub-Repo abgleichen.',
    paragraphs: [
      'Der Abgleich ist optional. Ohne ihn bleiben die Daten auf dem Gerät. Mit Abgleich schreibt die App den gesamten Stand in eine Datei in deinem privaten GitHub-Repo.',
      'Beide Handys benutzen dasselbe Repo und denselben Token. Läuft der Abgleich, zeigt die Kopfzeile den Zustand: grün heißt abgeglichen, gelb läuft gerade, rot ist ein Fehler.'
    ],
    steps: [
      'Auf github.com ein privates Repo anlegen, zum Beispiel hundeapp-daten.',
      'Einen feingliedrigen Token erstellen, nur für dieses Repo, Berechtigung „Contents: Read and Write".',
      'Benutzername, Repo-Name und Token in der App eintragen.',
      'Verbinden und synchronisieren.'
    ],
    action: 'sync',
    diagram: 'sync'
  },
  {
    id: 'sicherung',
    title: 'Sichern und Export',
    summary: 'Datei-Sicherung, CSV-Export und PDF-Bericht.',
    paragraphs: [
      'Unter Einstellungen → Sicherung schreibst du alle Daten in eine Datei. Sie eignet sich für den Handywechsel oder für ein zweites Gerät.',
      'Beim Einspielen wird zusammengeführt, nichts wird überschrieben.',
      'Auf der Seite „Hunde" gibt es zusätzlich einen Export: CSV für Tabellenprogramme und einen PDF-Bericht pro Hund.'
    ]
  },
  {
    id: 'daten',
    title: 'Meine Daten',
    summary: 'Was auf dem Gerät bleibt und was beim Abgleich passiert.',
    paragraphs: [
      'Alle Einträge liegen auf dem Gerät. Ohne eingerichteten Abgleich verlässt nichts das Handy.',
      'Beim Abgleich liegt der gesamte Stand als daten.json in deinem privaten GitHub-Repo. Der Zugangsschlüssel wird nur auf dem Gerät gespeichert, nie im Code.',
      'Geht ein Handy verloren, lösche den Token auf GitHub. Er gilt nur für dieses eine Repo und lässt sich dort jederzeit entfernen.',
      'Der Token hat ein Ablaufdatum. Läuft er ab, zeigt die App einen Sync-Fehler. Erstelle dann einen neuen und trage ihn in den Einstellungen ein.'
    ]
  },
  {
    id: 'einfuehrung',
    title: 'Einführung erneut zeigen',
    summary: 'Die Einführung noch einmal ansehen.',
    paragraphs: [
      'Die Einführung zeigt in fünf Schritten, wo die Trainings, die Hunde und der Kalender zu finden sind.',
      'Neue Nutzer sehen sie automatisch beim ersten Start. Hier kannst du sie jederzeit erneut starten.'
    ],
    action: 'onboarding'
  }
];
