// 🔌 Importiere erforderliche Module
require('dotenv').config(); // 🌱 Lädt Umgebungsvariablen
const express = require('express');             // Web-Framework für HTTP-Routing
const cors = require('cors');                   // Middleware zur Behandlung von Cross-Origin-Anfragen
const http = require('http');                   // Node.js HTTP-Modul für Server-Erstellung
const socketIo = require("socket.io");          // WebSocket-Kommunikation mit Clients
const connectDB = require('./config/db');       // Eigene DB-Verbindung aus externer Datei
const authRoutes = require('./routes/auth');    // Authentifizierungsrouten
const adminRoutes = require('./routes/admin');  // Admin-bezogene API-Routen
const scoreRoutes = require('./routes/score');  // Routen zur Punkteverwaltung
const Question = require("./models/Question");  // Datenmodell für Fragen (optional verwendet)
const path = require('path');                   // Zum Arbeiten mit Dateipfaden

// 🎮 Initialisiere Express-Anwendung
const app = express();


app.use(express.json()); // Parsen von JSON-Anfragen im Body
app.use(cors());         // Ermöglicht Anfragen aus anderen Domains (z. B. vom Frontend)


// Erstelle einen HTTP-Server basierend auf Express
const server = http.createServer(app);

// Initialisiere WebSocket-Server mit Socket.IO
const io = socketIo(server); 


// Stelle die Verbindung zur MongoDB-Datenbank her (aus config/db.js)
connectDB();


// Routen für Authentifizierung (Login, Registrierung, Token-Prüfung etc.)
app.use('/api/auth', authRoutes);

// Admin-Funktionen wie Fragenverwaltung oder Nutzerübersicht
app.use('/api/admin', adminRoutes);

// Punkte & Highscore-Routen
app.use('/api/scores', scoreRoutes);


// Stellt statische Inhalte aus dem Ordner 'public' bereit (z. B. HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));


// Fallback-Route – für React/SPA-Routing (z. B. bei clientseitigem Routing über React Router)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});
  


// 🔁 Globale Speicherobjekte
let activeGames = {}; // Aktive Spiele: enthält Fragen, Punktestände und aktuellen Status
let rooms = {};       // Alle aktuell existierenden Spielräume mit Spielern und Einstellungen
let players = [];     // Liste aller verbundenen Spieler (für Modus-/Deckwahl, etc.)


