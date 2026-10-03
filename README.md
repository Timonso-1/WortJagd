# Wortjagd

Stadt, Land, Fluss als Echtzeit-Multiplayer. Next.js 15, Socket.IO, PostgreSQL (Drizzle ORM), Auth.js.

## Features

- Räume mit 5-stelligem Code und Einladungslink, öffentliche Lobby
- Gäste ohne Konto, optional Login (GitHub/Discord) für Bestenliste und eigene Pakete
- Einstellungen: Runden, Zeit, Max. Spieler, ausgeschlossene Buchstaben, Stopp mit Restzeit
- Bis zu 20 eigene Kategorien, Vorlagen, speicherbare und teilbare Kategorie-Pakete
- Abstimmung: Wort wird ungültig, wenn mehr als die Hälfte der Mitspieler ablehnt
- Punkte: 20 (einziges gültiges Wort), 10 (einzigartig), 5 (doppelt), 0 (ungültig)
- Raum-Chat, Spielleiter-Übergabe, Kick, Reconnect ohne Punkteverlust
- Ergebnisse angemeldeter Spieler landen in der Bestenliste

## Setup

```bash
cp .env.example .env          # AUTH_SECRET setzen: openssl rand -base64 32
docker compose up -d db       # PostgreSQL
npm install
npm run db:push               # Tabellen anlegen
npm run dev                   # http://localhost:3000
```

Produktion:

```bash
npm run build && npm start
# oder komplett per Docker:
docker compose --profile app up -d --build
```

Login-Anbieter sind nur aktiv, wenn `AUTH_GITHUB_ID`/`AUTH_DISCORD_ID` gesetzt sind.
Callback-URL: `<AUTH_URL>/api/auth/callback/github` bzw. `/discord`.

## Architektur

| Pfad | Inhalt |
|---|---|
| `server.ts` | Custom HTTP-Server: Next.js + Socket.IO auf einem Port |
| `src/server/game/room.ts` | Spielzustand und Phasen (lobby → playing → voting → results → finished) |
| `src/server/game/scoring.ts` | Normalisierung, Gültigkeit, Punktevergabe (mit Tests) |
| `src/server/socket.ts` | Socket-Events, Identität, Broadcast, Persistenz |
| `src/db/schema.ts` | Drizzle-Schema (Auth.js-Tabellen, Pakete, Spiele) |
| `src/app/` | Seiten und API-Routen |
| `src/components/room/` | Raum-UI je Phase |

Spielzustand liegt im Speicher des Node-Prozesses. Für mehrere Instanzen bräuchte es
den Socket.IO-Redis-Adapter plus Sticky Sessions; für einen VPS reicht eine Instanz.

Reverse-Proxy (nginx) muss WebSockets durchreichen (`Upgrade`/`Connection`-Header für `/socket.io/`).

## Tests

```bash
npm test
```
