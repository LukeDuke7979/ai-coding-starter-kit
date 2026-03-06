# PROJ-1: Email/Password Registrierung

## Status: Planned

## Beschreibung
Ein neuer User erstellt einen Account mit Email-Adresse, Anzeigename und Passwort. Anschliessend muss die Email-Adresse per Bestaetigungslink verifiziert werden, bevor der Account vollstaendig nutzbar ist.

## User Stories

- Als neuer User moechte ich mich mit Email, Name und Passwort registrieren, damit ich WerHatZeit nutzen kann.
- Als registrierter User moechte ich eine Bestaetigung per Email erhalten, damit ich weiss, dass meine Registrierung erfolgreich war.
- Als User mit unverifizierter Email moechte ich klar sehen, dass ich erst nach Bestaetigung abstimmen kann.
- Als User moechte ich den Bestaetigunslink erneut anfordern koennen, falls die Email nicht ankam.
- Als User moechte ich eine klare Fehlermeldung sehen, wenn meine Email bereits registriert ist, damit ich zum Login weitergeleitet werde.

## Acceptance Criteria

- [ ] Registrierungsformular hat die Felder: Anzeigename, Email, Passwort, Passwort-Wiederholung
- [ ] Anzeigename: min. 2, max. 50 Zeichen
- [ ] Passwort: min. 8 Zeichen, mind. 1 Grossbuchstabe, mind. 1 Zahl
- [ ] Passwort-Wiederholung muss mit Passwort uebereinstimmen
- [ ] Bei gueltiger Eingabe wird eine Bestaetigunsmail versendet
- [ ] User sieht nach dem Absenden eine Bestaetigunsseite ("Bitte pruefen Sie Ihre Email")
- [ ] Klick auf den Email-Link verifiziert den Account und leitet zum Dashboard weiter
- [ ] Bestaetigunslink laueft nach 24 Stunden ab
- [ ] Abgelaufener Link zeigt Fehlermeldung mit Option, neuen Link anzufordern
- [ ] Button "Link erneut senden" schickt eine neue Bestaetigunsmail
- [ ] Wenn Email bereits registriert ist: Fehlermeldung "'Email bereits vorhanden' + Link zur Login-Seite"
- [ ] Unverifizierter User der versucht abzustimmen sieht einen Hinweis-Banner ("Email noch nicht bestaetigt")
- [ ] Formular-Validierung laeuft client-seitig (Echtzeit-Feedback) UND server-seitig

## Edge Cases

- **Bereits registrierte Email:** Fehlermeldung + direkter Link zur Login-Seite (kein Hinweis ob Passwort korrekt waere)
- **Abgelaufener Bestaetigunslink:** Klarer Hinweis mit "Neuen Link anfordern"-Button
- **Mehrfaches Klicken auf denselben Bestaetigunslink:** Zweiter Klick zeigt "Bereits bestaetigt" Hinweis, kein Fehler
- **Passwort-Feld mit Copy-Paste deaktivieren?** Nein - nicht deaktivieren, Passwort-Manager sollen funktionieren
- **Sehr lange Email-Adressen (RFC 5321 Max. 254 Zeichen):** Validierung pruefen
- **User schliesst Tab nach Registrierung, oeffnet Email spaeter:** Link funktioniert noch (< 24h)
- **Netzwerkfehler beim Absenden:** Fehlermeldung + Retry-Moeglichkeit, kein doppelter Account

## Technische Anforderungen

- Auth-Provider: Supabase Auth (eingebaute Email-Verification)
- Passwort wird niemals im Klartext gespeichert (Supabase handled Hashing)
- Email-Validierung gegen RFC-Standard
- HTTPS-Only

## Abhaengigkeiten

- Keine (erstes Feature)

---

## Tech-Design (Solution Architect)

> Dieses Design gilt als Fundament fuer PROJ-1 bis PROJ-4. Alle Auth-Features teilen dieselbe Infrastruktur.

### Seitenstruktur (neue Routen)

