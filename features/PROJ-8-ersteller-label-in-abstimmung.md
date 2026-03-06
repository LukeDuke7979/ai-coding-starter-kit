# PROJ-8: Ersteller-Kennzeichnung in der Abstimmungsansicht

## Status: In Review

## Abhängigkeiten
- Benötigt: PROJ-5 (Terminumfrage erstellen) – Ersteller-Konzept und `created_by`-Feld
- Benötigt: PROJ-6 (Terminabstimmung) – Response Grid Komponente existiert bereits

## User Stories
- Als Teilnehmer einer Umfrage möchte ich auf einen Blick erkennen, welche Zeile in der Abstimmungstabelle der Ersteller der Umfrage ist, damit ich einschätzen kann wer die finale Entscheidung trifft.
- Als Ersteller einer Umfrage möchte ich meine eigene Verfügbarkeit eintragen und abstimmen können, damit auch meine Termine in die Gesamtauswertung einfließen.
- Als Teilnehmer möchte ich sehen ob der Ersteller an den vorgeschlagenen Terminen kann oder nicht, um zu verstehen ob ein Termin wirklich für alle funktioniert.
- Als Teilnehmer möchte ich die Zeile des Erstellers IMMER sehen — auch wenn der Ersteller sich nicht selbst eingeladen hat — damit ich seine Verfügbarkeit einschätzen kann.

## Acceptance Criteria
- [ ] In der Abstimmungstabelle wird der Ersteller mit einem visuellen Label gekennzeichnet (z.B. Stern-Icon ★ neben dem Namen)
- [ ] Das Label ist dezent – keine farbliche Hervorhebung der gesamten Zeile, nur der Name ist markiert
- [ ] Der Ersteller hat IMMER eine eigene Zeile in der Tabelle — unabhängig davon, ob er sich selbst als Teilnehmer eingeladen hat *(geändert 2026-03-06)*
- [ ] Hat der Ersteller sich nicht eingeladen und noch nicht abgestimmt: Zeile erscheint mit "—" in allen Feldern (read-only) *(geändert 2026-03-06)*
- [ ] Der Ersteller kann wie alle anderen Teilnehmer abstimmen (Ja/Nein pro Termin), sofern er eingeladen ist; ohne Einladung ist die Zeile read-only
- [ ] Das Ersteller-Label ist für alle Teilnehmer sichtbar (nicht nur für den Ersteller selbst)
- [ ] Das Label erscheint in der Teilnehmer-Zeile des Response Grids (nicht im Header oder Footer)
- [ ] Wenn der aktuelle User gleichzeitig Ersteller ist, sieht er "(Du)" und das Ersteller-Label (z.B. "Anna (Du) ★" oder kombiniert)

## Edge Cases
- Ersteller hat sich nicht selbst eingeladen: Zeile erscheint mit "—" in allen Feldern, kein Abstimm-Button (read-only) *(geändert 2026-03-06)*
- Ersteller hat sich selbst eingeladen aber noch nicht abgestimmt: Zeile erscheint mit leeren Feldern und Abstimm-Buttons (wie bei anderen Teilnehmern)
- Umfrage ohne Teilnehmer (nur Ersteller-Zeile sichtbar): Ersteller-Zeile wird angezeigt, alle anderen Zeilen fehlen
- Ersteller-Konto gelöscht (zukünftiger Edge Case): `created_by` verweist auf gelöschten User – kein Label, keine Zeile, keine Fehlermeldung

---

## Tech-Design (Solution Architect) — Update 2026-03-06

### Was gebaut wird

Der Ersteller bekommt **immer** eine eigene Zeile in der Abstimmungstabelle — auch wenn er sich nicht selbst als Teilnehmer eingeladen hat. Die Zeile erscheint ganz oben in der Tabelle.

### Component-Struktur

```
Umfrage-Detail (/dashboard/polls/[id])
├── page.tsx (Server Component) — ERWEITERT
│   ├── lädt poll (inkl. created_by) — bereits vorhanden
│   ├── lädt participants (poll_participants + profiles) — bereits vorhanden
│   └── lädt creator-Profil (display_name aus profiles) — NEU
│       → 1 zusätzlicher Query: Wer ist der Ersteller?
│
└── ResponseGrid (Client Component) — ERWEITERT
    ├── bekommt neue Prop: creatorProfile { user_id, display_name } — NEU
    └── Tabelle (Reihenfolge der Zeilen)
        ├── [1. Zeile] Ersteller — IMMER oben
        │   ├── Ersteller ist Teilnehmer → interaktive Zeile (Ja/Nein-Buttons) + ★
        │   └── Ersteller ist KEIN Teilnehmer → read-only Zeile, alle Felder "—" + ★
        └── [2. bis N. Zeile] Restliche Teilnehmer (unverändert)
```

