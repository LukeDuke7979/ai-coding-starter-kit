# PROJ-2: User Login & Session Management

## Status: Planned

## Beschreibung
Ein registrierter und verifizierter User kann sich mit Email und Passwort einloggen. Die Session bleibt dauerhaft erhalten bis zum expliziten Logout. Nach 5 Fehlversuchen wird der Account kurzzeitig gesperrt (Brute-Force-Schutz).

## User Stories

- Als registrierter User moechte ich mich mit Email und Passwort einloggen, um auf meine Umfragen zuzugreifen.
- Als eingeloggter User moechte ich nach einem Browser-Reload noch eingeloggt sein, damit ich mich nicht staendig neu authentifizieren muss.
- Als User moechte ich mich explizit ausloggen koennen, um meinen Account auf geteilten Geraeten zu schuetzen.
- Als User moechte ich eine klare Fehlermeldung erhalten, wenn Email oder Passwort falsch sind.
- Als unverifizierter User der sich einloggt moechte ich auf die Email-Bestaetigung hingewiesen werden.

## Acceptance Criteria

- [ ] Login-Formular hat die Felder: Email, Passwort
- [ ] Erfolgreicher Login leitet zum Dashboard (oder zur urspruenglich angefragten Seite) weiter
- [ ] Session bleibt nach Browser-Reload erhalten (persistentes Token via Supabase)
- [ ] Logout-Button loescht Session vollstaendig (lokal und serverseitig)
- [ ] Bei falschen Credentials: generische Fehlermeldung "Email oder Passwort falsch" (kein Hinweis welches Feld falsch ist)
- [ ] Nach 5 Fehlversuchen: Account wird fuer 15 Minuten gesperrt, User sieht Countdown-Hinweis
- [ ] Gesperrter Account: Fehlermeldung mit Restzeit ("Bitte warte X Minuten")
- [ ] Unverifizierter User: Login moeglich aber Hinweis-Banner sichtbar, Abstimmungs-Aktionen gesperrt
- [ ] Geschuetzte Routen (Dashboard, Umfragen) leiten nicht eingeloggte User zur Login-Seite weiter
- [ ] Nach erfolgreichem Login wird die urspruenglich angefragte URL wiederhergestellt (Redirect-After-Login)
- [ ] "Passwort vergessen"-Link auf der Login-Seite sichtbar

## Edge Cases

- **Einloggen mit nicht-existenter Email:** Gleiche generische Fehlermeldung (verhindert User-Enumeration)
- **Gleichzeitige Sessions auf mehreren Geraeten:** Beide Sessions gueltig (kein forced logout)
- **Tab im Hintergrund, Token laueft ab:** Beim Wechsel in Tab wird User sanft zur neuen Session aufgefordert
- **Direkt-URL-Aufruf ohne Session:** Weiterleitung zu Login, nach Login Rueckkehr zur angefragten URL
- **Login waehrend Account gesperrt ist:** Rate-Limit Countdown wird angezeigt, keine weiteren Versuche moeglich
- **Logout auf einem Geraet:** Betrifft nur aktuelle Session, andere Geraete bleiben eingeloggt
- **Email mit Gross-/Kleinschreibung (user@EXAMPLE.com vs user@example.com):** Normalisierung zu Kleinbuchstaben

## Technische Anforderungen

- Session-Persistenz via Supabase Auth (JWT mit Refresh Token)
- Rate Limiting: 5 Fehlversuche -> 15 Minuten Sperre (serverseitig)
- Keine sensiblen Daten (Passwort) in Browser-Storage
- HTTPS-Only

## Abhaengigkeiten

- Benoetigt: PROJ-1 (Email/Password Registrierung) - User muss existieren und verifiziert sein

---

## Tech-Design (Solution Architect)

> Baut auf der Infrastruktur aus PROJ-1 auf. Wiederverwendet AuthLayout, GoogleLoginButton und den Supabase-Client.

### Component-Struktur

```
Login-Seite (/login)
├── AuthLayout (dieselbe Card-Huelle wie Register)
│   ├── LoginForm
│   │   ├── Eingabefeld: Email
│   │   ├── Eingabefeld: Passwort (mit Sichtbarkeits-Toggle)
│   │   ├── Link "Passwort vergessen?" → /auth/forgot-password
│   │   └── "Einloggen"-Button
│   ├── Trennlinie ("oder")
│   ├── GoogleLoginButton (wiederverwendet aus PROJ-1/3)
│   └── Link → Registrierungsseite

Dashboard (/dashboard) - geschuetzte Seite
├── NavBar
│   ├── App-Logo "WerHatZeit"
│   └── UserMenu
│       ├── Anzeigename des Users
│       └── "Ausloggen"-Button
├── UnverifiedEmailBanner (nur sichtbar wenn Email nicht bestaetigt)
│   └── "Bestaetigunslink erneut senden"-Button
└── [Haupt-App-Inhalt kommt spaeter]
```

### Session-Funktionsweise