io.on("connection", (socket) => {
    console.log("👤 Neuer Spieler verbunden:", socket.id);

    // 🎲 Raum automatisch erstellen
    let roomCode = createRoom(socket);


    socket.on("startGame", async (roomCode) => {
        if (!rooms[roomCode]) return;

        if (!activeGames[roomCode]) {
            activeGames[roomCode] = { questions: [], scores: {}, currentQuestionIndex: 0 };
        }

        // Hole Fragen aus der Datenbank und mische sie
        const questions = await Question.find().limit(10);
        const shuffledQuestions = shuffleArray(questions);

        // Bereite Fragen für das Spiel auf
        activeGames[roomCode].questions = shuffledQuestions.map(q => ({
            id: q._id,
            text: q.text,
            options: q.options,
            correctOption: q.correctOption
        }));

        // Starte das Spiel im Raum
        io.to(roomCode).emit("gameStarted", { questions: activeGames[roomCode].questions });
        sendNextQuestion(roomCode);
    });

    
    socket.on("endGame", (roomCode) => {
        if (!rooms[roomCode]) return;

        rooms[roomCode].players.forEach(player => player.isReady = false);
        io.to(roomCode).emit("returnToLobby");
    });

    
    

    socket.on("joinLobby", ({ playerId }) => {
        if (!rooms["mainLobby"]) {
            rooms["mainLobby"] = { players: [], host: null };
        }

        let lobby = rooms["mainLobby"];
        let newPlayer = { id: playerId, name: `Spieler ${lobby.players.length + 1}`, isHost: false };

        lobby.players.push(newPlayer);
        if (!lobby.host) {
            lobby.host = newPlayer.id;
            newPlayer.isHost = true;
        }

        io.emit("updateLobby", lobby.players);
    });

    socket.on("leaveLobby", ({ playerId, roomCode }) => {
        let lobby = rooms[roomCode];
        if (!lobby) return;

        lobby.players = lobby.players.filter(p => p.id !== playerId);

        if (lobby.host === playerId && lobby.players.length > 0) {
            lobby.host = lobby.players[0].id;
            lobby.players[0].isHost = true;
            io.emit("newHost", lobby.host);
        }

        if (lobby.players.length === 0) {
            delete rooms[roomCode];
        } else {
            io.emit("updateLobby", lobby.players);
        }
    });

    // Spieler lokal registrieren
    players.push({ id: socket.id, name: `Spieler ${players.length + 1}`, deck: null, mode: null });
    io.emit("updateSelections", players);

    socket.on("playerSelection", ({ deck, mode }) => {
        let player = players.find(p => p.id === socket.id);
        if (player) {
            player.deck = deck;
            player.mode = mode;
        }
        io.emit("updateSelections", players);
    });





    socket.on("playerReady", ({ roomCode, playerId }) => {
        if (!rooms[roomCode]) return;
    
        let player = rooms[roomCode].players.find(p => p.id === playerId);
        if (player) player.isReady = !player.isReady;
    
        let allReady = rooms[roomCode].players.every(p => p.isReady);
        io.to(roomCode).emit("updateReadyStatus", rooms[roomCode].players);
    
        if (allReady) {
            io.to(roomCode).emit("gameCanStart");
        }
    });
    
    


    socket.on("createRoom", (username) => {
        if (!username) {
            username = `Gast_${Math.floor(Math.random() * 1000)}`; // Falls kein Name angegeben, generiere zufälligen Gast-Namen
        }
    
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [{ id: socket.id, username }], // Host mit Namen speichern
            host: { id: socket.id, username },
            isSingleplayer: true
        };
    
        socket.join(roomCode);
        console.log(`🎮 Raum ${roomCode} erstellt, Host: ${username}`);
    
        // Bestätigung an den Ersteller senden
        socket.emit("roomCreated", {
            roomCode,
            host: rooms[roomCode].host
        });
    
        // Spieler-Liste aktualisieren
        io.to(roomCode).emit("updatePlayers", {
            players: rooms[roomCode].players,
            host: rooms[roomCode].host
        });
    });
    
    socket.on("joinRoom", ({ roomCode, username }) => {
        if (!rooms[roomCode]) {
            socket.emit("error", "❌ Raum existiert nicht!");
            return;
        }

        let room = rooms[roomCode];

        if (!room.players.some(p => p.id === socket.id)) {
            room.players.push({ id: socket.id, username, isReady: false });
        }

        socket.join(roomCode);
        console.log(`🔗 ${username} ist Raum ${roomCode} beigetreten.`);

        io.to(roomCode).emit("updatePlayers", {
            players: room.players,
            host: room.host
        });

        // 🏆 Deck & Spielmodus an den neuen Spieler senden
        socket.emit("roomJoined", {
            roomCode,
            players: room.players,
            host: room.host,
            selectedDeck: room.selectedDeck,
            selectedGameMode: room.selectedGameMode
        });
    });
    
    
    // 🎲 Deck-Auswahl für alle synchronisieren
    socket.on("selectDeck", ({ roomCode, deckId }) => {
        if (rooms[roomCode]) {
            rooms[roomCode].selectedDeck = deckId;
            io.to(roomCode).emit("updateDeckSelection", deckId);
            checkIfAllSelectionsMade(roomCode);
        }
    });

    // 🎮 Spielmodus-Auswahl für alle synchronisieren
    socket.on("selectGameMode", ({ roomCode, gameMode }) => {
        if (rooms[roomCode]) {
            rooms[roomCode].selectedGameMode = gameMode;
            io.to(roomCode).emit("updateGameModeSelection", gameMode);
            checkIfAllSelectionsMade(roomCode);
        }
    });

    // 🏁 Überprüfen, ob alle Voraussetzungen erfüllt sind
    function checkIfAllSelectionsMade(roomCode) {
        let room = rooms[roomCode];
        if (!room || !room.selectedDeck || !room.selectedGameMode) return;

        // 📡 Alle Spieler im Raum informieren
        io.to(roomCode).emit("allSelectionsMade", { deck: room.selectedDeck, mode: room.selectedGameMode });
    }



    socket.on("answer", ({ roomCode, questionId, answerIndex, playerId }) => {
        let game = activeGames[roomCode];
        if (!game || game.currentQuestionIndex === 0) return;

        let currentQuestion = game.questions[game.currentQuestionIndex - 1];
        let isCorrect = currentQuestion.correctOption === answerIndex;

        if (!game.scores[playerId]) game.scores[playerId] = 0;
        if (!game.answeredPlayers) game.answeredPlayers = new Set();

        if (isCorrect) game.scores[playerId] += 10;
        game.answeredPlayers.add(playerId);

        io.to(roomCode).emit("updateScores", game.scores);

        // Falls alle Spieler geantwortet haben, nächste Frage senden
        if (game.answeredPlayers.size === rooms[roomCode].players.length) {
            game.answeredPlayers.clear(); // Set leeren
            sendNextQuestion(roomCode);
        }
    });

    socket.on("disconnect", () => {
        for (let roomCode in rooms) {
            let lobby = rooms[roomCode];

            // Spieler aus Lobby entfernen
            lobby.players = lobby.players.filter(p => p.id !== socket.id);

            // Falls Host verlässt, neuen Host bestimmen
            if (lobby.host === socket.id && lobby.players.length > 0) {
                lobby.host = lobby.players[0].id;
                lobby.players[0].isHost = true;
                io.emit("newHost", lobby.host);
            }

            // Falls keine Spieler mehr übrig sind, lösche den Raum
            if (lobby.players.length === 0) {
                delete rooms[roomCode];
            } else {
                io.emit("updateLobby", lobby.players);
            }
        }
    });
});

