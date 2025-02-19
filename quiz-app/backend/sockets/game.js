mongoose = require("mongoose");
const Session = require("../models/Session");
const Deck = require("../models/Deck");
const Game = require("../models/Game");

module.exports = (io) => {
const playersReady = {}; // Speichert den Bereitschaftsstatus der Spieler
const chalk = require("chalk");

async function getGame(roomCode) {
    return await Game.findById(roomCode).populate("deckId");
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
        console.log("[DEBUG] restartGame-Event empfangen für Spiel:", gameId);
    
        try {
            const game = await Game.findById(gameId);
            if (!game) {
                console.log("[ERROR] Spiel nicht gefunden:", gameId);
                socket.emit("errorMessage", "❌ Raum nicht gefunden.");
                return;
            }
    
            // 🔥 Host anhand von `socketId` erkennen
            const host = game.players[0]; // Der erste Spieler ist der Host
            if (!host || host.socketId !== socket.id) {
                console.log("[ERROR] Spieler ist kein Host:", socket.id, "Erwartet:", host?.socketId);
                socket.emit("errorMessage", "❌ Nur der Host kann das Spiel neustarten!");
                return;
            }
    
            // ✅ Spielstatus zurücksetzen
            game.players.forEach(player => {
                player.isReady = false;
                player.score = 0;
            });
            game.currentQuestionIndex = 0;
            await game.save();
    
            console.log("[DEBUG] Spielstatus erfolgreich zurückgesetzt.");
    
            io.to(gameId).emit("gameRestarted", { 
                gameId: game._id, 
                deckId: game.deckId, 
                players: game.players 
            });
    
            console.log("[DEBUG] gameRestarted-Event gesendet an Raum:", gameId);
        } catch (error) {
            console.error(`[ERROR] Fehler beim Neustarten des Spiels: ${error.message}`);
        }
    });
    
    
    
    
    socket.on("changeDeck", async ({ roomCode, newDeckId }) => {
        try {
            const game = await getGame(roomCode);
            if (!game) return socket.emit("errorMessage", "Raum nicht gefunden.");
    
            game.deckId = newDeckId;
            game.players.forEach(player => player.isReady = false);
            await game.save();
    
            io.to(roomCode).emit("deckChanged", { newDeckId, players: game.players });
    
            console.log(`[ROOM] Deck in Raum ${roomCode} gewechselt zu ${newDeckId}.`);
        } catch (error) {
            console.error(`[ERROR] Fehler beim Wechseln des Decks: ${error.message}`);
        }
    });
   
    socket.on("createRoom", async ({ username, deckId }) => {
        if (!deckId) {
            socket.emit("errorMessage", "Deck ID fehlt!");
            return;
        }
    
        try {
            const newGame = new Game({
                deckId,
                host: username,  // ✅ Host speichern
                players: [{ username, score: 0, isReady: false, socketId: socket.id }] // ✅ Host als Spieler hinzufügen
            });
    
            await newGame.save();
            socket.join(newGame._id.toString());
    
            console.log(chalk.green(`[ROOM] Raum erstellt mit ID: ${newGame._id}, Host: ${username}, Socket: ${socket.id}`));
    
            socket.emit("roomCreated", { roomId: newGame._id, deckId, players: newGame.players, host: username });
            io.to(newGame._id.toString()).emit("updatePlayers", { players: newGame.players, host: username });
        } catch (error) {
            socket.emit("errorMessage", "Fehler beim Erstellen des Raumes.");
        }
    });
    
    socket.on("joinRoom", async ({ username, roomCode }) => {
        try {
            const game = await Game.findById(roomCode);
            if (!game) return socket.emit("errorMessage", "❌ Raum nicht gefunden.");
    
            // 🛠 Spieler nur hinzufügen, wenn er nicht schon existiert!
            const playerExists = game.players.some(player => player.username === username);
            if (!playerExists) {
                game.players.push({ username, score: 0, isReady: false, socketId: socket.id });
                await game.save();
            } else {
                console.log(`[INFO] Spieler ${username} ist bereits im Raum ${roomCode}`);
            }
    
            socket.join(roomCode);
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
            game.players.forEach(player => {
                if (player.username === username) player.isReady = isReady;
            });
            await game.save();
            io.to(roomCode).emit("updateReadyStatus", game.players);
            if (game.players.every(p => p.isReady)) io.to(roomCode).emit("allPlayersReady", { canStart: true });
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
    

    socket.on("submitAnswer", async ({ username, gameId, answerIndex }) => {
        try {
            const game = await getGame(roomCode);
            if (!game) return socket.emit("errorMessage", "Raum nicht gefunden.");
            const question = game.deckId.questions[game.currentQuestionIndex];
            if (!question) return;
            const correct = Number(answerIndex) === Number(question.correctIndex);
            game.players.forEach(player => {
                if (player.username === username && correct) player.score += 10;
            });
            await game.save();
            io.to(gameId).emit("answerResult", { username, correct });
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
