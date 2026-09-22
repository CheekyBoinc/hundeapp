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
  action?: 'cloud' | 'github' | 'onboarding';
  // Themen mit einem Schaubild bekommen es nach den Absätzen.
  diagram?: 'sync';
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'erste-schritte',
    title: 'Erste Schritte',
    summary: 'Hund anlegen, ersten Eintrag schreiben, Kommandos pflegen.',
    paragraphs: [
      'Lege zuerst deinen Hund unter „Hunde" an. Dort verwaltest du auch Gewicht, Kot-Tagebuch, Tierarztbesuche und die Vorsorge: Impfungen, Entwurmung und Parasitenschutz.',
      'Nach jedem Besuch in der Hundeschule schreibst du unter „Einträge" auf, was ihr gemacht habt: Ort, geübte Kommandos, Aufgaben und die Tipps der Trainerin.',
      'Unter „Kommandos" sammelst du die Übungen mit Beschreibung und Tipp. Die App zeigt dir, was du lange nicht geübt hast.'
    ]
  },
  {
    id: 'abgleich-sync',
    title: 'Abgleich über Hundeapp-Sync',
    summary: 'Zwei Geräte mit einem Konto abgleichen, Anmeldung per E-Mail-Code.',
    paragraphs: [
      'Der Abgleich ist optional. Ohne ihn bleiben die Daten auf dem Gerät. Mit Konto schreibt die App den gesamten Stand auf einen Server und holt ihn auf deinen anderen Geräten wieder ab.',
      'Die Anmeldung läuft ohne Passwort: Du gibst deine E-Mail-Adresse ein und bekommst einen sechsstelligen Code zugeschickt. In der Einführungsphase ist der Dienst kostenlos. Danach kann ein einmaliger Preis dazukommen; das wird rechtzeitig angekündigt.',
      'Läuft der Abgleich, zeigt die Kopfzeile den Zustand: grün heißt abgeglichen, gelb läuft gerade, rot ist ein Fehler.'
    ],
    steps: [
      'Einstellungen öffnen und unter „Abgleich zwischen Geräten" bei Hundeapp-Sync auf „Verbinden" tippen.',
      'E-Mail-Adresse eingeben und „Code senden" wählen.',
      'Den Code aus der Mail eintragen und „Verbinden" wählen.',
      'Auf jedem weiteren Gerät dasselbe mit derselben Adresse tun.'
    ],
    action: 'cloud'
  },
  {
    id: 'abgleich-github',
    title: 'Abgleich über ein eigenes GitHub-Repo',
    summary: 'Für Fortgeschrittene: Abgleich über ein privates Repository.',
    paragraphs: [
      'Statt des Kontos kannst du ein eigenes privates GitHub-Repository verwenden. Die Daten liegen dann bei GitHub und nicht beim Anbieter.',
      'Beide Handys benutzen dasselbe Repo und denselben Token.'
    ],
    steps: [
      'Auf github.com ein privates Repo anlegen, zum Beispiel hundeapp-daten.',
      'Einen feingliedrigen Token erstellen, nur für dieses Repo, Berechtigung „Contents: Read and Write".',
      'Benutzername, Repo-Name und Token in der App eintragen.',
      'Verbinden und synchronisieren.'
    ],
    action: 'github',
    diagram: 'sync'
  },
  {
    id: 'sicherung',
    title: 'Sichern und Export',
    summary: 'Datei-Sicherung, CSV-Export und PDF-Bericht.',
    paragraphs: [
      'Unter Einstellungen → Sicherung schreibst du alle Daten in eine Datei. Sie eignet sich für den Handywechsel oder für ein zweites Gerät.',
      'Beim Einspielen wird zusammengeführt: Gibt es einen Datensatz auf beiden Seiten, gewinnt der neuere Stand.',
      'Auf der Seite „Hunde" gibt es zusätzlich einen Export: CSV für Tabellenprogramme und einen PDF-Bericht pro Hund.'
    ]
  },
  {
    id: 'daten',
    title: 'Meine Daten',
    summary: 'Was auf dem Gerät bleibt und was beim Abgleich passiert.',
    paragraphs: [
      'Alle Einträge liegen auf dem Gerät. Ohne eingerichteten Abgleich verlässt nichts das Handy.',
      'Ein Foto im Hundeprofil gehört zum Stand: Es wird mit abgeglichen und steckt in der Sicherungsdatei.',
      'Erinnerungen plant jedes Gerät für sich; dabei werden keine Daten übertragen.',
      'Beim Abgleich über Hundeapp-Sync liegen deine E-Mail-Adresse und der gesamte Stand auf einem Server des Anbieters, damit sich deine Geräte abgleichen können.',
      'Beim Abgleich über GitHub liegt der Stand als daten.json in deinem eigenen privaten Repository. Der Zugangsschlüssel wird nur auf dem Gerät gespeichert. Er hat ein Ablaufdatum; läuft er ab, zeigt die App einen Sync-Fehler.',
      'Dein Konto beim Dienst kannst du jederzeit löschen. In den Einstellungen unter „Abgleich zwischen Geräten" bei Hundeapp-Sync auf „Konto löschen". Damit verschwinden auch die Daten auf dem Server; die Einträge auf dem Gerät bleiben.'
    ]
  },
  {
    id: 'ueben-zwischen-den-stunden',
    title: 'Üben zwischen den Stunden',
    summary: 'Die Aufgaben aus der letzten Stunde im Blick behalten.',
    paragraphs: [
      'Nach jedem Besuch in der Hundeschule trägst du unter „Einträge" ein, was ihr geübt habt und was bis zur nächsten Stunde zu Hause dran ist.',
      'Solange diese Aufgaben offen sind, steht auf der Einträge-Seite oben eine Karte mit dem Text aus der Stunde und ihrem Datum.',
      'Mit „Heute geübt" hältst du in wenigen Tipps fest, dass du geübt hast; die Kommandos aus der Stunde sind schon ausgewählt. Ist die Aufgabe geschafft, tippst du auf „Erledigt".'
    ]
  },
  {
    id: 'erinnerungen',
    title: 'Erinnerungen',
    summary: 'Fällige Vorsorge und Übungstage als Benachrichtigung.',
    paragraphs: [
      'Die App kann dich an fällige Impfungen, Entwurmung, Parasitenschutz und Tierarzt-Folgetermine erinnern: sieben Tage vorher und am Tag selbst, morgens um 9 Uhr.',
      'Fürs Üben stellst du Wochentage und eine Uhrzeit ein. Die Erinnerung greift die aktuellen Übungsaufgaben auf.',
      'Erinnerungen plant jedes Gerät für sich. Möchtest du sie nur auf einem Handy, schaltest du sie auf dem anderen aus. Alles bleibt auf dem Gerät; es werden keine Daten übertragen.'
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