// 🎲 **Raum automatisch erstellen für jeden Nutzer**
function createRoom(socket) {
    let roomCode = generateRoomCode();

    rooms[roomCode] = {
        players: [],
        host: socket.id,
        readyPlayers: new Set(),
        selectedDeck: null,
        selectedGameMode: null
    };

    activeGames[roomCode] = {
        questions: [],
        scores: {},
        currentQuestionIndex: 0
    };

    socket.join(roomCode);
    console.log(`✅ Raum ${roomCode} erstellt für ${socket.id}`);

    socket.emit("roomCreated", { roomCode });

    return roomCode;
}


// 🛠 Hilfsfunktion zum Generieren von Raumnamen
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 📌 **Helferfunktionen**
function sendNextQuestion(roomCode) {
    let game = activeGames[roomCode];
    if (!game || game.currentQuestionIndex >= game.questions.length) {
        io.to(roomCode).emit("gameOver", game.scores);
        return;
    }

    let question = game.questions[game.currentQuestionIndex]; // Frage abrufen
    game.currentQuestionIndex++; // Erst dann den Index erhöhen

    io.to(roomCode).emit("newQuestion", question);
}

// 🔀 **Fragen mischen**
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function handlePlayerDisconnect(socketId) {
    for (const roomCode in rooms) {
        let room = rooms[roomCode];

        // 🚨 Sicherstellen, dass `room` existiert und `players` ein Array ist
        if (!room || !Array.isArray(room.players)) {
            console.warn(`⚠️ Raum ${roomCode} existiert nicht oder hat keine Spieler.`);
            continue; // Überspringen, falls kein gültiger Raum
        }

        if (room.players.includes(socketId)) {
            room.players = room.players.filter(id => id !== socketId);
            room.readyPlayers = room.readyPlayers ? room.readyPlayers.filter(id => id !== socketId) : [];

            // Falls der Host geht, neuen Host bestimmen
            if (room.host === socketId) {
                room.host = room.players.length > 0 ? room.players[0] : null;
                io.to(roomCode).emit("newHost", { newHost: room.host });
            }

            if (room.players.length === 0) {
                console.log(`🗑 Raum ${roomCode} wird gelöscht.`);
                delete rooms[roomCode];
                delete activeGames[roomCode];
            } else {
                io.to(roomCode).emit("updatePlayerList", { players: room.players });
            }
        }
    }
}

const PORT = process.env.PORT || 5000; // Fallback auf 5000, falls .env fehlt

server.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
});