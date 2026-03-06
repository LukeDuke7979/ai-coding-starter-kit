# PROJ-5: Terminumfrage erstellen & verwalten

## Status: QA Review

## Beschreibung
Ein eingeloggter User kann eine Terminumfrage anlegen: Titel, Ort, optionale Beschreibung, ein oder mehrere Termine (Datumsauswahl per Kalender), eingeladene Teilnehmer (aus User-Liste) und ein optionales Abstimmungs-Enddatum. Nach dem Erstellen kann der Ersteller die Umfrage jederzeit bearbeiten (Termine/Teilnehmer hinzufügen oder entfernen, Metadaten ändern) sowie löschen. Die Umfrage ist nur für eingeladene Teilnehmer sichtbar.

## User Stories

- Als eingeloggter User möchte ich eine neue Terminumfrage mit Titel, Ort, Terminen und Teilnehmern erstellen, damit ich herausfinden kann, wann alle Zeit haben.
- Als Ersteller möchte ich einen optionalen Ort zur Umfrage hinzufügen, damit Teilnehmer wissen wo der Termin stattfindet.
- Als Ersteller möchte ich eine optionale Beschreibung hinzufügen können (z.B. "Bringt Laptop mit"), um Kontext zu liefern.
- Als Ersteller möchte ich mehrere Termine per Kalender auswählen können, damit Teilnehmer für jeden Termin abstimmen können.
- Als Ersteller möchte ich aus einer Liste aller registrierten User Teilnehmer per Checkbox auswählen können.
- Als Ersteller möchte ich ein optionales Enddatum für die Abstimmung setzen können, damit die Umfrage automatisch gesperrt wird.
- Als Ersteller möchte ich eine bestehende Umfrage bearbeiten (Titel, Ort, Beschreibung, Termine, Teilnehmer, Deadline ändern), falls sich etwas ändert.
- Als Ersteller möchte ich eine Umfrage löschen können, wenn sie nicht mehr gebraucht wird.
- Als eingeloggter User möchte ich auf dem Dashboard alle meine Umfragen (erstellt + eingeladen) auf einen Blick sehen.

## Acceptance Criteria

- [ ] Formular-Felder: Titel (Pflicht, 2–100 Zeichen), Ort (optional, max. 100 Zeichen), Beschreibung (optional, max. 500 Zeichen)
- [ ] Kalender mit Mehrfach-Auswahl (Multi-Select) für Termine; vergangene Tage deaktiviert
- [ ] Mindestens 1 Termin muss ausgewählt sein
- [ ] Teilnehmer-Liste zeigt alle registrierten User mit Checkbox; eigener Account ist ebenfalls auswählbar
- [ ] Mindestens 1 Teilnehmer muss ausgewählt sein
- [ ] Optionales Enddatum (Datepicker); muss in der Zukunft liegen wenn gesetzt
- [ ] "Umfrage erstellen"-Button erstellt Poll + Dates + Participants in Supabase und leitet zur Umfrage-Detailseite weiter
- [ ] Dashboard zeigt Liste aller zugänglichen Umfragen (erstellt + eingeladen) mit Titel, Termin-Anzahl, Teilnehmer-Anzahl und ggf. Enddatum
- [ ] Leere Dashboard-State: "Erste Umfrage erstellen"-CTA sichtbar
- [ ] Ersteller sieht "Bearbeiten"-Button auf der Umfrage-Detailseite
- [ ] Edit-Formular ist vorausgefüllt mit bestehenden Daten
- [ ] Beim Bearbeiten: Bereits gespeicherte Termine/Teilnehmer entfernen löscht bestehende Antworten für diese Termine/Teilnehmer
- [ ] Beim Bearbeiten: Neue Termine/Teilnehmer hinzufügen möglich
- [ ] Ersteller kann die Umfrage löschen; alle zugehörigen Daten (Dates, Participants, Responses) werden kaskadierend gelöscht
- [ ] Löschvorgang erfordert Bestätigungsdialog ("Bist du sicher?")
- [ ] Nur eingeladene Teilnehmer und der Ersteller sehen die Umfrage (RLS-geschützt)
- [ ] Client-seitige Validierung mit Echtzeit-Feedback

