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
│   │── controllers/       # API-Logik
│   │── models/            # Datenbank-Modelle
│   │── routes/            # API-Routen
│   │── test/              # Testfälle für API-Endpunkte
│   │── app.js             # Express-App
│   │── server.js          # Startet den Server
│── frontend/
│   │── index.html         # Quiz-Oberfläche
│   │── style.css          # Styling
│   │── script.js          # Client-seitige Logik
│── README.md              # Dokumentation
│── package.json           # Abhängigkeiten & Skripte
│── jest.config.js         # Jest-Testkonfiguration
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
| Methode | Route | Beschreibung |
|---------|-------|--------------|
| **GET** | `/api/questions` | Holt alle Fragen aus der Datenbank |
| **POST** | `/api/questions` | Erstellt eine neue Frage |
| **DELETE** | `/api/questions/:id` | Löscht eine Frage |
| **GET** | `/api/highscores` | Holt die Highscore-Liste |
| **POST** | `/api/highscores` | Speichert einen neuen Highscore |

### **📌 Beispiel-Request**
📍 **`GET /api/questions`**
```json
[
    {
        "question": "Was ist die Hauptstadt von Deutschland?",
        "options": ["Berlin", "München", "Hamburg", "Köln"],
        "correctOption": 0,
        "creator": "Admin"
    }
]
```

---

## 🎮 Funktionalitäten & Screenshots
✔ **Quiz starten & Fragen beantworten**  
✔ **Richtige/Falsche Antworten werden farblich markiert**  
✔ **Punktevergabe & Bestenliste (Highscore)**  
✔ **Fragenverwaltung über die API**  
✔ **Tests mit Jest & Supertest**  

*(Hier können Screenshots eingefügt werden.)*

---

## ✅ Tests & Testabdeckung
Das System verwendet **Jest & Supertest** für automatisierte API-Tests.

### **🔹 Tests ausführen**
```sh
npm test
```

**Beispiel-Test für `GET /api/questions`**
```javascript
test("GET /api/questions sollte eine Liste zurückgeben", async () => {
    const res = await request(server).get("/api/questions");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
});
```

---

## 🚨 Bekannte Probleme & Lösungen
### ❌ **Port-Fehler (`EADDRINUSE`)**
🔹 **Lösung:** Beende den alten Server mit:
```sh
kill -9 $(lsof -t -i :5000)
```
  
### ❌ **Datenbankverbindung schlägt fehl**
🔹 **Lösung:** Stelle sicher, dass **MongoDB läuft** (`mongod` starten).

---


