const express = require("express");
const http = require("http");
require('dotenv').config();
const connectDB = require("./config/db");
const socketIo = require("socket.io");
const gameModule = require("./sockets/game");
const singleplayerModule = require("./sockets/singleplayer");

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
singleplayerModule(io); // Einzelspieler-Modul laden
// API-Routen
app.use("/api/questions", require("./routes/questions"));
app.use("/api/players", require("./routes/players"));
app.use("/api/decks", require("./routes/decks"));

// WebSocket-Logik
require("./sockets/game")(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));
