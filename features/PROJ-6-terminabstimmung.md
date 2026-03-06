# PROJ-6: Terminabstimmung

## Status: QA Review

## Beschreibung
Ein eingeladener Teilnehmer öffnet eine Terminumfrage und sieht eine Übersicht aller Termine und aller Teilnehmer. Für jeden Termin kann er JA oder NEIN abstimmen. Die Abstimmungen aller Teilnehmer sind für alle sichtbar. Am Ende wird automatisch gezählt, welcher Termin die meisten Ja-Stimmen hat. Nach Ablauf eines optionalen Enddatums sind keine neuen oder geänderten Antworten mehr möglich, die Ergebnisse bleiben lesbar.

## User Stories

- Als Teilnehmer möchte ich auf der Umfrage-Detailseite sehen, welche Termine zur Auswahl stehen, damit ich für jeden einzeln abstimmen kann.
- Als Teilnehmer möchte ich für jeden Termin JA oder NEIN klicken können, damit meine Verfügbarkeit klar ist.
- Als Teilnehmer möchte ich meine eigene Antwort jederzeit ändern können (vor der Deadline), falls sich meine Verfügbarkeit ändert.
- Als Teilnehmer möchte ich die Antworten aller anderen Teilnehmer sehen, damit ich weiss wie der Stand ist.
- Als Teilnehmer möchte ich auf einen Blick sehen, welcher Termin die meisten Ja-Stimmen hat (Empfehlung).
- Als Teilnehmer möchte ich nach Ablauf der Deadline noch die Ergebnisse lesen können, aber keine Antworten mehr ändern.
- Als Ersteller möchte ich dieselbe Übersicht sehen wie alle anderen Teilnehmer.

## Acceptance Criteria

- [ ] Umfrage-Detailseite zeigt: Titel, Ort (falls gesetzt), Beschreibung (falls gesetzt), Enddatum (falls gesetzt)
- [ ] Antwort-Grid: Zeilen = Teilnehmer, Spalten = Termine (nach Datum sortiert)
- [ ] Eigene Zeile: Grüner JA-Button und roter NEIN-Button pro Termin; aktive Antwort ist farblich hervorgehoben
- [ ] Gleiches klicken wie aktuelle Antwort → Antwort wird zurückgezogen (Toggle)
- [ ] Andere Zeilen: Readonly-Anzeige (JA = grünes Label, NEIN = rotes Label, keine Antwort = "—")
- [ ] Footer-Zeile: Anzahl Ja-Stimmen pro Termin (z.B. "3 / 5")
- [ ] Termin mit den meisten Ja-Stimmen ist visuell hervorgehoben (z.B. grüner Spalten-Header)
- [ ] Antworten werden sofort in Supabase gespeichert (kein separater "Speichern"-Button)
- [ ] Buttons deaktiviert während Speichervorgang läuft (kein Doppelklick möglich)
- [ ] Nach Ablauf der Deadline: Alle JA/NEIN-Buttons deaktiviert, Deadline-Hinweis sichtbar ("Abstimmung beendet am ...")
- [ ] Nach Ablauf der Deadline: Ergebnisse bleiben vollständig lesbar
- [ ] User der kein Teilnehmer ist: Zugriff verweigert (404 oder Redirect)
- [ ] Mobile-tauglich: Tabelle horizontal scrollbar bei vielen Terminen

## Edge Cases

- **Alle Teilnehmer haben NEIN für jeden Termin:** Kein Termin hervorgehoben, Hinweis "Kein gemeinsamer Termin gefunden"
- **Noch keine Antworten:** Alle Felder zeigen "—", Ja-Stimmen-Zähler zeigt "0 / N"
- **Genau ein Teilnehmer:** Grid zeigt eine Zeile, funktioniert normal
- **Viele Termine (>10):** Tabelle horizontal scrollbar; erster Spalte (Name) bleibt sticky
- **Netzwerkfehler beim Speichern:** Antwort wird nicht gespiegelt, Button kehrt in alten Zustand zurück; keine stille Fehlmeldung
- **Deadline läuft während User auf der Seite ist:** UI wird nicht automatisch gesperrt (kein Live-Update nötig; Sperre gilt beim nächsten Interaktionsversuch oder Reload)
- **Teilnehmer wurde nachträglich aus Umfrage entfernt:** Redirect zu Dashboard mit Hinweis "Du bist kein Teilnehmer mehr"
- **Ersteller ist selbst nicht als Teilnehmer eingeladen:** Sieht Grid im Read-only-Modus (keine eigene Zeile); kann aber über Edit-Button Teilnehmer anpassen
- **Gleichstand bei Ja-Stimmen:** Alle gleichauf liegenden Termine werden gleich hervorgehoben

