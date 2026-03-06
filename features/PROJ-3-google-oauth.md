# PROJ-3: Google OAuth (1-Click Signup & Login)

## Status: Planned

## Beschreibung
User koennen sich mit ihrem Google-Account bei WerHatZeit anmelden. Falls die Google-Email bereits per Email/Passwort registriert ist, werden die Accounts automatisch zusammengefuehrt (gleiche Email = gleicher Account). Der Anzeigename wird aus dem Google-Profil uebernommen.

## User Stories

- Als neuer User moechte ich mich mit einem Klick ueber Google anmelden, ohne ein Passwort setzen zu muessen.
- Als bestehender Email/Passwort-User moechte ich mich auch mit Google (gleiche Email) einloggen koennen, damit ich einen einfacheren Login-Weg habe.
- Als Google-User moechte ich, dass mein Google-Anzeigename automatisch als Anzeigename uebernommen wird.
- Als User moechte ich nach Google-Login direkt im Dashboard sein, ohne zusaetzliche Schritte.

## Acceptance Criteria

- [ ] "Mit Google anmelden"-Button auf Login- und Registrierungsseite sichtbar
- [ ] Klick oeffnet Google OAuth Popup/Redirect (Standard Google Consent Screen)
- [ ] Nach erfolgreichem Google-Login: User ist eingeloggt und wird zum Dashboard weitergeleitet
- [ ] Neuer Google-User: Account wird automatisch angelegt, Anzeigename = Google-Displayname
- [ ] Email-Adresse aus Google gilt als automatisch verifiziert (keine separate Email-Verification noetig)
- [ ] Bestehender Email/Passwort-Account mit gleicher Email: Accounts werden automatisch gemerged
  - User kann danach sowohl mit Google als auch Email/Passwort einloggen
  - Alle bestehenden Daten (Umfragen, Antworten) bleiben erhalten
- [ ] Google-Login erstellt dieselbe persistente Session wie Email/Passwort-Login (bleibt nach Reload erhalten)
- [ ] Wenn User Google-Login abbricht (schliesst Popup): Zurueck zur Login-Seite, keine Fehlermeldung
- [ ] Falls Google-Login fehlschlaegt (Google-Fehler): Fehlermeldung + Fallback auf Email/Passwort

## Edge Cases

- **Google-Account-Email stimmt mit bestehendem Account ueberein:** Automatischer Merge, beide Login-Methoden werden aktiv
- **User hat zwei Google-Accounts, loggt sich mit anderem ein:** Neuer separater Account wird erstellt (andere Email)
- **Google-Consent-Screen wird abgebrochen:** Keine Aktion, User bleibt auf Login-Seite
- **Google-API nicht erreichbar (Timeout):** Fehlermeldung "Google-Login momentan nicht verfuegbar, bitte mit Email einloggen"
- **Google gibt keine Email zurueck (seltener Grenzfall):** Fehlermeldung, kein Account angelegt
- **User aendert spaeter Google-Displayname:** Anzeigename in WerHatZeit bleibt unveraendert (keine Auto-Sync)
- **Popup geblockt durch Browser:** Fallback auf Redirect-Flow statt Popup

## Technische Anforderungen

- Auth-Provider: Supabase Auth mit Google OAuth 2.0 Provider
- Google Cloud Console: OAuth-Client-ID und Secret konfigurieren
- Redirect-URI muss in Google Console eingetragen sein
- Account-Merge-Logik: Supabase identische Email = gleicher User-Record

## Abhaengigkeiten

- Benoetigt: PROJ-2 (User Login & Session) - Session-Handling wird wiederverwendet
- Optionale Erweiterung von: PROJ-1 (Registrierung) - Google als alternativer Registrierungsweg

---

## Tech-Design (Solution Architect)

> Google OAuth wird als Erweiterung der bestehenden Auth-Infrastruktur gebaut. Kein eigener Backend-Code noetig - Supabase verwaltet den OAuth-Flow komplett.

### Component-Struktur

```
GoogleLoginButton (wiederverwendbare Komponente)
├── Google-Logo Icon
└── "Mit Google anmelden" Text

Wird eingebunden in:
├── Login-Seite (/login)     → bereits in PROJ-2 vorgesehen
└── Register-Seite (/register) → bereits in PROJ-1 vorgesehen

Auth-Callback-Seite (/auth/callback)
└── [Unsichtbare Seite - verarbeitet nur den Supabase-Redirect]
    → Prueft ob neuer oder bestehender User
    → Legt ggf. Profile-Eintrag an
    → Leitet weiter zu /dashboard
```

### OAuth-Ablauf (vereinfacht)

