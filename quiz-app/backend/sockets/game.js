mongoose = require("mongoose");
const Session = require("../models/Session");
const Deck = require("../models/Deck");
const Game = require("../models/Game");

module.exports = (io) => {
const playersReady = {}; // Speichert den Bereitschaftsstatus der Spieler
const chalk = require("chalk");


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
        try {
            const game = await Game.findById(gameId);
            if (!game) return;
    
            // Alle Spieler auf "nicht bereit" setzen
            game.players.forEach(player => player.isReady = false);
            await game.save();
    
            io.to(gameId).emit("gameRestarted", { 
                gameId: game._id, 
                deckId: game.deckId, 
                players: game.players 
            });
    
            console.log(`[ROOM] Spiel ${gameId} wurde neugestartet. Alle Spieler müssen erneut bereit sein.`);
        } catch (error) {
            console.error(`[ERROR] Fehler beim Neustarten des Spiels: ${error.message}`);
        }
    });
    
    socket.on("changeDeck", async ({ roomCode, newDeckId }) => {
        try {
            const game = await Game.findById(roomCode);
            if (!game) return;
    
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
            const newGame = new Game({ deckId, players: [{ username, score: 0, isReady: false }] });
            await newGame.save();
            socket.join(newGame._id.toString());
            playersReady[newGame._id.toString()] = {};
            console.log(chalk.green(`[ROOM] Raum erstellt mit ID: ${newGame._id}, Deck: ${deckId}`));
            socket.emit("roomCreated", { roomId: newGame._id, deckId, players: newGame.players });
            io.to(newGame._id.toString()).emit("updatePlayers", newGame.players);
        } catch (error) {
            socket.emit("errorMessage", "Fehler beim Erstellen des Raumes.");
        }
    });

    socket.on("joinRoom", async ({ username, roomCode }) => {
        try {
            const game = await Game.findById(roomCode);
            if (!game) {
                socket.emit("errorMessage", "Raum nicht gefunden.");
                return;
            }
            if (!game.players.some(player => player.username === username)) {
                game.players.push({ username, score: 0, isReady: false });
                await game.save();
            }
            socket.join(roomCode);
            io.to(roomCode).emit("updatePlayers", { players: game.players, host: game.players[0]?.username });
            socket.emit("showWaitingRoom", { roomCode, players: game.players, host: game.players[0]?.username });
        } catch (error) {
            console.error(`[ERROR] Fehler beim Beitreten: ${error.message}`);
        }
    });

    socket.on("playerReady", async ({ roomCode, username, isReady }) => {
        try {
            const game = await Game.findById(roomCode);
            if (!game) return;
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
            const game = await Game.findById(gameId).populate("deckId");
            if (!game || !game.deckId) return;
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

    socket.on("disconnect", () => {
        console.log(chalk.gray(`[WS] Spieler getrennt: ${socket.id}`));
    });
});
};