## Edge Cases

- **Kein Termin ausgewählt:** Validierungsfehler, Submit blockiert
- **Kein Teilnehmer ausgewählt:** Validierungsfehler, Submit blockiert
- **Enddatum in der Vergangenheit:** Validierungsfehler, Submit blockiert
- **Sehr langer Titel (>100 Zeichen):** Zeichenzähler + Validierungsfehler
- **Termin beim Bearbeiten entfernt, für den bereits Antworten existieren:** Warnung "Bestehende Antworten für diesen Termin werden gelöscht" vor Speichern
- **Teilnehmer beim Bearbeiten entfernt:** Seine Antworten werden mitgelöscht (ON DELETE CASCADE)
- **Ersteller löscht sich selbst aus Teilnehmerliste:** Erlaubt; Ersteller sieht die Umfrage weiterhin als Ersteller
- **Netzwerkfehler beim Erstellen:** Fehlermeldung, kein halb-angelegter Datensatz (atomare Operation)
- **User hat keine Internet-Verbindung:** Fehlermeldung + Retry-Möglichkeit
- **Doppelter Titel:** Erlaubt (keine Uniqueness-Constraint auf title)
- **Ersteller versucht, fremde Umfrage zu bearbeiten:** 403/Not Found (RLS blockiert)

## Technische Anforderungen

- Alle Schreiboperationen über Supabase RLS abgesichert (nur Ersteller darf schreiben)
- Cascading Deletes: Poll-Löschung löscht Dates → Participants → Responses automatisch
- Optimistische UI für Umfragen-Liste (sofortiges Feedback)

## Abhängigkeiten

- Benötigt: PROJ-1 (Email/Password Registrierung) – User-Accounts müssen existieren
- Benötigt: PROJ-2 (Login & Session) – nur eingeloggte User können Umfragen erstellen
- Genutzt von: PROJ-6 (Terminabstimmung) – Umfragen müssen existieren bevor abgestimmt wird

---

## Tech-Design (Solution Architect)

> Die Basis-Implementierung (Umfrage erstellen, Dashboard-Liste, Kalender-Mehrfachauswahl, Teilnehmer-Checkboxen) existiert bereits. PROJ-5 erweitert sie um 3 neue Felder (Ort, Beschreibung, Enddatum), eine Edit-Seite und eine Löschfunktion.

### Was bereits existiert (wird wiederverwendet)

```
src/app/dashboard/page.tsx              → Dashboard-Liste (wird erweitert)
src/app/dashboard/polls/new/            → Erstellen-Formular (wird erweitert)
src/app/dashboard/polls/[id]/page.tsx   → Detail-Seite (wird erweitert)
src/components/nav-bar.tsx              → NavBar (unverändert)
src/components/ui/calendar.tsx          → Kalender (unverändert)
src/components/ui/checkbox.tsx          → Teilnehmer-Checkboxen (unverändert)
src/components/ui/alert-dialog.tsx      → Bestätigungsdialog für Löschen (bereits installiert)
src/components/ui/textarea.tsx          → Beschreibungs-Eingabe (bereits installiert)
```

### Neue Dateien

```
supabase/migrations/20240103000000_polls_add_columns.sql
→ Fügt 3 Spalten zur polls-Tabelle hinzu: location, description, deadline

src/app/dashboard/polls/[id]/edit/
├── page.tsx          → Server Component: lädt bestehende Umfrage-Daten + User-Liste
└── edit-poll-form.tsx → Client Component: vorausgefülltes Bearbeitungs-Formular
```

### Seitenstruktur (Routen)

