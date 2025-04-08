Perfekt! Dann ergänze ich den Hinweis zur `.env`-Datei direkt im **Setup-Bereich** der `README.md` – inklusive Erinnerung, sie selbst anzulegen und nicht zu committen. Hier ist die überarbeitete Version:


# 🧠 ISEF01 – Interaktives Quizsystem

Ein modernes, interaktives Multiplayer-Quizsystem mit Lobby, Deckverwaltung, Admin-Modus und Fragenbewertung. Entwickelt mit HTML, CSS, JavaScript, Node.js und Mongodb.

## 🚀 Features

- 👥 Multiplayer-Lobby mit Spielmodi (z. B. Klassisch, Zeitangriff)
- 🗂 Deckverwaltung (Erstellen, Löschen, Bearbeiten)
- 📋 Fragen hinzufügen, bearbeiten und melden
- 🛡 Admin-Bereich mit Modal-System zur Verwaltung
- 🎨 Responsives UI mit modernem CSS-Design
- 📊 Leaderboard & Fortschrittsanzeige

## ⚙️ Setup

```bash
git clone https://github.com/AscheJan/ISEF01.git
cd quiz-app
npm install
```

### 🔐 .env Datei erstellen

Lege im Hauptverzeichnis eine Datei namens `.env` an und trage folgende Werte ein:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/quizapp
JWT_SECRET=deinGeheimerJWTKey
```

> ❗️Wichtig: Die `.env`-Datei **darf nicht** ins GitHub-Repository hochgeladen werden. Stelle sicher, dass `.env` in `.gitignore` enthalten ist.
erstelle dazu eine datei .gitignore
```gitignore
# Node.js & npm
node_modules/
package-lock.json

# Umgebungsvariablen
.env

# VS Code-Settings
.vscode/
```

### ✅ App starten

```bash
npm run dev

oder

npm run production
```

## 📄 Lizenz

MIT © 2025 [AscheJan](https://github.com/AscheJan)
