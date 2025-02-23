const { Server } = require("socket.io");

let io;
const gameRooms = {}; // Speicher für Spielräume

function initializeSocket(server) {
    io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
        console.log(`🔗 Benutzer verbunden: ${socket.id}`);

        // Raum erstellen
        socket.on("createRoom", () => {
            const roomId = generateRoomCode();
            gameRooms[roomId] = { players: {}, selectedDeck: null };
            socket.join(roomId);
            socket.emit("roomCreated", roomId);
            console.log(`🏠 Raum erstellt: ${roomId}`);
        });

        // Raum beitreten
        socket.on("joinRoom", ({ username, roomCode }) => {
            if (!roomCode || !username) {
                console.error("⚠️ Ungültige Beitrittsdaten.");
                return;
            }

            if (!gameRooms[roomCode]) {
                gameRooms[roomCode] = { players: {}, selectedDeck: null };
            }

            gameRooms[roomCode].players[socket.id] = { username, ready: false };
            socket.join(roomCode);
            io.to(roomCode).emit("updatePlayers", getPlayersList(roomCode));
            console.log(`👤 ${username} ist Raum ${roomCode} beigetreten.`);
        });

        // Spielerstatus "Bereit" umschalten
        socket.on("toggleReady", ({ roomCode }) => {
            if (!validatePlayerInRoom(socket.id, roomCode)) return;

            const player = gameRooms[roomCode].players[socket.id];
            player.ready = !player.ready;

            io.to(roomCode).emit("readyStatus", getPlayersList(roomCode));
            console.log(`✅ Spieler ${player.username} ist jetzt ${player.ready ? "bereit" : "nicht bereit"}.`);

            if (allPlayersReady(roomCode)) {
                startCountdown(roomCode);
            }
        });

        // Deck auswählen
        socket.on("selectDeck", ({ roomCode, deckId }) => {
            if (!validateRoom(roomCode)) return;

            gameRooms[roomCode].selectedDeck = deckId;
            resetReadyStatus(roomCode);

            io.to(roomCode).emit("updateRoom", {
                players: getPlayersList(roomCode),
                selectedDeck: deckId,
            });

            console.log(`🃏 Deck ${deckId} wurde für Raum ${roomCode} ausgewählt.`);
        });

        // Spieler verlässt den Raum oder Verbindung verloren
        socket.on("disconnect", () => {
            handlePlayerDisconnect(socket.id);
        });
    });

    return io;
}

// 🔹 Hilfsfunktionen 🔹

// Generiert einen 6-stelligen Raumcode
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Prüft, ob ein Raum existiert
function validateRoom(roomCode) {
    if (!gameRooms[roomCode]) {
        console.error(`⚠️ Raum ${roomCode} existiert nicht.`);
        return false;
    }
    return true;
}

// Prüft, ob ein Spieler in einem Raum existiert
function validatePlayerInRoom(socketId, roomCode) {
    if (!validateRoom(roomCode) || !gameRooms[roomCode].players[socketId]) {
        console.error(`⚠️ Spieler ${socketId} nicht im Raum ${roomCode} gefunden.`);
        return false;
    }
    return true;
}

// Gibt die Liste der Spieler in einem Raum zurück
function getPlayersList(roomCode) {
    return gameRooms[roomCode] ? Object.values(gameRooms[roomCode].players) : [];
}

// Prüft, ob alle Spieler in einem Raum bereit sind
function allPlayersReady(roomCode) {
    return getPlayersList(roomCode).every((player) => player.ready);
}

// Setzt alle Spieler auf "nicht bereit"
function resetReadyStatus(roomCode) {
    if (!validateRoom(roomCode)) return;
    Object.values(gameRooms[roomCode].players).forEach((player) => (player.ready = false));
}

// Countdown für Spielstart
function startCountdown(roomCode) {
    let countdown = 15;
    console.log(`⏳ Spielstart in Raum ${roomCode} beginnt in 15 Sekunden...`);

    const countdownInterval = setInterval(() => {
        io.to(roomCode).emit("gameStarting", { countdown });
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            io.to(roomCode).emit("gameStarted", { deckId: gameRooms[roomCode].selectedDeck });
            console.log(`🚀 Spiel in Raum ${roomCode} gestartet!`);
        }
    }, 1000);
}

// Spieler verlässt den Raum oder verliert die Verbindung
function handlePlayerDisconnect(socketId) {
    for (const roomCode in gameRooms) {
        if (gameRooms[roomCode].players[socketId]) {
            const playerName = gameRooms[roomCode].players[socketId].username;
            delete gameRooms[roomCode].players[socketId];

            io.to(roomCode).emit("updateRoom", {
                players: getPlayersList(roomCode),
                selectedDeck: gameRooms[roomCode].selectedDeck,
            });

            console.log(`❌ Spieler ${playerName} hat Raum ${roomCode} verlassen.`);
        }
    }
}

module.exports = { initializeSocket };