### Daten-Modell

```
Was page.tsx neu lädt:
└── creatorProfile
    ├── user_id      → poll.created_by (bereits vorhanden)
    └── display_name → NEU: 1 Query auf profiles-Tabelle (WHERE id = created_by)

Keine neuen Tabellen, keine neuen Spalten, keine RLS-Änderungen.
```

### Anzeigelogik

```
Schritt 1: Ist der Ersteller bereits in der Teilnehmerliste?
→ JA: Ersteller-Zeile wird normal gerendert (Ja/Nein-Buttons) + ★ Label
      (kein Duplikat: Ersteller taucht nur einmal auf — oben)
→ NEIN: Separate read-only Zeile oben — alle Datums-Zellen zeigen "—"
        Keine Abstimm-Buttons (kein poll_participants-Eintrag → kein Schreibzugriff)

Kombiniertes Label:
→ Aktueller User = Ersteller: "Name (Du) ★"
→ Aktueller User ≠ Ersteller: "Name ★"
```

### Tech-Entscheidungen

- **Warum Creator-Zeile immer oben?** — Klare visuelle Priorität: der Ersteller ist die entscheidende Person, Teilnehmer sollen ihn sofort finden.
- **Warum separater Profile-Query statt Join?** — Ein einzeiliger Query auf `profiles` ist einfacher als ein neues Join-Schema. Die Teilnehmerliste bleibt unverändert.
- **Warum Creator-Zeile im Frontend injizieren?** — Die Teilnehmerliste kommt aus `poll_participants`. Den Creator dort künstlich hinzuzufügen würde die Abstimmungslogik (RLS, upsert) verkomplizieren. Die Read-only-Zeile ist rein visuell.
- **Warum keine RLS-Änderungen?** — Der Creator ohne Teilnehmer-Eintrag bekommt keine Abstimm-Buttons → kein Schreibzugriff nötig. Bestehende RLS-Policies bleiben unverändert.

### Geänderte Dateien

```
src/app/dashboard/polls/[id]/page.tsx
→ 1 neuer Query: creator display_name aus profiles laden
→ creatorProfile-Prop an ResponseGrid übergeben

src/app/dashboard/polls/[id]/response-grid.tsx
→ Neue Prop: creatorProfile { user_id, display_name }
→ Prüfung: ist Creator bereits in Teilnehmerliste?
→ Falls JA: Creator-Zeile an Position 1, restliche Teilnehmer ab Position 2
→ Falls NEIN: Read-only Creator-Zeile an Position 1 + alle anderen Teilnehmer
```

### Neue Dependencies

Keine.

---

## QA Test Results

**Tested:** 2026-03-06
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) — Static code audit against updated spec (2026-03-06)

### Acceptance Criteria Status

#### AC-1: Ersteller wird mit einem visuellen Label gekennzeichnet (★ neben dem Namen)
- [x] PASS — `response-grid.tsx` line 316 renders `<span className="ml-1 text-xs text-amber-500" title="Ersteller">★</span>` in the read-only creator row. Line 341-343 renders the same ★ for creator rows in the participant list. Both paths covered.

#### AC-2: Das Label ist dezent — keine farbliche Hervorhebung der gesamten Zeile, nur der Name ist markiert
- [x] PASS — Only the name `<td>` receives the ★ label. Row backgrounds are controlled by alternating `bg-white` / `bg-gray-50/40` logic (line 333), which is unchanged for the creator. No full-row colour change exists.

#### AC-3: Der Ersteller hat IMMER eine eigene Zeile — unabhängig davon ob er eingeladen ist
- [x] PASS — Two code paths ensure this. (1) If the creator is a participant: `creatorParticipant` (line 92) is placed first in `orderedParticipants` (lines 94-97). (2) If the creator is NOT a participant: lines 309-326 inject a dedicated read-only row when `!creatorIsParticipant && creatorProfile`. Both paths always produce exactly one creator row at the top of the table.

#### AC-4: Ersteller nicht eingeladen und nicht abgestimmt — Zeile mit "—" in allen Feldern, read-only
- [x] PASS — The read-only creator row (lines 309-326) iterates over all dates and renders `<span className="text-gray-300 text-sm select-none">—</span>` for every date cell (lines 318-323). No Ja/Nein buttons are rendered.