## Technische Anforderungen

- Antworten werden via Supabase `upsert` mit `onConflict: 'poll_date_id,user_id'` gespeichert
- RLS: Teilnehmer können nur ihre eigenen Responses schreiben; Lesen gilt für alle Mitglieder der Umfrage
- Deadline-Prüfung serverseitig (RLS oder Server Action) – nicht nur client-seitig
- Sticky erste Spalte via CSS (`position: sticky; left: 0`)

## Abhängigkeiten

- Benötigt: PROJ-5 (Terminumfrage erstellen) – Umfrage muss existieren
- Benötigt: PROJ-2 (Login & Session) – Teilnehmer muss eingeloggt sein

---

## Tech-Design (Solution Architect)

> Die Basis-Implementierung (Grid-Tabelle, JA/NEIN-Buttons, Readonly-Anzeige, Toggle, Ja-Stimmen-Zähler, Sticky-Spalte) existiert bereits in `response-grid.tsx`. PROJ-6 ergänzt: Deadline-Enforcement, Best-Termin-Highlight, Fehler-Rollback, Umfrage-Header mit Ort/Beschreibung, und den "kein gemeinsamer Termin"-State.

### Was bereits existiert (wird erweitert)

```
src/app/dashboard/polls/[id]/page.tsx        → Server Component (wird erweitert)
src/app/dashboard/polls/[id]/response-grid.tsx → Client Component (wird erweitert)
src/components/ui/sonner.tsx                 → Toast-Benachrichtigungen (bereits installiert)
src/components/ui/badge.tsx                  → Enddatum-Badge (bereits installiert)
```

### Keine neuen Dateien nötig

```
Alle Änderungen passieren in den bestehenden zwei Dateien:
→ page.tsx:          lädt zusätzlich location, description, deadline
→ response-grid.tsx: nimmt deadline entgegen, berechnet daraus Sperr-Zustand
```

### Seitenstruktur (Route bleibt unverändert)

```
/dashboard/polls/[id]   → Umfrage-Detailseite (nur diese eine Route)
```

### Component-Struktur

```
Umfrage-Detail (/dashboard/polls/[id])
├── NavBar
└── ResponseGrid (Client Component) — ERWEITERT
    ├── Poll-Header                          ← NEU
    │   ├── Titel (groß)
    │   ├── Ort (falls gesetzt, mit Pin-Icon)
    │   ├── Beschreibung (falls gesetzt)
    │   ├── Enddatum-Badge (falls gesetzt, "Abstimmung bis XX. März")
    │   ├── [Ersteller:] Bearbeiten-Button → /edit
    │   └── [Ersteller:] Löschen-Button → AlertDialog
    ├── Deadline-Banner (wenn Deadline abgelaufen)  ← NEU
    │   └── "Abstimmung beendet am XX. März — Ergebnisse sind lesbar"
    ├── "Kein gemeinsamer Termin"-Hinweis   ← NEU
    │   (nur wenn alle Teilnehmer für alle Termine NEIN haben und mind. 1 Antwort existiert)
    └── Antwort-Tabelle
        ├── Header-Zeile
        │   └── Datum-Spalten: Spalte mit meisten Ja-Stimmen = grün hervorgehoben ← NEU
        ├── Teilnehmer-Zeilen (unverändert)
        │   └── Eigene Zeile: JA/NEIN-Buttons DISABLED wenn Deadline abgelaufen ← NEU
        └── Footer: Ja-Stimmen-Zähler (unverändert)
```

### Daten-Modell

```
Keine neuen Tabellen oder Spalten nötig.

Neue Felder die page.tsx bereits von polls laden muss (nach PROJ-5 Migration):
├── location   → wird im Poll-Header angezeigt
├── description → wird im Poll-Header angezeigt
└── deadline   → wird an ResponseGrid übergeben für Sperr-Logik
```

### Deadline-Logik

```
Wann sind Buttons gesperrt?
→ Poll hat ein Enddatum UND das Enddatum liegt vor dem heutigen Tag

Wo wird geprüft?
→ Primär: Client-seitig (deadline kommt vom Server beim Seitenaufruf)
  → isDeadlinePassed = deadline !== null && new Date(deadline) < today

→ Zusätzlich: Datenbank-Ebene (RLS-Policy auf poll_responses)
  → Schreibzugriff nur erlaubt wenn kein Deadline gesetzt
    ODER Deadline >= CURRENT_DATE
  → Verhindert Manipulationen auch wenn JS-seitige Sperre umgangen wird

Verhalten nach Ablauf:
→ JA/NEIN-Buttons werden disabled (visuell ausgegraut)
→ Amber-Banner oben: "Abstimmung beendet am [Datum]"
→ Grid bleibt vollständig lesbar
```

