const express = require("express");
const http = require("http");
require('dotenv').config();
const connectDB = require("./config/db");
const socketIo = require("socket.io");
const gameModule = require("./sockets/game");
const highscoreRoutes = require('./routes/highscore');

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

// API-Routen
app.use("/api/questions", require("./routes/questions"));
app.use("/api/players", require("./routes/players"));
app.use("/api/decks", require("./routes/decks"));
app.use('/api/highscore', highscoreRoutes);

// WebSocket-Logik
require("./sockets/game")(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));