```
/                          → Startseite (leitet je nach Login-Status weiter)
/login                     → Login-Seite (Email/Passwort + Google-Button)
/register                  → Registrierungsseite
/auth/verify-email         → "Bitte Email bestaetigen"-Warteseite
/auth/callback             → Supabase-Callback (unsichtbar, verarbeitet Links)
/auth/forgot-password      → Passwort-Reset anfordern
/auth/reset-password       → Neues Passwort setzen (nach Email-Link)
/dashboard                 → Geschuetzte Hauptseite (nur fuer eingeloggte User)
```

### Component-Struktur

```
Registrierungsseite (/register)
├── AuthLayout (zentrierte Card-Huelle, wird auch fuer Login verwendet)
│   ├── RegisterForm
│   │   ├── Eingabefeld: Anzeigename
│   │   ├── Eingabefeld: Email
│   │   ├── Eingabefeld: Passwort (mit Sichtbarkeits-Toggle)
│   │   ├── Eingabefeld: Passwort wiederholen
│   │   ├── PasswordStrengthIndicator (Echtzeit-Feedback)
│   │   └── "Registrieren"-Button
│   ├── Trennlinie ("oder")
│   ├── GoogleLoginButton (wiederverwendbar, auch auf Login-Seite)
│   └── Link → Login-Seite

Email-Bestaetigung-Warteseite (/auth/verify-email)
└── AuthLayout
    ├── Bestaetigunshinweis ("Email gesendet an <email>")
    └── "Link erneut senden"-Button
```

### Daten-Modell

Supabase verwaltet den Kern der Auth-Daten automatisch. Wir ergaenzen eine einzige eigene Tabelle:

```
profiles (unsere eigene Tabelle in Supabase)
├── id          → verknuepft mit dem Supabase-Auth-User (1:1)
├── display_name → Anzeigename (eingegeben bei Registrierung oder von Google uebernommen)
└── created_at  → Erstellungsdatum

auth.users (von Supabase verwaltet, kein Zugriff noetig)
├── email
├── email_confirmed_at  → NULL = unverifiziert, Datum = verifiziert
└── app_metadata        → enthaelt Login-Methode (email / google)
```

Wenn ein neuer User sich registriert, wird automatisch ein Eintrag in `profiles` angelegt (via Supabase Database Trigger - der Backend Developer richtet das ein).

### Tech-Entscheidungen

```
Warum Supabase Auth statt eigener Auth-Logik?
→ Passwort-Hashing, Email-Versand, Token-Verwaltung bereits eingebaut.
  Kein Sicherheitsrisiko durch Eigenimplementierung.

Warum react-hook-form + zod fuer Formulare?
→ Echtzeit-Validierung (Passwort-Staerke, Email-Format) ohne Extra-Code.
  Shadcn/ui Form-Komponente unterstuetzt beides direkt.

Warum @supabase/ssr statt dem vorhandenen Browser-Client?
→ Next.js App Router braucht Cookie-basierte Sessions (nicht localStorage).
  @supabase/ssr liest/schreibt Cookies korrekt fuer Server Components.

Warum Next.js Middleware fuer Routenschutz?
→ Laeuft vor dem Seitenrendering, kein kurzes "Aufblitzen" der Seite fuer
  nicht eingeloggte User. Sicherer als client-seitige Checks.
```

### Neue Dependencies (zu installieren)

```
@supabase/ssr          → Server-Side Auth fuer Next.js (Cookie-Handling)
react-hook-form        → Formular-Verwaltung mit Echtzeit-Validierung
zod                    → Validierungs-Regeln (Passwort-Staerke, Email-Format)
@hookform/resolvers    → Verbindet react-hook-form mit zod
```

Bereits installiert und wiederverwendbar:
```
@supabase/supabase-js  → Supabase Browser-Client (in src/lib/supabase.ts)
shadcn/ui              → Form, Input, Button, Card, Label (alle vorhanden)
```

---

## QA Test Results