```
Einloggen
→ Supabase gibt JWT + Refresh Token zurueck
→ Wird in einem sicheren HTTP-Only-Cookie gespeichert
→ Bleibt nach Browser-Reload erhalten (persistent)
→ Wird automatisch erneuert bevor er ablaeuft

Ausloggen
→ Cookie wird geloescht (lokal)
→ Session auf Supabase-Server wird invalidiert
→ Weiterleitung zur Login-Seite

Routenschutz (Next.js Middleware)
→ Prueft bei jedem Seitenaufruf ob gueltiger Cookie vorhanden
→ /dashboard/* ohne Session → Weiterleitung zu /login
→ /login mit aktiver Session → Weiterleitung zu /dashboard
```

### Rate Limiting

```
Supabase Auth hat eingebautes Rate Limiting.
Konfiguration im Supabase Dashboard (Auth Settings):
→ Max. 5 Login-Fehlversuche pro IP/Email → 15 Minuten Sperre
→ Kein eigener Code noetig, Supabase liefert Fehlercode zurueck
→ Frontend zeigt Countdown basierend auf Supabase-Fehlermeldung
```

### Tech-Entscheidungen

```
Warum HTTP-Only Cookie statt localStorage fuer die Session?
→ XSS-Angriffe koennen localStorage auslesen, nicht aber HTTP-Only Cookies.
  @supabase/ssr handled das automatisch.

Warum Next.js Middleware fuer Routenschutz?
→ Wird server-seitig ausgefuehrt, kein kurzes "Aufblitzen" der Seite.
  Einmal konfiguriert, schuetzt automatisch alle definierten Routen.
```

---

## QA Test Results

**Reviewer:** QA Engineer
**Reviewed files:** `src/app/login/page.tsx`, `src/app/dashboard/page.tsx`, `middleware.ts`, `src/components/nav-bar.tsx`, `src/components/unverified-email-banner.tsx`

### Acceptance Criteria

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | Login-Formular: Email + Passwort | PASS | Beide Felder vorhanden |
| 2 | Erfolgreicher Login -> Dashboard (oder redirectTo) | PASS | `window.location.href = redirectTo` nach Session |
| 3 | Session nach Browser-Reload erhalten | PASS | `@supabase/ssr` HTTP-Only Cookies + Middleware-Session-Refresh |
| 4 | Logout loescht Session vollstaendig | PASS | `supabase.auth.signOut()` dann Redirect zu `/login` |
| 5 | Generische Fehlermeldung bei falschen Credentials | PASS | "Email oder Passwort falsch." ohne Feldspezifik |
| 6 | Rate-Limit-Erkennung nach Fehlversuchen | PASS | HTTP 429 + keyword detection in `error.message` |
| 7 | Countdown-Hinweis bei gesperrtem Account | PARTIAL | Zeigt fixe "15 Minuten"-Meldung, kein Live-Countdown. Spec fordert Countdown-Hinweis. |
| 8 | Unverifizierter User: Login + Banner | PASS | `UnverifiedEmailBanner` konditioniert auf `!user.email_confirmed_at` |
| 9 | Geschuetzte Routen leiten zu `/login` weiter | PASS | Middleware prueft `/dashboard/*` ohne Session |
| 10 | Redirect-After-Login wiederhergestellt | PASS | `?redirectTo` Param aus `searchParams`, gesetzt vom Middleware |
| 11 | "Passwort vergessen"-Link sichtbar | PASS | Link zu `/auth/forgot-password` inline im Passwort-Label |

### Gefundene Issues

**ISSUE-2-01 — HIGH — Open Redirect Vulnerability**
- **Datei:** `src/app/login/page.tsx:36,69`
- **Problem:** `redirectTo` wird direkt aus dem Query-String gelesen und ohne Validierung als Ziel fuer `window.location.href` verwendet. Ein Angreifer kann `/login?redirectTo=https://evil.com` konstruieren, der User wird nach Login auf eine externe Seite weitergeleitet (Phishing-Risiko).
- **Empfehlung:** `redirectTo` auf relative Pfade beschraenken:
  ```ts
  const raw = searchParams.get('redirectTo') ?? '/dashboard'
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
  ```

**ISSUE-2-02 — LOW — Kein Live-Countdown bei Rate-Limit**
- **Datei:** `src/app/login/page.tsx:60`
- **Problem:** Spec sagt "User sieht Countdown-Hinweis". Aktuell: statischer Text "Bitte warte 15 Minuten". Supabase liefert keine Restzeit in der Fehlermeldung, daher waere ein echter Countdown nur mit einem lokalen Timer nach Rate-Limit-Erkennung umsetzbar.
- **Empfehlung:** Lokalen 15-Minuten-Timer nach Rate-Limit-Fehler starten und im UI anzeigen, oder Formulierung in der Spec auf "Hinweis mit Wartezeit" abschwaechen.

**ISSUE-2-03 — INFO — GoogleLoginButton ausserhalb Suspense-Boundary**
- **Datei:** `src/app/login/page.tsx:143`
- **Problem:** `GoogleLoginButton` befindet sich ausserhalb der `<Suspense>`-Boundary. Kein Bug (GoogleLoginButton nutzt `useSearchParams` nicht), aber das Layout-Rendering koennte kurz inkonsistent wirken waehrend `LoginForm` noch laedt.
- **Empfehlung:** Accept as-is.

### Ergebnis

**PROJ-2: APPROVED mit einem sicherheitsrelevanten Issue.** ISSUE-2-01 (Open Redirect) muss vor dem Go-Live behoben werden. ISSUE-2-02 ist ein UX-Kompromiss und kann zurueckgestellt werden.
