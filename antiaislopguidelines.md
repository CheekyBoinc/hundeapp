# Anti-AI-Slop Guidelines für Claude (Design & Code)

**Zweck:** Diese Guidelines an Claude übergeben — z. B. als Teil eines System-Prompts, einer `CLAUDE.md` oder als Anhang an einen Design-/Code-Auftrag —, damit Ergebnisse nicht in generische, "sofort als AI erkennbare" Muster verfallen, sondern bewusste, begründete Entscheidungen widerspiegeln.

**Kernidee:** "AI Slop" ist Output, der technisch korrekt ist, aber am statistischen Mittelwert der Trainingsdaten klebt — Oberfläche ohne Substanz, das Naheliegende statt des Passenden. Das Gegenmittel ist nicht "mach es schöner", sondern explizite Constraints: sagen, was zu vermeiden ist, und eine bewusste, kontextspezifische Wahl einfordern.

---

## Teil 1 — Design & UI

### 1.1 Die Todsünden (P0 — nie tun)

1. **Tailwind-Indigo/Standard-Purple als Akzentfarbe.** Konkret zu vermeiden: `#6366f1`, `#4f46e5`, `#4338ca`, `#3730a3`, `#8b5cf6`, `#7c3aed`, `#a855f7`. Diese Farben sind der Textbook-AI-Tell, weil Tailwinds Default-Indigo massenhaft in Trainingsdaten auftaucht. Stattdessen: ein Design-Token (`--accent`) verwenden, das bewusst gewählt wurde.
2. **Zwei-Stopp-"Trust"-Gradient im Hero** — purple→blue, blue→cyan, indigo→pink. Eine flache Fläche mit intentionaler Typografie wirkt fast immer stärker.
3. **Emoji als Feature-Icons** — `✨ 🚀 🎯 ⚡ 🔥 💡` in Überschriften, Buttons, Listen oder Icon-Containern. Stattdessen: 1.6–1.8px-Stroke-Monoline-SVGs mit `currentColor`.
4. **Generische Sans-Serif auf Display-Text**, wenn ein Serif/Display-Font passender wäre — Inter, Roboto oder `system-ui` fest verdrahtet statt `var(--font-display)`.
5. **Rounded Card mit farbigem linkem Rand** — das kanonische "AI-Dashboard-Tile". Entweder den Radius oder den linken Rand weglassen.
6. **Erfundene Kennzahlen** — "10× schneller", "99,9% Uptime", "3× produktiver" ohne echte Quelle. Entweder reale Zahlen verwenden oder klar als Platzhalter kennzeichnen.
7. **Füll-Copy** — Lorem Ipsum, "Feature eins/zwei/drei", generischer Platzhaltertext. Eine leere Sektion ist ein Kompositionsproblem, kein Textproblem.

### 1.2 Typografie

- **Nie verwenden:** Inter, Roboto, Open Sans, Arial, Lato, `system-ui`/Systemschriften. (Diese gelten inzwischen als "das Comic Sans der AI".)
- **Bewusst und kontrastreich wählen**, je nach Kontext z. B.:
  - Editorial: Playfair Display, Crimson Pro, Fraunces
  - Startup/Marke: Satoshi, Clash Display, Cabinet Grotesk
  - Technisch: IBM Plex-Familie, Source Sans 3
  - Code-Ästhetik: JetBrains Mono, Fira Code, Space Grotesk
  - Unverwechselbar: Bricolage Grotesque, Newsreader, Obviously
- **Pairing-Prinzip:** Hoher Kontrast wirkt interessanter — Display + Monospace, Serif + geometrische Sans.
- **Extreme statt Mitte:** Schriftschnitt 100/200 gegen 800/900 (nicht 400 vs. 600), Größensprünge von 3×+ (nicht 1,5×).
- Die Font-Wahl **explizit benennen**, bevor Code geschrieben wird — verhindert das Zurückfallen auf Space Grotesk als neuen Default.

### 1.3 Farbe & Theme

- Sich auf **eine kohärente Ästhetik festlegen** und über CSS-Variablen konsistent halten, nicht hart codieren.
- **Dominante Farbe + scharfe Akzente** schlägt eine "timide", gleichmäßig verteilte Palette.
- Inspiration aus konkreten Referenzen ziehen statt "mach es schön" — z. B. IDE-Themes, kulturelle Ästhetiken, explizite Vorbilder ("Farbpalette einer Skihütte aus den 1970ern").
- **Mengenbegrenzung als Reality-Check:** max. ca. 2 sichtbare Verwendungen von `--accent` pro Screen, unter ca. 12 rohe Hex-Werte außerhalb von `:root`.

