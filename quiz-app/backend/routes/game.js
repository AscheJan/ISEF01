const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

let gameRooms = {}; // Temporärer Speicher für Spielräume

// Spielraum erstellen
router.post('/create', (req, res) => {
    const roomId = uuidv4().substr(0, 6).toUpperCase();
    gameRooms[roomId] = { players: [], readyStatus: {} };
    res.json({ roomId });
});

// Spielraum beitreten
router.post('/join', (req, res) => {
    const { roomId, username } = req.body;

    if (!gameRooms[roomId]) {
        return res.status(404).json({ message: 'Raum nicht gefunden' });
    }

    if (!gameRooms[roomId].players.includes(username)) {
        gameRooms[roomId].players.push(username);
        gameRooms[roomId].readyStatus[username] = false; // Standardmäßig nicht bereit
    }

    res.json({ roomId, players: gameRooms[roomId].players });
});

// Spielerstatus umschalten (Bereit/Nicht bereit)
router.post('/toggle-ready', (req, res) => {
    const { roomId, username } = req.body;

    if (!gameRooms[roomId]) {
        return res.status(404).json({ message: 'Raum nicht gefunden' });
    }

    if (!gameRooms[roomId].players.includes(username)) {
        return res.status(400).json({ message: 'Spieler nicht im Raum' });
    }

    gameRooms[roomId].readyStatus[username] = !gameRooms[roomId].readyStatus[username];

    res.json({ readyStatus: gameRooms[roomId].readyStatus });
});

module.exports = router;