```
1. User klickt "Mit Google anmelden"
2. Browser oeffnet Google Consent Screen (Redirect, kein Popup)
3. User bestaetigt bei Google
4. Google leitet zurueck zu /auth/callback?code=...
5. Supabase tauscht Code gegen Session aus
6. Supabase prueft: Email bereits registriert?
   → Ja: Accounts werden gemerged (gleicher User-Record)
   → Nein: Neuer Account + Profile-Eintrag anlegen
7. Weiterleitung zu /dashboard
```

### Einmalige Konfiguration (kein Code)

```
Google Cloud Console:
→ OAuth 2.0 Client anlegen
→ Redirect-URI eintragen: https://<domain>/auth/callback

Supabase Dashboard:
→ Authentication → Providers → Google aktivieren
→ Client ID + Secret aus Google Cloud eintragen
```

### Tech-Entscheidungen

```
Warum Redirect-Flow statt Popup?
→ Popups werden von vielen Browsern geblockt (Safari, Mobile).
  Redirect funktioniert universell und ist der empfohlene Standard.

Warum kein eigener Google-OAuth-Server-Code?
→ Supabase verwaltet den kompletten OAuth-Handshake.
  Wir brauchen nur den Callback-Handler in /auth/callback.

Wie funktioniert der Account-Merge?
→ Supabase verwendet Email als eindeutigen Identifier.
  Gleiche Email = gleicher auth.users-Eintrag, egal ob Email oder Google.
  Keine eigene Merge-Logik noetig.
```

---

## QA Test Results

**Reviewer:** QA Engineer
**Reviewed files:** `src/components/google-login-button.tsx`, `src/app/auth/callback/route.ts`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `supabase/migrations/20240101000000_profiles.sql`

### Acceptance Criteria

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | Google-Button auf Login- und Registrierungsseite | PASS | `GoogleLoginButton` in beiden Seiten eingebunden |
| 2 | Klick startet OAuth Redirect (kein Popup) | PASS | `signInWithOAuth` mit `redirectTo` - kein `popup: true` |
| 3 | Nach erfolgreichem Login: eingeloggt + Dashboard | PASS | `callback/route.ts` mit `exchangeCodeForSession` -> `/dashboard` |
| 4 | Neuer Google-User: Account + Displayname | PASS | DB-Trigger nutzt `raw_user_meta_data->>'name'` fuer Google-Displayname |
| 5 | Email automatisch verifiziert | PASS | Supabase markiert Google-Emails als verifiziert |
| 6 | Account-Merge fuer bestehende Email | PASS | Supabase-native, gleiche Email = gleicher Record |
| 7 | Persistente Session wie Email/Passwort-Login | PASS | Selbe Cookie-Infrastruktur via `@supabase/ssr` |
| 8 | Google-Login abgebrochen: keine Fehlermeldung | FAIL | Abbruch leitet zu `/auth/verify-email?error=invalid_link` - User sieht irreführenden "Link ungueltig"-Screen |
| 9 | Google-Fehler: Fehlermeldung + Fallback | PASS | `GoogleLoginButton` zeigt Fehlertext bei `signInWithOAuth`-Fehler |

### Gefundene Issues

**ISSUE-3-01 — MEDIUM — Abgebrochener Google-OAuth zeigt falschen Error-Screen**
- **Datei:** `src/app/auth/callback/route.ts:57`
- **Problem:** Wenn der User den Google-Consent-Screen abbricht, kommt er ohne `code` auf `/auth/callback` zurueck. Die Route faellt dann in den Fehler-Fallback und leitet zu `/auth/verify-email?error=invalid_link` weiter. Der User sieht "Link ungueltig" - das ist irreführend und widerspricht der Spec ("keine Fehlermeldung, zurueck zur Login-Seite").
- **Empfehlung:** In `callback/route.ts` pruefen ob ein `error` Query-Parameter von Google vorhanden ist (z.B. `error=access_denied`) und bei OAuth-Abbruch direkt zu `/login` weiterleiten statt zur Error-Seite.

**ISSUE-3-02 — INFO — Kein Fehler-Handling bei fehlendem Displayname**
- **Datei:** `supabase/migrations/20240101000000_profiles.sql`
- **Problem:** Der DB-Trigger faellt auf `split_part(NEW.email, '@', 1)` zurueck wenn `display_name` und `name` in `raw_user_meta_data` fehlen. In seltenen Google-Grenzfaellen (kein Displayname konfiguriert) wuerde der Part vor dem @-Zeichen als Name verwendet. Funktional akzeptabel.
- **Empfehlung:** Accept as-is.

### Ergebnis

**PROJ-3: APPROVED mit einem UX-Issue.** ISSUE-3-01 sollte behoben werden, da der User bei OAuth-Abbruch auf einer verwirrenden Error-Seite landet. Kein Sicherheitsrisiko.
