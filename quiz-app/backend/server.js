const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require("socket.io");
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const scoreRoutes = require('./routes/score');
const Question = require("./models/Question");
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());

//socket IO
const server = http.createServer(app);
const io = socketIo(server);

// Datenbankverbindung herstellen
connectDB();


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scores', scoreRoutes);

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, '../public')));

// Standardroute für das Laden der index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});


// Socket IO
let activeGames = {}; // Speichert aktive Spiele mit Fragen und Punkteständen
let rooms = {}; // Speicher für aktive Spielräume

let players = [];

io.on("connection", (socket) => {
    console.log("👤 Neuer Spieler verbunden:", socket.id);

    // 🎲 Raum automatisch erstellen
    let roomCode = createRoom(socket);


    socket.on("startGame", async (roomCode) => {
        if (!rooms[roomCode] || rooms[roomCode].host !== socket.id) return;

        if (!activeGames[roomCode]) {
            activeGames[roomCode] = { 
                questions: [], 
                scores: {}, 
                currentQuestionIndex: 0 
            };
        }

        // Fragen aus der DB abrufen und mischen
        const questions = await Question.find().limit(10);
        const shuffledQuestions = shuffleArray(questions);

        activeGames[roomCode].questions = shuffledQuestions.map(q => ({
            id: q._id,
            text: q.text,
            options: q.options,
            correctOption: q.correctOption
        }));

        io.to(roomCode).emit("gameStarted", { questions: activeGames[roomCode].questions });
        sendNextQuestion(roomCode);
    });


   // Spieler tritt einer Lobby bei
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

// Spieler verlässt die Lobby
socket.on("leaveLobby", ({ playerId, roomCode }) => {
    let lobby = rooms[roomCode];

    if (!lobby) return;

    // Spieler entfernen
    lobby.players = lobby.players.filter(p => p.id !== playerId);

    // Falls der Host verlässt, neuen Host bestimmen
    if (lobby.host === playerId && lobby.players.length > 0) {
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
});

    // Spieler zur Liste hinzufügen
    players.push({ id: socket.id, name: `Spieler ${players.length + 1}`, deck: null, mode: null });

    // Aktualisierte Liste senden
    io.emit("updateSelections", players);

    // Spielerwahl empfangen
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
    if (player) player.isReady = true;

    // Prüfen, ob alle Spieler bereit sind
    let allReady = rooms[roomCode].players.every(p => p.isReady);
    io.to(roomCode).emit("updateReadyStatus", { players: rooms[roomCode].players });

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
    
        // Spieler nur hinzufügen, wenn er nicht schon drin ist
        if (!room.players.some(player => player.id === socket.id)) {
            room.players.push({ id: socket.id, username });
        }
    
        socket.join(roomCode);
        console.log(`🔗 ${username} ist Raum ${roomCode} beigetreten.`);
    
        // **Check, ob es ein Einzelspieler-Modus ist**
        if (room.players.length > 1) {
            room.isSingleplayer = false;
    
            // Falls es vorher kein Host gab oder der Host geleaved ist → neuen Host setzen
            if (!room.host || !room.players.some(p => p.id === room.host.id)) {
                room.host = room.players[0]; // Erster Spieler in der Liste wird Host
            }
        } else {
            room.isSingleplayer = true;
            room.host = null; // Kein Host, wenn nur ein Spieler da ist!
        }
    
        // 🏆 Spieler-Liste aktualisieren
        io.to(roomCode).emit("updatePlayers", {
            players: room.players,
            host: room.host
        });
    
        // Erfolg an den beitretenden Spieler senden
        socket.emit("roomJoined", {
            roomCode,
            players: room.players,
            host: room.host,
            isSingleplayer: room.isSingleplayer
        });
    });
    
    
    



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
    let roomCode = Math.random().toString(36).substr(2, 5).toUpperCase(); 

    rooms[roomCode] = {
        players: [socket.id],
        host: socket.id,
        readyPlayers: []
    };

    activeGames[roomCode] = { // Hier initialisieren
        questions: [],
        scores: {},
        currentQuestionIndex: 0
    };

    socket.join(roomCode);
    console.log(`✅ Raum ${roomCode} erstellt für ${socket.id}`);

    socket.emit("roomCreated", { roomCode });

    return roomCode; // Rückgabe für spätere Nutzung
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


server.listen(5000, () => console.log('Server läuft auf Port 5000'));