### 1.4 Motion

- CSS-only-Lösungen für HTML bevorzugen; bei React eine Motion-Library einsetzen.
- **Ein orchestrierter Page-Load** mit gestaffelten Reveals (`animation-delay`) wirkt stärker als viele verstreute Mikro-Interaktionen ohne Zusammenhang.

### 1.5 Hintergründe

- Atmosphäre und Tiefe erzeugen statt solider Flächen — geschichtete Gradients, geometrische Muster, kontextuelle Effekte.
- Aber: **keine bedeutungslosen dekorativen Blob-/Wave-SVGs**, die nur "modern" wirken sollen, ohne Funktion zu haben. Gleiches gilt für Glassmorphism (`backdrop-filter: blur(10px)`, `rgba`-Borders) — nur einsetzen, wenn es funktional begründet ist, nicht als Dekor.

### 1.6 Layout & Komponenten

- Nicht jede Sektion braucht eine Card; keine Card-Nesting-Kaskaden ohne klare Hierarchie.
- Nicht stur dem Schema **Hero → Features → Pricing → FAQ → CTA** ohne jede Variation folgen — mindestens eine ungewöhnliche Sektion einbauen (z. B. Testimonial als Full-Bleed-Zitat statt Karussell, Pricing als Vergleich-zum-Status-quo, ein Mini-Live-Demo).
- Keine externen Platzhalter-CDNs (`unsplash.com`, `placehold.co`, `picsum.photos`) — brüchig und ein klarer Tell.
- Perfekte Symmetrie vermeiden; alternierende Dichte (eine enge Sektion, eine luftige Sektion) wirkt intentional statt zufällig.

### 1.7 Soul-Regel (80/20)

Zielverhältnis: **~80 % bewährte, funktionierende Muster + ~20 % unverwechselbare Entscheidung.** Die 20 % sollten stecken in:

- einer mutigen visuellen Entscheidung (Typografie, Farbe oder Proportion),
- einer eigenen Stimme in der Microcopy (z. B. "Start tracking" statt "Get started"),
- einer merkbaren Mikro-Interaktion (ein Button, der 2px einsinkt; eine Zahl, die hochzählt),
- einem Detail, das nur jemand einbaut, der das Produkt tatsächlich benutzt hat (ein Shortcut-Hinweis, ein Status-Badge mit produktspezifischer Formulierung).

### 1.8 Der Lackmustest

Vor Abgabe fragen: *"Würde jemand, der einen Screenshot sieht, sofort sagen 'das hat eine AI gebaut'?"* Wenn ja, ist der Trainingsdaten-Durchschnitt nicht verlassen worden — nochmal ansetzen. Umgekehrt: *"Könnte jemand außerhalb des Projekts am Screenshot erkennen, um welches Produkt es sich handelt?"* Wenn ja, ist das ein gutes Zeichen für "Soul"; wenn nein, wurde eher eine Vorlage ausgefüllt als ein Produkt gestaltet.

---

## Teil 2 — Code

### 2.1 Typische Fehlermuster ("Slop-Taxonomie")

1. **Plausibel, aber falsch** — Syntax stimmt, Logik versagt bei Edge Cases.
2. **Over-Engineered** — unnötige Abstraktionsschichten für ein einfaches Problem.
3. **Konventions-blind** — ignoriert bestehende Namensschemata, Patterns oder Architektur des Repos.
4. **Halluzinierte APIs** — erfundene Methoden, veraltete Funktionen, nicht existierende Config-Optionen.
5. **Übertriebene Fehlerbehandlung** — exzessive try/catch-Blöcke, verschluckte Fehler, unnötiges Logging "zur Sicherheit".
6. **Cargo-Cult-Code** — kopierte Patterns ohne Verständnis (z. B. Retry-Logik, wo sie nichts bringt).

### 2.2 Praktische Leitplanken

- **Scope eng halten:** kleine, klar umrissene Aufgaben mit expliziten Akzeptanzkriterien statt breiter "baue Feature X"-Aufträge.
- **Intent zuerst festhalten** (Spezifikation, Ticket, erwartetes Verhalten), dann erst Code generieren.
- **Spec-Review getrennt von Code-Review:** erst die Anforderung selbst bestätigen, dann prüfen, ob der Code genau das umsetzt — nicht mehr und nicht weniger.
- **Surface-Checks automatisieren** (Tests, Linting, Typechecking) — diese ersetzen keine inhaltliche Prüfung, ob der Code das Gewünschte tut.
- **Output wie unverifizierten externen Zulieferer-Code behandeln**, nicht wie den Code eines vertrauten Kollegen — gründlich gegen die Anforderung prüfen.
- **Wiederkehrende Problem-Patterns im Projekt dokumentieren** und aktiv in künftige Prompts/Reviews zurückspielen (eine Art "Anti-Pattern-Register" für das jeweilige Repo).

