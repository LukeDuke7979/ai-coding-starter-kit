# PROJ-7: Navigation – Headline als Home-Link

## Status: In Review

## Abhängigkeiten
- Benötigt: PROJ-1 (User Authentication) – NavBar existiert bereits

## User Stories
- Als eingeloggter User möchte ich auf den App-Titel "WerHatZeit" klicken können, um zur Startseite (Dashboard) zu gelangen, damit ich schnell navigieren kann ohne den Browser-Zurück-Button zu benutzen.
- Als User auf einer Unterseite (z.B. Umfrage-Detail, Bearbeiten) möchte ich jederzeit durch Klick auf das Logo zurück zum Dashboard kommen.
- Als nicht eingeloggter User (z.B. Login-Seite) soll der Titel ebenfalls klickbar sein und zur Login-Seite oder Startseite führen.

## Acceptance Criteria
- [ ] Der App-Titel "WerHatZeit" in der NavBar ist ein klickbarer Link
- [ ] Klick auf den Titel navigiert eingeloggte User zu `/dashboard`
- [ ] Klick auf den Titel navigiert nicht eingeloggte User zu `/` oder `/login`
- [ ] Der Link hat keinen sichtbaren Unterstrich oder veränderte Farbe (sieht wie normaler Titel aus)
- [ ] Hover-Cursor zeigt `pointer` an, damit erkennbar ist dass es klickbar ist
- [ ] Die Navigation funktioniert auf allen Seiten der App (Dashboard, Poll-Detail, Poll-Erstellen, Poll-Bearbeiten)

## Edge Cases
- Login-Seite: Titel führt zu `/` (Marketing-Startseite oder auch `/login`)
- Bereits auf dem Dashboard: Klick lädt die Seite nicht neu, bleibt auf `/dashboard`
- Mobile: Touch auf den Titel funktioniert genauso wie Click auf Desktop

---

## Tech-Design (Solution Architect)

### Was gebaut wird

Der App-Titel "WerHatZeit" in der NavBar wird in einen klickbaren Link umgewandelt.

### Component-Struktur

```
NavBar (src/components/nav-bar.tsx) — GEÄNDERT
└── Titel "WerHatZeit"
    → Eingeloggt: Link zu /dashboard
    → Nicht eingeloggt: Link zu /
    → Kein Unterstrich, kein Farbwechsel (sieht wie Titel aus)
    → Cursor: pointer (zeigt Klickbarkeit an)
```

### Daten-Modell

Keine Datenbank-Änderungen. Die Session-Information ist bereits in der NavBar vorhanden.

### Tech-Entscheidungen

- **Warum Next.js `<Link>` statt `<a>`?** — Clientseitige Navigation ohne Seitenreload, konsistent mit dem Rest der App.
- **Warum kein Backend?** — Rein visuelle Änderung; keine Daten werden geladen oder gespeichert.

### Geänderte Dateien

- `src/components/nav-bar.tsx` — Titel in `<Link>` mit bedingtem href einwickeln

### Neue Dependencies

Keine. Next.js `Link` ist bereits vorhanden.

---

## QA Test Results

**Tested:** 2026-03-06
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) — Static code audit (no running server available)

### Acceptance Criteria Status

#### AC-1: Der App-Titel "WerHatZeit" in der NavBar ist ein klickbarer Link
- [x] PASS — `nav-bar.tsx` line 32 wraps the title in `<Link href="/dashboard">`. Next.js `Link` renders as an `<a>` tag, making it fully clickable.

#### AC-2: Klick auf den Titel navigiert eingeloggte User zu `/dashboard`
- [x] PASS — `href="/dashboard"` is hardcoded in `nav-bar.tsx`. The NavBar is only rendered for authenticated users (all dashboard pages require auth via middleware and page-level `redirect('/login')`).

#### AC-3: Klick auf den Titel navigiert nicht eingeloggte User zu `/` oder `/login`
- [ ] BUG-1 — The `NavBar` component is NOT rendered on unauthenticated pages (`/login`, `/register`). The login page uses `AuthLayout` which renders the title "WerHatZeit" as a plain `<h1>` (not a link). The acceptance criterion is therefore not met for the unauthenticated state — the title on the login/register page is not clickable at all.

#### AC-4: Der Link hat keinen sichtbaren Unterstrich oder veränderte Farbe
- [x] PASS — The `<Link>` in `nav-bar.tsx` has `className="text-lg font-bold text-emerald-700 cursor-pointer"`. No underline class is present; Next.js `<Link>` does not add underline by default with Tailwind. Color matches the existing heading style.

#### AC-5: Hover-Cursor zeigt `pointer` an
- [x] PASS — `cursor-pointer` is explicitly set on the `<Link>` element (line 32).

#### AC-6: Die Navigation funktioniert auf allen Seiten der App
- [x] PASS — The shared `NavBar` component is used consistently across all authenticated pages (dashboard layout, poll detail page, etc.). Since it always links to `/dashboard`, it works from any authenticated page.

### Edge Cases Status

#### EC-1: Login-Seite — Titel führt zu `/` oder `/login`
- [ ] BUG-1 (same as AC-3) — The "WerHatZeit" heading on the login page (`auth-layout.tsx` line 14) is a plain `<h1>`, not a link. No click navigation is implemented for unauthenticated visitors on the login or register pages.

#### EC-2: Bereits auf dem Dashboard — Klick lädt die Seite nicht neu
- [x] PASS — Next.js `<Link>` performs client-side navigation. Clicking the title while already on `/dashboard` does not trigger a full page reload.

#### EC-3: Mobile — Touch funktioniert genauso wie Click
- [x] PASS — Next.js `<Link>` is touch-compatible by default. No mobile-specific issue identified in the code.

### Security Audit Results
- [x] No security concerns for this feature — it is a purely navigational UI change with no data access, no API calls, and no user input involved.

### Bugs Found

#### BUG-1: Title not clickable on unauthenticated pages (Login / Register)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Navigate to `/login` or `/register` (logged-out state)
  2. Observe the "WerHatZeit" heading at the top of the auth card
  3. Expected: Clicking it navigates to `/` or `/login`
  4. Actual: It is a plain `<h1>` with no link — nothing happens on click. The cursor does not change to pointer.
- **Affected file:** `src/components/auth-layout.tsx` line 14
- **Priority:** Fix in next sprint (low impact — logged-out users cannot be redirected anywhere useful besides the page they are already on)

### Summary
- **Acceptance Criteria:** 5/6 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 0 medium, 1 low)
- **Security:** Pass
- **Production Ready:** YES (the one failing criterion is low-severity and concerns a page where users are already located)
- **Recommendation:** Deploy. Fix BUG-1 in next sprint.
