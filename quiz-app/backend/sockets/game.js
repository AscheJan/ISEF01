mongoose = require("mongoose");
const Session = require("../models/Session");
const Deck = require("../models/Deck");
const Game = require("../models/Game");

module.exports = (io) => {
const playersReady = {}; // Speichert den Bereitschaftsstatus der Spieler
const chalk = require("chalk");

const gameCache = new Map(); // Cache für Spiele

async function getGame(roomCode) {
    if (gameCache.has(roomCode)) {
        return gameCache.get(roomCode);
    }
    const game = await Game.findById(roomCode).populate("deckId");
    if (game) gameCache.set(roomCode, game);
    return game;
}

io.on("connection", (socket) => {
    console.log(chalk.blue(`[WS] Neuer Spieler verbunden: ${socket.id}`));

    socket.on("selectDeck", async (deckId) => {
        try {
            const deck = await Deck.findById(deckId);
            if (!deck) {
                console.error(chalk.red(`[ERROR] Deck nicht gefunden: ${deckId}`));
                return;
            }
            console.log(chalk.yellow(`[WS] Spieler hat das Deck gewählt: ${deck.name}`));
            socket.deckId = deckId;
            socket.emit("deckSelected", { deckId, deckName: deck.name });
        } catch (error) {
            console.error(chalk.red(`[ERROR] Fehler bei der Deck-Auswahl: ${error.message}`));
        }
    });

    socket.on("restartGame", async ({ gameId }) => {
        console.log("[DEBUG] Neustart-Event empfangen für Spiel:", gameId);
    
        if (!gameId) {
            console.error("[ERROR] Kein gameId übergeben!");
            return socket.emit("errorMessage", "❌ Fehler: Ungültige Spiel-ID!");
        }
    
        try {
            // 🛠 Cache zuerst leeren
            gameCache.delete(gameId);
            console.log("[DEBUG] Cache für Spiel gelöscht:", gameId);
    
            // 🛠 Spiel aus der Datenbank abrufen
            const game = await getGame(gameId);
            if (!game) {
                console.error("[ERROR] Spiel nicht gefunden:", gameId);
                return socket.emit("errorMessage", "❌ Raum nicht gefunden.");
            }
    
            console.log("[DEBUG] Spiel erfolgreich aus der Datenbank geladen:", game);
    
            // **Host-Überprüfung**
            if (game.host !== socket.id) {
                console.log("[ERROR] Kein Host! Host ist:", game.host, "aber Socket-ID ist:", socket.id);
                return socket.emit("errorMessage", "❌ Nur der Host kann das Spiel neustarten.");
            }
    
            // ✅ Spieler-Status & Punkte zurücksetzen
            game.players.forEach(player => {
                player.isReady = false;
                player.score = 0;
            });
    
            // ✅ Fragen-Index zurücksetzen
            game.currentQuestionIndex = 0;
            await game.save();
    
            // ✅ Neues Spiel-Objekt cachen
            gameCache.set(gameId, game);
    
            // ✅ Event an alle Spieler senden
            io.to(gameId).emit("gameRestarted", { 
                gameId: game._id, 
                deckId: game.deckId, 
                players: game.players,
                currentQuestionIndex: 0,
                host: game.host
            });
    
            console.log("[DEBUG] Spiel erfolgreich neugestartet!");
        } catch (error) {
            console.error(`[ERROR] Fehler beim Neustarten des Spiels: ${error.message}`);
        }
    });
    
    
    
    
    socket.on("changeDeck", async ({ roomCode, newDeckId }) => {
        try {
            // 🛠 Cache leeren, um veraltete Daten zu verhindern
            gameCache.delete(roomCode);
    
            const game = await getGame(roomCode);
            if (!game) {
                return socket.emit("errorMessage", "❌ Raum nicht gefunden.");
            }
    
            const deck = await Deck.findById(newDeckId);
            if (!deck) {
                return socket.emit("errorMessage", "❌ Deck nicht gefunden.");
            }
    
            game.deckId = newDeckId;
            game.players.forEach(player => player.isReady = false);
            await game.save();
    
            // 🛠 Cache aktualisieren
            gameCache.set(roomCode, game);
    
            io.to(roomCode).emit("deckChanged", { newDeckId, players: game.players });
            console.log(`[ROOM] Deck in Raum ${roomCode} gewechselt zu ${newDeckId}`);
        } catch (error) {
            console.error(`[ERROR] Fehler beim Wechseln des Decks: ${error.message}`);
        }
    });
    
    
    socket.on("createRoom", async ({ username, deckId }) => {
        try {
            const newGame = new Game({
                deckId,
                host: socket.id, // ✅ Socket-ID als Host speichern!
                players: [{ username, score: 0, isReady: false, socketId: socket.id }]
            });
    
            await newGame.save();
            gameCache.set(newGame._id.toString(), newGame);
            socket.join(newGame._id.toString());
    
            console.log(chalk.green(`[ROOM] Raum erstellt mit ID: ${newGame._id}, Host: ${socket.id}`));
    
            socket.emit("roomCreated", { roomId: newGame._id, deckId, players: newGame.players, host: socket.id });
            io.to(newGame._id.toString()).emit("updatePlayers", { players: newGame.players, host: socket.id });
        } catch (error) {
            socket.emit("errorMessage", "Fehler beim Erstellen des Raumes.");
        }
    });
    
    
    
    socket.on("joinRoom", async ({ username, roomCode }) => {
        try {
            const game = await Game.findById(roomCode);
            if (!game) {
                socket.emit("errorMessage", "❌ Raum nicht gefunden.");
                return;
            }
    
            // 🛠 Sicherstellen, dass Spieler nicht doppelt hinzugefügt wird
            const existingPlayerIndex = game.players.findIndex(player => player.username === username);
    
            if (existingPlayerIndex !== -1) {
                console.log(`[INFO] Spieler ${username} ist bereits im Raum ${roomCode}, aktualisiere Socket-ID.`);
                game.players[existingPlayerIndex].socketId = socket.id;
            } else {
                console.log(`[INFO] Neuer Spieler tritt bei: ${username}`);
                game.players.push({ username, score: 0, isReady: false, socketId: socket.id });
            }
    
            await game.save();
            socket.join(roomCode);
            
            // ✅ Sendet aktualisierte Spieler-Liste an alle
            io.to(roomCode).emit("updatePlayers", { players: game.players, host: game.host });
    
            socket.emit("showWaitingRoom", { roomCode, players: game.players, host: game.host });
    
        } catch (error) {
            console.error(`[ERROR] Fehler beim Beitritt: ${error.message}`);
        }
    });
    
    
    
    

    socket.on("playerReady", async ({ roomCode, username, isReady }) => {
        try {
            const game = await getGame(roomCode);
            if (!game) return socket.emit("errorMessage", "Raum nicht gefunden.");
    
            // ✅ Aktualisiere den Spieler-Status
            game.players.forEach(player => {
                if (player.username === username) player.isReady = isReady;
            });
    
            await game.save();
    
            // ✅ Host-Info mitgeben!
            io.to(roomCode).emit("updateReadyStatus", { players: game.players, host: game.host });
    
            // Falls alle bereit sind, das Event senden
            if (game.players.every(p => p.isReady)) {
                io.to(roomCode).emit("allPlayersReady", { canStart: true });
            }
    
        } catch (error) {
            console.error(`[ERROR] Fehler beim Setzen des Bereit-Status: ${error.message}`);
        }
    });
    

    socket.on("kickPlayer", async ({ hostUsername, roomId, targetUsername }) => {
        try {
            const session = await Session.findById(roomId);
            if (!session || session.host !== hostUsername) return;
            session.players = session.players.filter(player => player.username !== targetUsername);
            await session.save();
            io.to(roomId).emit("playerKicked", { targetUsername });
        } catch (error) {
            console.error(`[ERROR] Fehler beim Entfernen des Spielers: ${error.message}`);
        }
    });

    socket.on("startGame", async ({ roomCode }) => {
        try {
            const game = await Game.findById(roomCode);
            if (!game || !game.deckId) return;
            io.to(roomCode).emit("gameStarted", { gameId: game._id, deckId: game.deckId });
        } catch (error) {
            console.error(`[ERROR] Fehler beim Starten des Spiels: ${error.message}`);
        }
    });

    socket.on("gameFinished", async ({ roomCode }) => {
        try {
            const game = await Game.findById(roomCode);
            if (!game) return;
    
            io.to(roomCode).emit("showLeaderboard", { 
                players: game.players, 
                host: game.players[0]?.username // Host ist der erste Spieler in der Liste
            });
    
        } catch (error) {
            console.error(`[ERROR] Fehler beim Senden des Leaderboards: ${error.message}`);
        }
    });
    
    socket.on("submitAnswer", async ({ username, roomCode, answerIndex }) => {
        try {
            if (!roomCode) {
                console.error("[ERROR] Kein gültiger Raumcode übergeben!");
                return socket.emit("errorMessage", "❌ Fehler: Kein gültiger Raumcode!");
            }
    
            // 🛠 Cache löschen, damit die neueste Version geladen wird
            gameCache.delete(roomCode);
    
            const game = await getGame(roomCode);
            if (!game) {
                console.error(`[ERROR] Spiel nicht gefunden: ${roomCode}`);
                return socket.emit("errorMessage", "❌ Raum nicht gefunden.");
            }
    
            const question = game.deckId.questions[game.currentQuestionIndex];
            if (!question) {
                console.error("[ERROR] Keine gültige Frage gefunden!");
                return;
            }
    
            const correct = Number(answerIndex) === Number(question.correctIndex);
    
            game.players.forEach(player => {
                if (player.username === username && correct) {
                    player.score += 10;
                }
            });
    
            await game.save();
    
            // 🛠 Cache mit der neuesten Spielversion aktualisieren
            gameCache.set(roomCode, game);
    
            io.to(roomCode).emit("answerResult", { username, correct });
            console.log(`[DEBUG] Antwort von ${username} verarbeitet. Korrekt? ${correct}`);
        } catch (error) {
            console.error(`[ERROR] Fehler bei der Antwortverarbeitung: ${error.message}`);
        }
    });
    
    

    socket.on("disconnect", async () => {
        console.log(chalk.gray(`[WS] Spieler getrennt: ${socket.id}`));
    
        const game = await Game.findOne({ "players.socketId": socket.id });
        if (!game) return;
    
        // Spieler entfernen
        game.players = game.players.filter(p => p.socketId !== socket.id);
        
        // Falls der Host das Spiel verlässt, neuen Host setzen
        if (game.host === socket.id) {
            if (game.players.length > 0) {
                game.host = game.players[0].username;  // ✅ Der nächste Spieler wird zum Host
            } else {
                await game.deleteOne();  // ✅ Löscht das Spiel, falls keine Spieler mehr übrig sind
                return;
            }
        }
    
        await game.save();
        io.to(game._id.toString()).emit("updatePlayers", { players: game.players, host: game.host });
    });
    
    
});
};