### Best-Termin-Highlight-Logik

```
Berechnung (rein client-seitig, aus responses-State):
→ Zähle Ja-Stimmen pro Termin
→ Finde den höchsten Wert (maxCount)
→ Alle Termine mit maxCount > 0 UND maxCount === Höchstwert bekommen grünen Header
→ Bei Gleichstand: alle gleichauf liegenden Termine werden hervorgehoben
→ Wenn maxCount === 0 (keine Ja-Stimmen): kein Termin hervorgehoben

Kein-gemeinsamer-Termin-Hinweis:
→ Wird angezeigt wenn: mindestens 1 Teilnehmer hat geantwortet
  UND keine einzige Ja-Stimme existiert (maxCount === 0)
```

### Fehler-Rollback beim Speichern

```
Aktuelles Verhalten: Bei Fehler wird State nicht aktualisiert
  (stillschweigend, kein Feedback für User → User weiß nicht ob Antwort gespeichert)

Neues Verhalten:
→ Optimistische UI: State sofort aktualisieren (schnelles Feedback)
→ Bei Netzwerkfehler: State auf alten Wert zurücksetzen
→ Toast-Benachrichtigung: "Antwort konnte nicht gespeichert werden. Bitte versuche es erneut."
   (via Sonner – bereits installiert)
```

### Zugriffs-Prüfung (wer darf die Seite sehen?)

```
Wer kommt durch:
→ Ersteller der Umfrage (auch wenn nicht als Teilnehmer eingeladen)
→ Eingeladene Teilnehmer

Wer wird blockiert:
→ Alle anderen → RLS liefert null → notFound() (404)
→ Ehemaliger Teilnehmer (nachträglich entfernt) → RLS liefert null → notFound()

Sonderfall: Ersteller ist nicht Teilnehmer
→ Sieht Grid vollständig (alle Zeilen anderer Teilnehmer)
→ Hat keine eigene Zeile mit JA/NEIN-Buttons (kein participant-Eintrag)
→ Sieht Bearbeiten- und Löschen-Button
```

### Tech-Entscheidungen

```
Warum Sonner für Fehler-Toast?
→ Bereits installiert (src/components/ui/sonner.tsx).
  Nicht-invasiv, verschwindet automatisch, blockiert Grid nicht.

Warum keine eigene Fehler-Alert-Komponente?
→ Toasts eignen sich besser für transiente Fehler beim Speichern.
  Permanente Alerts wären für das interaktive Grid störend.

Warum Best-Termin-Highlight nur via Spalten-Header-Farbe?
→ Spalten-Hintergrund einzufärben würde alle Zellen der Spalte betreffen
  und die Lesbarkeit stören. Header-Highlight ist subtiler und ausreichend.

Warum Deadline-Prüfung zusätzlich in RLS?
→ Client-seitige Prüfung ist für UX; RLS-Prüfung für Sicherheit.
  Ohne RLS könnte ein User die Deadline durch Dev-Tools umgehen.
```

### Keine neuen Dependencies nötig

```
Alle benötigten Packages sind bereits installiert:
- sonner (Toast-Benachrichtigungen) ✅
- date-fns (Datumsvergleich für Deadline) ✅
- shadcn/ui (badge für Enddatum-Anzeige) ✅
```

---

## QA Test Results

**Tested:** 2026-03-05
**Method:** Code-based review (src/ + migrations)
**App URL:** http://localhost:3000

---

## Acceptance Criteria Status