#### AC-5: Ersteller kann abstimmen (Ja/Nein) wenn eingeladen; ohne Einladung read-only
- [x] PASS — When the creator is a participant they appear in `orderedParticipants`. Line 351 checks `isCurrentUser && isParticipant && !isDeadlinePassed`, granting Ja/Nein buttons to the creator-as-participant. When not a participant the creator appears only in the read-only row which has no buttons.

#### AC-6: Das Ersteller-Label ist für alle Teilnehmer sichtbar (nicht nur für den Ersteller selbst)
- [x] PASS — The ★ render condition (`participant.user_id === poll.created_by` at line 341, and unconditionally in the creator-readonly row at line 316) has no gate on `currentUserId`. Every user viewing the page sees the label.

#### AC-7: Das Label erscheint in der Teilnehmer-Zeile des Response Grids (nicht im Header oder Footer)
- [x] PASS — Both ★ renders (lines 316 and 341-343) are inside `<tbody>` rows. The `<thead>` and `<tfoot>` contain no creator label.

#### AC-8: Wenn aktueller User = Ersteller, sieht er "(Du)" UND das Ersteller-Label
- [x] PASS — In the participant path, lines 338-343 evaluate `isCurrentUser` (for "(Du)") and `participant.user_id === poll.created_by` (for ★) independently. In the read-only creator row, lines 313-316 evaluate `creatorProfile.user_id === currentUserId` (for "(Du)") and always render ★. When both conditions hold, the output is e.g. "Anna (Du) ★".

### Edge Cases Status

#### EC-1: Ersteller hat sich nicht selbst eingeladen — Zeile erscheint mit "—" in allen Feldern, kein Abstimm-Button
- [x] PASS — See AC-3 and AC-4. The read-only row is injected when `!creatorIsParticipant && creatorProfile`. All cells show "—", no buttons.

#### EC-2: Ersteller hat sich eingeladen aber noch nicht abgestimmt — Zeile mit leeren Feldern und Abstimm-Buttons
- [x] PASS — The creator appears in `orderedParticipants`. Unvoted cells fall into the `response === undefined || response === null` branch (lines 399-401) and render "—". The `isCurrentUser && isParticipant && !isDeadlinePassed` condition at line 351 is true, so Ja/Nein buttons are shown.

#### EC-3: Umfrage ohne sonstige Teilnehmer (nur Ersteller-Zeile sichtbar)
- [x] PASS — `hasTableContent` at line 100 evaluates `dates.length > 0 && (orderedParticipants.length > 0 || creatorProfile !== null)`. When the creator is the only row (`orderedParticipants` is empty but `creatorProfile` is set), the table still renders. The creator's read-only row appears alone with no other participant rows.

#### EC-4: Ersteller-Konto gelöscht — `created_by` verweist auf gelöschten User — kein Label, keine Fehlermeldung
- [x] PASS — `page.tsx` lines 63-71: if the profiles query returns null for the creator, `creatorProfile` is set to `null`. The read-only row at line 309 requires `creatorProfile !== null`, so no row is injected and no crash occurs. If only the auth account is deleted but the `profiles` row persists (orphaned), the ★ renders without crashing — acceptable per spec.

### Security Audit Results
- [x] Authentication: `page.tsx` line 15-16 redirects unauthenticated users to `/login` before any data is fetched.
- [x] Authorization: `poll.created_by` is fetched server-side from Supabase; clients cannot supply or override it. The creator label cannot be forged.
- [x] Data exposure: `creatorProfile.user_id` (a UUID) and `display_name` are passed as React props and visible in browser DevTools. No sensitive PII beyond what is already displayed in the UI.
- [x] No new user inputs — this feature has no forms or text fields; no injection risk.
- [x] No new API routes introduced.

### Bugs Found

#### BUG-1: "Ja-Stimmen" footer denominator excludes the read-only creator row
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Create a poll with at least one other participant (not the creator).
  2. Do NOT add the creator as a participant (creator is not in `poll_participants`).
  3. Open the poll detail page. The table shows the creator's read-only row plus the other participant rows.
  4. Observe the "Ja-Stimmen" footer row.
  - **Expected:** Denominator reflects the number of visible rows (creator row + participants), e.g. "1 / 3".
  - **Actual:** `response-grid.tsx` line 419 uses `const total = participants.length`, which only counts `poll_participants` entries. The creator's read-only row is not in `participants`, so the denominator is understated, e.g. "1 / 2" when 3 rows are visible.
- **Priority:** Fix before deployment

### Summary
- **Acceptance Criteria:** 8/8 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low)
- **Security:** Pass
- **Production Ready:** NO — 1 medium bug must be fixed first
- **Recommendation:** Fix BUG-1, then re-run QA.
