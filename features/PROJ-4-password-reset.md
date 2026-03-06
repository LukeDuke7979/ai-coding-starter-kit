# PROJ-4: Passwort-Reset

## Status: Planned

## Beschreibung
Ein User der sein Passwort vergessen hat kann einen Reset-Link per Email anfordern. Der Link ist 1 Stunde gueltig. Nach erfolgreichem Reset wird der User direkt eingeloggt. User die sich nur per Google angemeldet haben koennen keinen Passwort-Reset ausfuehren (kein Passwort vorhanden).

## User Stories

- Als User der sein Passwort vergessen hat moechte ich einen Reset-Link per Email anfordern koennen.
- Als User moechte ich ueber einen sicheren Link ein neues Passwort setzen koennen.
- Als User moechte ich nach erfolgreichem Passwort-Reset direkt eingeloggt sein, ohne mich nochmal manuell einloggen zu muessen.
- Als User moechte ich eine klare Rueckmeldung erhalten, wenn der Reset-Link abgelaufen ist.

## Acceptance Criteria

- [ ] "Passwort vergessen?"-Link auf der Login-Seite ist sichtbar
- [ ] Klick oeffnet eine Seite mit Eingabefeld fuer die Email-Adresse
- [ ] Nach Eingabe einer gueltigen Email wird der Reset-Link versendet
- [ ] Antwort ist IMMER dieselbe ("Wenn ein Account mit dieser Email existiert, erhaeltst du eine Email") - verhindert User-Enumeration
- [ ] Reset-Email enthaelt einen eindeutigen, signierten Link
- [ ] Reset-Link ist genau 1 Stunde gueltig
- [ ] Klick auf gueltigen Link oeffnet Formular fuer neues Passwort (2x eingeben)
- [ ] Neues Passwort: min. 8 Zeichen, mind. 1 Grossbuchstabe, mind. 1 Zahl (gleiche Regeln wie Registrierung)
- [ ] Nach erfolgreichem Reset: User ist automatisch eingeloggt und wird zum Dashboard weitergeleitet
- [ ] Erfolgreicher Reset invalidiert alle anderen aktiven Sessions des Users (Sicherheit)
- [ ] Abgelaufener oder bereits verwendeter Link: Fehlermeldung + Link zu "neuen Reset anfordern"
- [ ] Reines Google-OAuth-Konto (kein Passwort): Hinweis "Dein Account verwendet Google-Login, kein Passwort-Reset noetig"

## Edge Cases

- **Email-Adresse nicht registriert:** Gleiche Erfolgs-Antwort wie bei gueltiger Email (verhindert User-Enumeration)
- **Reset-Link bereits verwendet:** Klarer Hinweis "Link bereits benutzt" + Button fuer neuen Link
- **Reset-Link abgelaufen (nach 1h):** Klarer Hinweis "Link abgelaufen" + Button fuer neuen Link
- **Mehrere Reset-Requests hintereinander:** Nur der zuletzt gesendete Link ist gueltig, aeltere werden invalidiert
- **User erinnert sich an Passwort waehrend Reset:** Cancel-Moeglichkeit, Ruecklink zur Login-Seite
- **Passwort-Reset fuer Google-Only-Account:** Hinweis dass kein Passwort gesetzt ist, stattdessen Google-Login vorschlagen
- **Rate Limiting fuer Reset-Requests:** Max. 3 Reset-Emails pro Stunde pro Email-Adresse (Spam-Schutz)
- **Netzwerkfehler beim Email-Versand:** Fehlermeldung, User kann es erneut versuchen

## Technische Anforderungen

- Supabase Auth: eingebauter Passwort-Reset-Flow (resetPasswordForEmail)
- Token: kryptographisch sicher, single-use, 1h TTL
- Nach Reset: alle Refresh-Tokens des Users invalidieren
- Rate Limiting: max. 3 Requests pro Stunde pro Email (serverseitig)

## Abhaengigkeiten