### 2.3 Arbeits-Disziplin

- **Kleine, in sich geschlossene Commits/Changes**, die jeweils exakt einer Aufgabe entsprechen.
- Faustregel: Wenn ein `git reset --hard` auf die letzte Änderung unangenehm wäre, ist zu viel unreviewter Code angehäuft worden — kleiner schneiden.
- Lieber **eine Datei/einen Schritt nach dem anderen** generieren als große Multi-File-Sprünge ohne Zwischenprüfung.
- **Keinen Code vorschlagen/übernehmen, den man nicht vollständig erklären könnte** — bei Unklarheit lieber nachfragen oder kleiner zerlegen, statt weiter am Ergebnis zu "nachjustieren".
- Wenn eine zweite Überarbeitung keine wesentliche Verbesserung bringt: stoppen, statt in Prompt-Schleifen weiterzudrehen.

### 2.4 Wo AI-generierter Code angemessen ist — und wo nicht

- **Gut geeignet:** Boilerplate, Testgenerierung, Dokumentation, klar spezifizierte und gut verstandene Probleme.
- **Erhöhte Sorgfalt nötig:** Kern-Geschäftslogik, sicherheitsrelevanter Code.
- **Nur mit expliziter menschlicher Fachprüfung:** kryptografische Implementierungen, compliance-kritische Pfade.

### 2.5 Selbstprüfungs-Signale für bestehenden Code

- **Semantische Duplikation:** dieselbe Logik mehrfach statt einer gemeinsamen Funktion/Abstraktion.
- **Hohe Revert-/Änderungsrate** kurz nachdem Code geschrieben wurde — ein frühes Warnsignal.
- **Architektonische Kohärenz:** folgt der neue Code den etablierten Mustern des Projekts, oder driftet er ab?
- **Tests, die Verhalten statt Implementierung prüfen** — Tests, die nur die Implementierung spiegeln, validieren nichts.

---

## Teil 3 — Text, Microcopy & Kommentare

*(gilt für UI-Texte, Button-Labels, Code-Kommentare, Commit-Messages, Doku, READMEs, Fehlermeldungen)*

### 3.1 Wörter/Phrasen grundsätzlich vermeiden

delve, foster, leverage, utilize, facilitate, empower, streamline, robust, cutting-edge, paradigm shift, game changer, "this is huge" / "this changes everything", tapestry, realm, beacon, multifaceted, meticulous, intricate, paramount, transformative, elevate, embark, supercharge, harness, ever-evolving, seamless, pivotal.

**Nur streichen, wenn sie nichts leisten** (aber behalten, wenn sie echte Betonung/Unsicherheit tragen): just, literally, honestly, simply, actually, truly, fundamentally, importantly, crucially, inherently, inevitably.

**Leerphrasen, die den Punkt verzögern:** "it's worth noting", "at the end of the day", "when it comes to", "at its core", "in today's world", "the reality/truth is", "in order to", "going forward", "let's dive in".

### 3.2 Muster, die sofort als AI-Slop auffallen

- **Binäre Kontraste:** "Es ist nicht X. Es ist Y." → Y direkt sagen.
- **Throat-Clearing-Opener:** "Here's the thing", "Let me be clear" → weglassen, direkt zum Punkt.
- **Pseudo-Insight-Setups:** "Was die meisten übersehen ist …" → die Behauptung direkt aufstellen, ohne sich als einzigen Experten zu inszenieren.
- **Doppelpunkt-Reveal:** "Der beste Teil: …" → als normaler Satz formulieren.
- **Leere "-ing"-Anhängsel**, die Bedeutung vortäuschen: "highlighting", "underscoring", "showcasing".
- **Wichtigkeits-Aufplusterung:** "markiert einen entscheidenden Moment", "unterstreicht die Bedeutung" → stattdessen die nackte Tatsache nennen und dem Leser das Urteil überlassen.
- **Weasel-Attribution:** "Experten sind sich einig", "Studien zeigen" ohne Quelle → Quelle nennen oder Behauptung weglassen.
- **Überhöhte Verben:** "dient als zentraler Hub für …" → konkret sagen, was es tut.
- **Synonym-Rotation** rein aus Stilgründen, wenn das gleiche Wort klarer wäre.
- **Negativ-Aufzählungen:** "Kein X. Kein Y. Ein Z." → einfach Z sagen.
- **Dramatische Fragmentierung:** "X. Und Y. Und Z." / "Das war's. Mehr ist es nicht."
- **Monotoner Rhythmus** — wiederholt gleiche Satzlänge/-form über mehrere Sätze.
- **Rhetorische Setups:** "Was, wenn ich dir sagen würde …", "Plot Twist:".
- **Erzwungene "tiefsinnige" Schlusssätze** / Mic-Drop-Zeilen am Ende.
- **Zusammenfassungs-Enden:** "Zusammenfassend …", "Am Ende des Tages …" — der Leser war gerade eben noch dabei, keine Rekapitulation nötig.
- **Formatierungs-Slop:** Emoji in Überschriften, wahllos fetter Text, Listen wo zwei Sätze Fließtext besser wären, Überschriften über Zwei-Satz-Abschnitten.
- **Em-Dashes (—) als Standard-Rhythmus-Krücke** — sparsam und gezielt einsetzen; Häufungen und dekorative Gedankenstriche entfernen.
- **Erzwungene Triaden:** "klar, prägnant und überzeugend", wenn nur der Alliteration wegen aneinandergereiht.
- **Beidseitiges Hedging nur um "ausgewogen" zu wirken:** "mächtig, aber nicht ohne Nachteile".
- **Klischee-Metaphern:** "unlock", "deep dive", "landscape", "tapestry".

