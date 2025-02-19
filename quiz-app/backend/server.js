const express = require("express");
const http = require("http");
require('dotenv').config();
const connectDB = require("./config/db");
const socketIo = require("socket.io");
const gameModule = require("./sockets/game");
const highscoreRoutes = require('./routes/highscore');
const Game = require("./models/Game");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Datenbankverbindung starten
connectDB();
gameModule(io); // Multiplayer laden

// WebSocket-Logik
require("./sockets/game")(io);
// API-Routen
app.use("/api/questions", require("./routes/questions"));
app.use("/api/players", require("./routes/players"));
app.use("/api/decks", require("./routes/decks"));
app.use('/api/highscore', highscoreRoutes);


// Route, um das Leaderboard zu laden
app.get('/leaderboard/:gameId', async (req, res) => {
    const { gameId } = req.params;
    console.log(`[DEBUG] Abrufen des Leaderboards für Spiel-ID: ${gameId}`);

    try {
        // Überprüfe, ob der gameId-Parameter korrekt übergeben wurde
        if (!gameId) {
            console.error("[ERROR] Keine gültige gameId übergeben.");
            return res.status(400).json({ error: "Ungültige Spiel-ID" });
        }

        // Spiel aus der Datenbank abrufen
        const game = await Game.findById(gameId);
        
        if (!game) {
            console.error(`[ERROR] Spiel nicht gefunden für ID: ${gameId}`);
            return res.status(404).json({ error: "Spiel nicht gefunden" });
        }

        // Überprüfen, ob Spieler im Spiel vorhanden sind
        if (!game.players || game.players.length === 0) {
            console.error(`[ERROR] Keine Spieler gefunden im Spiel: ${gameId}`);
            return res.status(404).json({ error: "Keine Spieler im Spiel" });
        }

        // Verwende Map für bessere Leistung und eindeutige Spieler
        const playerMap = new Map();

        game.players.forEach(player => {
            if (!playerMap.has(player.username)) {
                playerMap.set(player.username, player); // Spieler nur einmal hinzufügen
            }
        });

        // Spieler aus Map extrahieren und nach Punktzahl sortieren
        const leaderboard = Array.from(playerMap.values()).sort((a, b) => b.score - a.score);

        console.log("[DEBUG] Leaderboard:", leaderboard);

        return res.json(leaderboard);
    } catch (error) {
        console.error("[ERROR] Fehler beim Laden des Leaderboards:", error);
        return res.status(500).json({ error: "Fehler beim Abrufen des Leaderboards" });
    }
});










const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));