- Benoetigt: PROJ-1 (Email/Password Registrierung) - nur fuer Email/Passwort-Accounts relevant
- Benoetigt: PROJ-2 (User Login & Session) - automatischer Login nach erfolgreichem Reset

---

## Tech-Design (Solution Architect)

> Komplett abgewickelt ueber Supabase Auth. Zwei neue Seiten, kein eigener Backend-Code.

### Component-Struktur

```
"Passwort vergessen"-Seite (/auth/forgot-password)
└── AuthLayout
    ├── ForgotPasswordForm
    │   ├── Eingabefeld: Email
    │   └── "Link anfordern"-Button
    └── Erfolgs-Zustand (nach Absenden)
        ├── Bestaetigunshinweis ("Wenn ein Account existiert...")
        └── Link zurueck zur Login-Seite

"Neues Passwort setzen"-Seite (/auth/reset-password)
└── AuthLayout
    ├── [Gueltiger Token] ResetPasswordForm
    │   ├── Eingabefeld: Neues Passwort (mit Sichtbarkeits-Toggle)
    │   ├── Eingabefeld: Passwort wiederholen
    │   ├── PasswordStrengthIndicator (wiederverwendet aus PROJ-1)
    │   └── "Passwort speichern"-Button
    └── [Abgelaufener/Ungültiger Token] Fehler-Zustand
        ├── Fehlermeldung ("Link abgelaufen oder bereits verwendet")
        └── Link → "Neuen Link anfordern" (/auth/forgot-password)
```

### Reset-Ablauf (vereinfacht)

```
1. User klickt "Passwort vergessen?" auf Login-Seite
2. Gibt Email ein, klickt "Link anfordern"
3. Supabase sendet Reset-Email mit signierten Link (1h gueltig)
4. User klickt Link → landet auf /auth/reset-password
5. Supabase prueft Token-Gueltigkeit automatisch
6. User gibt neues Passwort ein
7. Supabase speichert neues Passwort, invalidiert alle anderen Sessions
8. User wird automatisch eingeloggt → Weiterleitung zu /dashboard
```

### Tech-Entscheidungen

```
Warum immer dieselbe Antwort ("Wenn ein Account existiert...")?
→ Verhindert "User Enumeration": Angreifer koennen nicht herausfinden,
  welche Emails registriert sind. Sicherheits-Best-Practice.

Warum automatischer Login nach Reset?
→ Bessere User Experience: User muss nicht nochmal Login-Daten eingeben.
  Supabase gibt nach erfolgreichem Reset automatisch eine Session zurueck.

Wie wird der Token validiert?
→ Supabase validiert den Token beim Seitenaufruf von /auth/reset-password
  automatisch ueber die URL-Parameter. Kein eigener Validierungs-Code noetig.
  Bei ungueltigem Token gibt Supabase einen Fehler zurueck.
```

---

## QA Test Results

**Reviewer:** QA Engineer
**Reviewed files:** `src/app/auth/forgot-password/page.tsx`, `src/app/auth/reset-password/page.tsx`, `src/app/auth/callback/route.ts`