### 3.3 Was unbedingt erhalten bleiben soll

- **Konkrete Fakten, Zahlen, Daten, Mechanismen** — nie zu generischer Wichtigkeit verwässern (aus "Deploy-Zeit von 40 auf 4 Minuten reduziert" darf kein "verbessert die Effizienz erheblich" werden).
- **Klare Meinungen und Kanten** — nicht für falsche Ausgewogenheit glattbügeln.
- **Aktive Stimme, ein Gedanke pro Satz.**
- **Nichts erfinden** — keine Claims, Statistiken oder Meinungen dazudichten; bei Unklarheit nachfragen statt zu raten.

---

## Kurz-Checkliste vor Abgabe

- [ ] Keine der 7 Design-Todsünden (Indigo/Purple-Akzent, Trust-Gradient, Emoji-Icons, generische Sans-Serif auf Headlines, Rounded-Card-mit-linkem-Rand, erfundene Kennzahlen, Füll-Copy)?
- [ ] Font-Wahl bewusst getroffen und benannt (nicht Inter/Roboto/system-ui)?
- [ ] Farbpalette hat einen dominanten Ton + gezielte Akzente statt Gleichverteilung?
- [ ] Mindestens eine ungewöhnliche Layout-Entscheidung statt reinem Hero-Features-Pricing-FAQ-Schema?
- [ ] Ein Detail vorhanden, das nur für dieses Produkt Sinn ergibt (Soul-Test bestanden)?
- [ ] Code: Scope war eng, Intent vorab geklärt, Output wurde wie unverifizierter Zulieferer-Code geprüft?
- [ ] Code: keine unnötigen Abstraktionen, keine halluzinierten APIs, keine übertriebene Fehlerbehandlung?
- [ ] Jeder Commit/Change ist klein, nachvollziehbar und vollständig erklärbar?
- [ ] Texte (UI, Kommentare, Doku) frei von der Wort-/Phrasen-Verbotsliste und den Slop-Mustern aus Teil 3?
- [ ] Lackmustest bestanden: Würde jemand den Screenshot/Code sofort als "AI-generiert" erkennen?

---

## Quellen

- [The Field Guide to AI Slop – ignorance.ai](https://www.ignorance.ai/p/the-field-guide-to-ai-slop)
- [petergyang/no-ai-slop – GitHub](https://github.com/petergyang/no-ai-slop)
- [nexu-io/open-design – anti-ai-slop.md](https://github.com/nexu-io/open-design/blob/main/craft/anti-ai-slop.md)
- [How to Avoid AI Code Slop – Aviator](https://www.aviator.co/blog/how-to-avoid-ai-code-slop/)
- [AI-Generated UI Design Anti-Patterns Guide – BSWEN](https://docs.bswen.com/blog/2026-03-20-ai-generated-ui-anti-patterns/)
- [Why Your AI Keeps Building the Same Purple Gradient Website – prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)
- [Stop the Slop: An Internal Guide for Devs – stoptheslop.dev](https://stoptheslop.dev/blog/stop-the-slop-an-internal-guide-for-devs)
- [What Is AI Slop? Detect & Prevent Low-Quality AI Code – Larridin](https://larridin.com/developer-productivity-hub/what-is-ai-slop-detect-prevent-low-quality-ai-code)
- [Prompting for frontend aesthetics – Anthropic Claude Cookbook](https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics)