```
/dashboard                          → Liste aller Umfragen (erweitert um Enddatum-Badge)
/dashboard/polls/new                → Umfrage erstellen (erweitert um Ort, Beschreibung, Enddatum)
/dashboard/polls/[id]               → Umfrage-Detail (erweitert: Edit-Button + Löschen-Button für Ersteller)
/dashboard/polls/[id]/edit          → Umfrage bearbeiten (neue Route)
```

### Component-Struktur

```
Dashboard (/dashboard)
├── NavBar
└── Umfragen-Liste
    └── Umfrage-Karte (pro Umfrage)
        ├── Titel
        ├── Ort (falls gesetzt, kleiner grauer Text)
        ├── Termin-Anzahl + Teilnehmer-Anzahl (Icons)
        └── Enddatum-Badge (falls gesetzt, z.B. "bis 31. März")

Umfrage erstellen (/dashboard/polls/new) — ERWEITERT
└── NewPollForm
    ├── Titel-Eingabe (Pflicht)
    ├── Ort-Eingabe (optional, Input)         ← NEU
    ├── Beschreibung-Eingabe (optional, Textarea) ← NEU
    ├── Kalender Mehrfach-Datum-Auswahl
    ├── Teilnehmer-Auswahl (Checkbox-Liste)
    ├── Enddatum-Auswahl (einzelner Kalender, optional) ← NEU
    └── Erstellen-Button

Umfrage-Detail (/dashboard/polls/[id]) — ERWEITERT
├── Titel + Ort + Beschreibung (oben)      ← NEU
├── Enddatum-Hinweis (falls gesetzt)       ← NEU
├── [Nur für Ersteller:] Bearbeiten-Button → /edit ← NEU
├── [Nur für Ersteller:] Löschen-Button → AlertDialog ← NEU
└── ResponseGrid (unverändert)

Umfrage bearbeiten (/dashboard/polls/[id]/edit) — NEU
└── EditPollForm (gleiche Felder wie NewPollForm, vorausgefüllt)
    ├── Warnung wenn Termin mit vorhandenen Antworten entfernt wird
    └── Speichern-Button
```

### Daten-Modell

Die bestehende `polls`-Tabelle bekommt 3 neue optionale Spalten:

```
polls (Tabelle in Supabase)
├── id           → Eindeutige ID (bereits vorhanden)
├── title        → Titel (bereits vorhanden)
├── created_by   → Ersteller-ID (bereits vorhanden)
├── created_at   → Erstellungsdatum (bereits vorhanden)
├── location     → Ort (optional, max. 100 Zeichen) ← NEU
├── description  → Beschreibung (optional, max. 500 Zeichen) ← NEU
└── deadline     → Abstimmungs-Enddatum (optional, nur Datum ohne Uhrzeit) ← NEU

Keine neuen Tabellen nötig — alles passt in die bestehende Struktur.
```

### Atomare Erstellung (Fehler-Behandlung)

```
Problem: Wenn Poll angelegt wird, aber das Speichern der Termine oder
         Teilnehmer danach fehlschlägt, entsteht ein unvollständiger Datensatz.

Lösung: Bereinigung bei Fehler
→ Schritt 1: Poll erstellen
→ Schritt 2: Termine einfügen (Fehler? → Poll sofort löschen + Fehlermeldung)
→ Schritt 3: Teilnehmer einfügen (Fehler? → Poll sofort löschen + Fehlermeldung)
→ Schritt 4: Weiterleitung zur Detail-Seite

Warum kein Datenbank-Transaction?
→ Supabase-Client unterstützt keine echten Client-seitigen Transaktionen.
  Bereinigung auf App-Ebene ist die einfachste zuverlässige Lösung.
```

### Edit-Logik