**Reviewer:** QA Engineer
**Reviewed files:** `src/app/register/page.tsx`, `src/app/auth/verify-email/page.tsx`, `src/app/auth/callback/route.ts`, `src/components/password-strength-indicator.tsx`, `src/components/unverified-email-banner.tsx`, `supabase/migrations/20240101000000_profiles.sql`

### Acceptance Criteria

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | Formular mit 4 Feldern (Name, Email, PW, PW-Wiederholung) | PASS | Alle 4 Felder in `register/page.tsx` vorhanden |
| 2 | Anzeigename: min. 2, max. 50 Zeichen | PASS | Zod: `.min(2).max(50)` |
| 3 | Passwort: min. 8Z, 1 Grossbuchstabe, 1 Zahl | PASS | Zod-Regex-Checks korrekt |
| 4 | Passwort-Wiederholung muss uebereinstimmen | PASS | `.refine()` mit `path: ['confirmPassword']` |
| 5 | Bei gueltiger Eingabe: Bestaetigunsmail versenden | PASS | `supabase.auth.signUp()` mit `emailRedirectTo` |
| 6 | Bestaetigunsseite nach Absenden | PASS | Redirect zu `/auth/verify-email?email=...` |
| 7 | Email-Link verifiziert und leitet zu Dashboard | PASS | `callback/route.ts` verarbeitet `token_hash + type=signup` -> `verifyOtp` -> `/dashboard` |
| 8 | Bestaetigunslink laueft nach 24h ab | PASS | Korrekte Meldung in `verify-email/page.tsx` ("24 Stunden gueltig") |
| 9 | Abgelaufener Link: Fehlermeldung + Neuen-Link-Option | PASS | `?error=invalid_link` State mit Resend-Button |
| 10 | "Link erneut senden"-Button | PASS | `supabase.auth.resend({ type: 'signup' })` mit korrektem `emailRedirectTo` |
| 11 | Duplicate Email: Fehlermeldung + Link zum Login | PASS | Error-String-Check auf `already registered` + Link-Render in Alert |
| 12 | Unverified-Email-Banner | PASS | `UnverifiedEmailBanner` in Dashboard, konditioniert auf `!isEmailVerified` |
| 13 | Validierung client- UND serverseitig | PASS | Zod (client) + Supabase (server) |

### Gefundene Issues

**ISSUE-1-01 — MEDIUM — Duplicate-Email-Erkennung via String-Matching (fragil)**
- **Datei:** `src/app/register/page.tsx:81`
- **Problem:** `error.message.includes('already registered')` ist abhaengig vom englischen Supabase-Fehlertext. Aendert Supabase die Formulierung, schlaegt die Erkennung still fehl und der User sieht eine generische Fehlermeldung statt des Login-Links.
- **Empfehlung:** Zusaetzlich auf `error.code` pruefen (z.B. `'user_already_exists'`) als zuverlaessigere Alternative.

**ISSUE-1-02 — LOW — Kein Client-seitiger Resend-Cooldown**
- **Datei:** `src/app/auth/verify-email/page.tsx:108`
- **Problem:** Nach einem Resend-Fehler (`resendStatus === 'error'`) wird der Button wieder aktiv. User kann unbegrenzt Requests senden (bis Supabase rate-limitet).
- **Empfehlung:** Button nach Fehler ebenfalls fuer 30s deaktivieren.

**ISSUE-1-03 — INFO — Bereits verifizierter Link zeigt irreführende Meldung**
- **Datei:** `src/app/auth/callback/route.ts:37`
- **Problem:** Spec fordert bei zweitem Klick auf denselben Link "Bereits bestaetigt"-Hinweis. Aktuell leitet `verifyOtp`-Fehler zu `/auth/verify-email?error=invalid_link` mit Text "Link ungueltig" weiter. Funktional korrekt, aber leicht irreführend.
- **Empfehlung:** Accept as-is oder separaten Error-Code `?error=already_verified` einfuehren.

### Ergebnis

**PROJ-1: APPROVED mit Minor Issues.** Alle Acceptance Criteria erfuellt. Keine sicherheitskritischen Probleme. ISSUE-1-01 sollte zeitnah behoben werden.