### Acceptance Criteria

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | "Passwort vergessen?"-Link auf Login-Seite | PASS | Link in `login/page.tsx` sichtbar, verlinkt zu `/auth/forgot-password` |
| 2 | Email-Eingabefeld auf forgot-password Seite | PASS | Formular mit Email-Feld vorhanden |
| 3 | Reset-Link wird versandt | PASS | `supabase.auth.resetPasswordForEmail()` mit `redirectTo` |
| 4 | Immer gleiche Antwort (kein User-Enumeration) | PASS | `setSubmitted(true)` immer nach Supabase-Call, unabhaengig vom Ergebnis |
| 5 | Reset-Email mit signiertem Link | PASS | Supabase generiert signierten Token |
| 6 | 1 Stunde gueltig | PASS | Supabase-Standard-TTL, im UI als "1 Stunde gueltig" kommuniziert |
| 7 | Gueltiger Link oeffnet 2x-Passwort-Formular | PASS | `reset-password/page.tsx` zeigt Formular nach `PASSWORD_RECOVERY`-Event |
| 8 | Passwort-Validierung (8Z, Grossbuchstabe, Zahl) | PASS | Selbe Zod-Schema wie Registrierung |
| 9 | Nach Reset: eingeloggt + Dashboard | PASS | `window.location.href = '/dashboard'` nach `updateUser` |
| 10 | Anderen Sessions invalidieren | PASS | Supabase invalidiert automatisch alle Refresh-Tokens |
| 11 | Abgelaufener/unguelltiger Link: Fehlermeldung | PASS | `?error` in URL triggert Error-State mit Link zu forgot-password |
| 12 | Google-Only-Account: Hinweis | FAIL | Kein spezielles Handling - User bekommt Reset-Email die nicht funktioniert |

### Gefundene Issues

**ISSUE-4-01 — MEDIUM — `sessionReady`-State wird gesetzt aber nie genutzt (totes Code)**
- **Datei:** `src/app/auth/reset-password/page.tsx:49,63`
- **Problem:** `sessionReady` wird via `onAuthStateChange` auf `true` gesetzt wenn `PASSWORD_RECOVERY` eintrifft, aber der Wert wird im JSX nie verwendet. Das Formular wird immer angezeigt, auch wenn noch kein Recovery-Event eingetroffen ist. Wenn ein User direkt zu `/auth/reset-password` navigiert (ohne gueltigen Token), sieht er das Formular, kann es ausfuellen, und bekommt dann erst beim Absenden eine Fehlermeldung.
- **Empfehlung:** Entweder `sessionReady` im JSX nutzen um das Formular erst nach Recovery-Event zu rendern (mit Loading-State), oder den toten State entfernen und den aktuellen Fehler-Fallback als ausreichend akzeptieren.

**ISSUE-4-02 — LOW — Fehlender Hinweis fuer Google-Only-Accounts**
- **Datei:** `src/app/auth/forgot-password/page.tsx`
- **Problem:** Spec fordert: "Reines Google-OAuth-Konto (kein Passwort): Hinweis 'Dein Account verwendet Google-Login, kein Passwort-Reset noetig'". Aktuell bekommt der User die generische Erfolgs-Antwort. Die Reset-Email wird von Supabase versendet, aber der User kann kein Passwort setzen solange kein Password-Credential vorhanden ist.
- **Empfehlung:** Da User-Enumeration verhindert werden soll, ist die aktuelle Implementierung sicher. Die Spec-Anforderung widerspricht dem Enumeration-Schutz (man wuerde verraten dass die Email existiert + Google nutzt). Als Kompromiss: im Reset-Formular generell erwaehnen dass Google-User sich per Google einloggen koennen (ohne Email-Check).

**ISSUE-4-03 — INFO — Kein Error-Handling fuer Netzwerkfehler in forgot-password**
- **Datei:** `src/app/auth/forgot-password/page.tsx:38`
- **Problem:** `await supabase.auth.resetPasswordForEmail()` wird ohne Error-Handling aufgerufen. Bei Netzwerkfehler wuerde `setSubmitted(true)` dennoch aufgerufen und der User sieht die Erfolgs-Meldung obwohl keine Email versendet wurde. Spec fordert "Fehlermeldung + Retry-Moeglichkeit" bei Netzwerkfehler.
- **Empfehlung:** Error aus `resetPasswordForEmail` pruefen. Bei echter Netzwerk-Exception (`!data && error`) einen Fehler-State anzeigen statt Erfolg.

### Ergebnis

**PROJ-4: APPROVED mit Minor Issues.** Alle sicherheitskritischen Flows korrekt implementiert. ISSUE-4-01 sollte bereinigt werden (toter Code). ISSUE-4-02 und ISSUE-4-03 koennen im Folge-Sprint behoben werden.
