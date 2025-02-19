# ISEF01
# 📚 Online-Quizsystem

## 📌 Projektbeschreibung
Das **Online-Quizsystem** ist eine interaktive Webanwendung, die es Benutzern ermöglicht, Quizfragen zu beantworten und ihre Ergebnisse in einer Highscore-Liste zu vergleichen. Es wurde mit **Node.js, Express, MongoDB und Jest** entwickelt.

---

## 🔧 Technologien & Architektur
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js, MongoDB
- **Testing:** Jest & Supertest
- **Datenbank:** MongoDB Atlas oder lokale MongoDB
- **Statische Daten:** Fragen werden aus der MongoDB-Datenbank geladen

### 📁 **Projektstruktur**
```
quiz-app/
│── backend/
│   │── config/            # Datenbank-Konfiguration
│   │── models/            # Datenbank-Modelle
│   │── routes/            # API-Routen
│   │── scripts/           # Test cards mongo
│   │── socket/            # socket game Logik
│   │── server.js          # Startet den Server
│── frontend/
│   │── index.html         # Quiz-Oberfläche
│   │── style.css          # Styling
│   │── script.js          # Client-seitige Logik
│── README.md              # Dokumentation
│── package.json           # Abhängigkeiten & Skripte
│── .gitignore             # npm-dir und .env nicht gepushed wird
│── .env                   # Umgebungsvariablen
```

---

## 🚀 Installation & Setup
### 🔹 Voraussetzungen
- **Node.js** installiert (empfohlen: Version 16+)
- **MongoDB Atlas oder lokale MongoDB**
- **NPM** (Node Package Manager)

### 🔹 Setup
1. **Projekt klonen & Abhängigkeiten installieren**
   ```sh
   git clone https://github.com/username/quiz-app.git
   cd quiz-app
   npm install
   ```

2. **Umgebungsvariablen konfigurieren (`.env`)**
   ```plaintext
   MONGO_URI=mongodb://localhost:27017/quizdb
   PORT=5000
   ```

3. **Server starten**
   ```sh
   npm run dev
   ```

4. **Öffne das Frontend im Browser**
   ```
   http://localhost:5000/
   ```

---

## 📡 API-Endpunkte (REST-API)

| Methode  | Route                          | Beschreibung                                                  |
|----------|--------------------------------|---------------------------------------------------------------|
| **GET**  | `/api/questions`               | Holt alle Fragen aus der Datenbank                             |
| **POST** | `/api/questions`               | Erstellt eine neue Frage                                       |
| **DELETE**| `/api/questions/:id`          | Löscht eine Frage aus der Datenbank                            |
| **GET**  | `/api/decks`                   | Holt alle verfügbaren Decks                                   |
| **POST** | `/api/decks`                   | Erstellt ein neues Deck                                        |
| **DELETE**| `/api/decks/:id`              | Löscht ein Deck                                                |
| **GET**  | `/api/games`                   | Holt alle laufenden oder abgeschlossenen Spiele                |
| **POST** | `/api/games`                   | Startet ein neues Spiel                                        |
| **PUT**  | `/api/games/:id`               | Aktualisiert den Status eines Spiels (z.B. Start, Neustart)    |
| **GET**  | `/api/players`                 | Holt die Spieler für ein bestimmtes Spiel                      |
| **POST** | `/api/players`                 | Fügt einen neuen Spieler zu einem laufenden Spiel hinzu        |
| **DELETE**| `/api/players/:id`            | Entfernt einen Spieler aus einem laufenden Spiel               |
| **GET**  | `/api/highscores`              | Holt die Highscore-Liste für ein bestimmtes Deck oder Spiel   |
| **POST** | `/api/highscores`              | Speichert einen neuen Highscore                                |


---

## 🎮 Funktionalitäten & Screenshots

### Echtzeit-Synchronisation mit WebSockets (Socket.io)
- **Raumerstellung & Beitritt**: 
  - Der Host kann Räume erstellen.
  - Spieler können mit einem einzigartigen Code einem Raum beitreten.

- **Deck-Auswahl durch den Host**: 
  - Der Host hat die Möglichkeit, das Deck zu wechseln.
  - Alle Spieler müssen sich nach einem Deck-Wechsel neu bereit machen.

- **Spieler-Statusverwaltung**: 
  - Der Status `isReady` wird auf `false` gesetzt, wenn das Spiel neu gestartet oder das Deck gewechselt wird.

- **Live-Spielerliste**: 
  - Der Host kann in Echtzeit sehen, welche Spieler bereit sind (Ja/Nein).

- **Spielstart nur, wenn alle bereit sind**: 
  - Der "Spiel starten"-Button erscheint erst, wenn alle Spieler den Status „bereit“ haben.

- **Antwortabgabe & Punkte**: 
  - Antworten der Spieler werden verarbeitet und die Punkte für jedes Quiz gespeichert.

- **Leaderboard für jeden Raum**: 
  - Am Ende des Spiels wird eine Rangliste für alle Spieler im Raum angezeigt.

- **Spiel-Neustart im selben Raum**: 
  - Spieler bleiben verbunden, und das Quiz wird zurückgesetzt, ohne den Raum zu verlassen.

---