```
Beim Speichern einer bearbeiteten Umfrage:

Für Metadaten (Titel, Ort, Beschreibung, Deadline):
→ Einfaches UPDATE auf polls-Tabelle

Für Termine:
→ Vergleich: neue Liste vs. bestehende Liste
→ Hinzugefügte Termine: INSERT in poll_dates
→ Entfernte Termine: DELETE aus poll_dates
   (löscht automatisch zugehörige Antworten via CASCADE)

Für Teilnehmer:
→ Gleiche Logik: INSERT neue, DELETE entfernte
   (löscht automatisch zugehörige Antworten via CASCADE)

Warnung: Wenn ein zu entfernender Termin bereits Antworten hat,
→ Hinweis im Formular: "X Antwort(en) für diesen Termin werden gelöscht"
```

### Tech-Entscheidungen

```
Warum AlertDialog für Löschen-Bestätigung?
→ Bereits installiert (shadcn/ui alert-dialog.tsx), bewährt für
  destruktive Aktionen mit Bestätigungsschritt.

Warum Textarea für Beschreibung?
→ Bereits installiert (shadcn/ui textarea.tsx), passt für
  mehrzeiligen optionalen Text besser als Input.

Warum separate /edit-Route statt Modal?
→ Beim Bearbeiten müssen Kalender + lange Teilnehmer-Liste
  angezeigt werden → braucht eigene Seite.
  Modals werden bei solch langen Formularen unhandlich.

Warum deadline als DATE (ohne Uhrzeit)?
→ "Bis Ende des Tages X" ist intuitiver als ein exakter Zeitpunkt.
  Vereinfacht auch die Prüfung und Anzeige.
```

### Keine neuen Dependencies nötig

```
Alle benötigten Packages sind bereits installiert:
- shadcn/ui (alert-dialog, textarea, calendar, checkbox) ✅
- date-fns (Datumsformatierung) ✅
- @supabase/ssr (Datenbankzugriff) ✅
```

---

## QA Test Results

**Tested:** 2026-03-05
**Method:** Code-based review (src/ + migrations)
**App URL:** http://localhost:3000

---

## Acceptance Criteria Status

- [x] Formular-Felder: Titel (Pflicht, 2–100 Zeichen via `maxLength` + Validierung), Ort (optional, max. 100), Beschreibung (optional, max. 500) — Zeichenzähler für Titel und Beschreibung vorhanden
- [x] Kalender mit Mehrfach-Auswahl; vergangene Tage via `disabled={{ before: new Date() }}` deaktiviert
- [x] Mindestens 1 Termin muss ausgewählt sein — clientseitige Validierung vorhanden
- [x] Teilnehmer-Liste zeigt alle registrierten User mit Checkbox; eigener Account mit "(Du)"-Label auswählbar
- [x] Mindestens 1 Teilnehmer muss ausgewählt sein — clientseitige Validierung vorhanden
- [x] Optionales Enddatum (Popover + Calendar single mode); Validierung: Datum muss in Zukunft liegen
- [x] "Umfrage erstellen"-Button erstellt Poll via RPC `create_poll` (echte DB-Transaktion) und leitet weiter
- [x] Dashboard zeigt alle zugänglichen Umfragen mit Titel, Ort (MapPin), Termin-Anzahl, Teilnehmer-Anzahl, Enddatum (Uhr-Icon, amber)
- [x] Leere Dashboard-State mit "Erste Umfrage erstellen"-CTA sichtbar
- [x] Ersteller sieht "Bearbeiten"- und "Löschen"-Button auf Detailseite
- [x] Edit-Formular vorausgefüllt (Titel, Ort, Beschreibung, Termine, Teilnehmer, Deadline)
- [x] Beim Bearbeiten: Termin entfernen löscht Antworten via ON DELETE CASCADE (poll_dates → poll_responses)
- [x] Beim Bearbeiten: Teilnehmer entfernen löscht Antworten via DB-Trigger (`trg_cleanup_responses_on_participant_remove`)
- [x] Beim Bearbeiten: Neue Termine/Teilnehmer hinzufügen möglich (Diff-basiertes INSERT)
- [x] Ersteller kann Umfrage löschen; CASCADE löscht Dates → Responses, Participants → (Trigger)
- [x] Löschvorgang erfordert AlertDialog-Bestätigung
- [x] Nur eingeladene Teilnehmer + Ersteller sehen Umfrage — RLS-Policy `"Poll members can view polls"` korrekt
- [x] Client-seitige Validierung mit Echtzeit-Feedback (Alert-Komponente, Zeichenzähler)