- [x] Umfrage-Detailseite zeigt: Titel, Ort (MapPin-Icon, falls gesetzt), Beschreibung (whitespace-pre-wrap, falls gesetzt), Enddatum (Clock-Icon, falls gesetzt)
- [x] Antwort-Grid: Zeilen = Teilnehmer, Spalten = Termine (via `.order('date')` in page.tsx sortiert)
- [x] Eigene Zeile: Grüner JA-Button (bg-emerald-500) und roter NEIN-Button (bg-red-500); aktive Antwort farblich hervorgehoben
- [x] Gleiches klicken wie aktuelle Antwort → Toggle zu null → Antwort zurückgezogen (`previous === available ? null : available`)
- [x] Andere Zeilen: Readonly-Anzeige (JA = grünes Label, NEIN = rotes Label, keine Antwort = "—")
- [x] Footer-Zeile: Ja-Stimmen pro Termin als "count / total"
- [x] Termin mit meisten Ja-Stimmen: grüner Spalten-Header + "★ Beste" Label; Gleichstand = alle gleichauf-Termine hervorgehoben
- [x] Antworten sofort gespeichert via Supabase upsert (onConflict: 'poll_date_id,user_id')
- [x] Buttons deaktiviert während Speichervorgang (`disabled={isSaving}`)
- [x] Nach Ablauf Deadline: Buttons versteckt (read-only row gerendert); amber Banner "Abstimmungsfrist abgelaufen"; Deadline-Text in Rot
- [x] Nach Ablauf Deadline: Ergebnisse vollständig lesbar
- [x] User ohne Teilnahme: RLS liefert null → `notFound()` → 404
- [x] Mobile: `overflow-x-auto` auf Tabellen-Container; erste Spalte sticky via `sticky left-0 z-10`

---

## Edge Cases Status

- [x] Alle Teilnehmer NEIN → `noCommonDate`-Banner "Kein gemeinsamer Termin gefunden" wird angezeigt
- [x] Noch keine Antworten → alle Felder "—", Ja-Stimmen-Zähler "0 / N"
- [x] Genau ein Teilnehmer → Grid zeigt eine Zeile, funktioniert normal
- [x] Viele Termine → `overflow-x-auto` + sticky Namensspalte
- [x] Netzwerkfehler beim Speichern → Optimistic update wird zurückgesetzt; `toast.error(...)` via Sonner angezeigt
- [x] Deadline läuft während User auf Seite ist → `isDeadlinePassed` wird bei jedem Re-render neu berechnet; nächste Interaktion löst Re-render aus → Sperre aktiv ohne Reload nötig (besser als Spec)
- [ ] ⚠️ ISSUE-6-01: Teilnehmer nachträglich entfernt → zeigt generische 404-Seite statt spezifischem Hinweis "Du bist kein Teilnehmer mehr"
- [x] Ersteller nicht als Teilnehmer eingeladen → `isParticipant = false` → keine eigene Zeile mit Buttons; Grid vollständig lesbar; Edit/Löschen-Buttons sichtbar
- [x] Gleichstand bei Ja-Stimmen → `bestDateIds` enthält alle Termine mit `count === maxJaCount`; alle gleich hervorgehoben

---

## Security Review (Pen-Test Perspektive)

- [x] **RLS USING für DELETE**: Migration `20240105000000` behebt Lücke — DELETE nach Deadline via direktem API-Call jetzt durch `is_poll_voting_open()` in USING-Clause blockiert
- [x] **RLS WITH CHECK für INSERT/UPDATE**: Deadline-Prüfung in DB — JS-seitige Sperre allein wäre bypassbar via Dev-Tools / curl
- [x] **Fremder User sieht Poll**: RLS `"Poll members can view polls"` prüft `created_by = uid OR EXISTS(poll_participants)` → kein Zugriff für Unbeteiligte
- [x] **User stimmt für anderen User ab**: `user_id = auth.uid()` in RLS USING + WITH CHECK → unmöglich
- [x] **Race Condition beim Upsert**: `onConflict: 'poll_date_id,user_id'` nutzt PRIMARY KEY → atomar, kein Duplikat möglich
- [x] **XSS**: `poll.title`, `poll.location`, `poll.description` werden als React-JSX-Text-Nodes gerendert — automatisch escaped

---

## Bugs Found

### BUG-6-01: Entfernter Teilnehmer sieht 404 statt benutzerfreundlicher Meldung
- **Severity:** Low
- **Steps to Reproduce:**
  1. User A erstellt Umfrage und lädt User B ein
  2. User B öffnet die Umfrage-URL
  3. User A entfernt User B als Teilnehmer (Edit)
  4. User B lädt die Seite neu (oder navigiert zur URL)
  5. **Expected:** Hinweis "Du bist kein Teilnehmer mehr dieser Umfrage" + Redirect zu Dashboard
  6. **Actual:** Generische Next.js 404-Seite (da RLS null zurückgibt → `notFound()`)
- **Priority:** Low (Sicherheit ist gewährleistet; nur UX-Problem)

---

## Summary PROJ-6

- ✅ 13 / 13 Acceptance Criteria passed
- ✅ 8 / 9 Edge Cases passed
- ❌ 1 Bug found (0 Critical, 0 High, 0 Medium, 1 Low)
- ✅ Feature ist **production-ready**
