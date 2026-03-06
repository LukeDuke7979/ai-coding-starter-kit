# Supabase MCP Server - Einrichtung und Verwendung

## ✅ Was wurde eingerichtet?

### 1. Konfigurationsdateien

#### [.env.local](.env.local)
Die lokalen Umgebungsvariablen für Next.js:
```env
NEXT_PUBLIC_SUPABASE_URL=https://psjwqfytzqvaxikacspw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Ihr Key]
SUPABASE_SERVICE_ROLE_KEY=[Ihr Key]
```

#### [mcp.json](mcp.json)
Die MCP Server Konfiguration:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer [Ihr Service Role Key]"
      }
    }
  }
}
```

#### [src/lib/supabase.ts](src/lib/supabase.ts)
Der Supabase Client wurde aktiviert und ist nun einsatzbereit!

---

## 🚀 Wie verwende ich den MCP Server?

### Mit Claude Code

Der Supabase MCP Server ermöglicht es Claude Code, direkt mit Ihrer Supabase-Datenbank zu interagieren.

**Wichtig:** Die `mcp.json` muss in Ihrer globalen Claude Code Konfiguration sein:
- Windows: `%USERPROFILE%\.claude\mcp.json`
- Linux/Mac: `~/.claude/mcp.json`

Sie können die Datei dorthin verschieben:
```bash
# Windows (PowerShell)
cp mcp.json $env:USERPROFILE\.claude\mcp.json

# Linux/Mac
cp mcp.json ~/.claude/mcp.json
```

### Verfügbare MCP-Funktionen

Mit dem Supabase MCP Server kann Claude Code:
1. **Datenbank-Abfragen ausführen** - SQL-Queries direkt ausführen
2. **Tabellen erstellen/ändern** - Datenbankschema verwalten
3. **Daten einfügen/aktualisieren** - CRUD-Operationen
4. **Authentifizierung testen** - User-Management
5. **Storage verwalten** - Dateien hochladen/abrufen
6. **Edge Functions deployen** - Serverless Functions

---

## 💡 Beispiel-Verwendung in der App

### 1. Daten abrufen
```typescript
import { supabase } from '@/lib/supabase'

export async function getTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')

  if (error) throw error
  return data
}
```

### 2. Daten einfügen
```typescript
export async function addTodo(title: string) {
  const { data, error } = await supabase
    .from('todos')
    .insert({ title, completed: false })
    .select()

  if (error) throw error
  return data
}
```

### 3. In React Server Components (App Router)
```typescript
// src/app/todos/page.tsx
import { supabase } from '@/lib/supabase'

export default async function TodosPage() {
  const { data: todos } = await supabase
    .from('todos')
    .select('*')

  return (
    <div>
      <h1>Todos</h1>
      {todos?.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  )
}
```

### 4. In Client Components
```typescript
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function TodoList() {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    async function fetchTodos() {
      const { data } = await supabase.from('todos').select('*')
      setTodos(data || [])
    }
    fetchTodos()
  }, [])

  return <div>{/* Render todos */}</div>
}
```

---

## 🎯 Nächste Schritte

### Mit Claude Code können Sie jetzt sagen:

- "Erstelle eine Tabelle 'todos' mit den Feldern id, title, completed, created_at"
- "Füge 5 Beispiel-Todos in die Datenbank ein"
- "Zeige mir alle Daten aus der todos-Tabelle"
- "Erstelle eine API-Route für CRUD-Operationen auf todos"
- "Implementiere eine Todo-Liste mit Supabase Realtime"

Claude Code wird den MCP Server verwenden, um diese Operationen direkt auf Ihrer Datenbank auszuführen!

---

## 📚 Ressourcen

- [Supabase Dokumentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [MCP Protokoll](https://modelcontextprotocol.io/)

---

## 🔒 Sicherheitshinweise

⚠️ **WICHTIG:**
- Der `service_role` Key hat **volle Datenbankrechte** - niemals im Client-Code verwenden!
- Nur `NEXT_PUBLIC_*` Variablen sind im Browser sichtbar
- `.env.local` ist in `.gitignore` und wird nicht committed
- Für Produktiv-Umgebungen: Keys in Vercel/Deployment-Platform hinterlegen