---

## Edge Cases Status

- [x] Kein Termin ausgewählt → Fehlermeldung "Bitte wähle mindestens einen Termin aus."
- [x] Kein Teilnehmer ausgewählt → Fehlermeldung "Bitte wähle mindestens einen Teilnehmer aus."
- [x] Enddatum in der Vergangenheit → Fehlermeldung "Das Enddatum muss in der Zukunft liegen."
- [x] Sehr langer Titel (>100 Zeichen) → `maxLength={100}` blockiert Eingabe; Zeichenzähler sichtbar
- [x] Termin mit Antworten entfernt (Edit) → Warnung-Banner im Edit-Formular + Datum-Tag mit ⚠-Symbol (amber)
- [x] Teilnehmer entfernt → Antworten via Trigger gelöscht ✅
- [x] Ersteller löscht sich aus Teilnehmerliste → Erlaubt; Ersteller-Rechte bleiben erhalten
- [x] Netzwerkfehler beim Erstellen → RPC-Transaktion rolled back; kein halb-angelegter Datensatz; Fehlermeldung angezeigt
- [ ] ⚠️ ISSUE-5-01: User hat keine Internet-Verbindung → Allgemeine Fehlermeldung erscheint, aber kein expliziter Retry-Button
- [x] Doppelter Titel → Erlaubt (kein UNIQUE-Constraint auf title)
- [x] Ersteller versucht fremde Umfrage zu bearbeiten → `edit/page.tsx` prüft `created_by !== user.id` → Redirect zu Detailseite

---

## Bugs Found

### BUG-5-01: Edit-Formular blockiert Speichern wenn bestehende Deadline abgelaufen ist
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Erstelle eine Umfrage mit Deadline "heute + 1 Tag"
  2. Warte bis Deadline abgelaufen ist (oder setze Deadline auf gestern via DB)
  3. Öffne Edit-Seite
  4. Ändere nur den Titel (Deadline nicht anfassen)
  5. Klicke "Änderungen speichern"
  6. **Expected:** Änderungen werden gespeichert
  7. **Actual:** Fehlermeldung "Das Enddatum muss in der Zukunft liegen." — Speichern blockiert
- **Root Cause:** `edit-poll-form.tsx` Zeile 106 validiert `deadline < today` ohne zu prüfen ob das Datum sich geändert hat. Formular initialisiert mit der bestehenden (nun abgelaufenen) Deadline, Validierung schlägt fehl auch ohne Änderung.
- **Workaround:** User muss Deadline entfernen, speichern, dann (optional) neu setzen.
- **Priority:** Medium

### BUG-5-02: Kein Retry-Button bei Netzwerkfehler
- **Severity:** Low
- **Steps to Reproduce:**
  1. Öffne "Neue Umfrage erstellen" ohne Internetverbindung
  2. Fülle Formular aus und klicke "Umfrage erstellen"
  3. **Expected:** Fehlermeldung + "Erneut versuchen"-Button
  4. **Actual:** Fehlermeldung erscheint, Button kehrt zu "Umfrage erstellen" zurück (kein expliziter Retry-CTA)
- **Priority:** Low (UX-only, Formular kann manuell erneut abgesendet werden)

---

## Summary PROJ-5

- ✅ 17 / 18 Acceptance Criteria passed
- ✅ 9 / 10 Edge Cases passed
- ❌ 2 Bugs found (0 Critical, 0 High, 1 Medium, 1 Low)
- ⚠️ Feature ist **bedingt production-ready** — BUG-5-01 sollte vor Deployment gefixt werden
