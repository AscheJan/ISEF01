const express = require("express");
const router = express.Router();
const Game = require("../models/Game");

// Neues Spiel erstellen
router.post("/", async (req, res) => {
    console.log("POST /api/games Body:", req.body); // Debugging
    const { username, deckId } = req.body;

    if (!deckId) {
        console.error("Fehler: deckId fehlt im Request!");
        return res.status(400).json({ error: "Deck ID ist erforderlich!" });
    }

    try {
        const game = new Game({ deckId, players: [{ username, score: 0 }] });
        await game.save();
        res.json(game);
    } catch (error) {
        console.error("Fehler beim Erstellen des Spiels:", error);
        res.status(500).json({ error: "Fehler beim Erstellen des Spiels." });
    }
});


// Spiele für ein bestimmtes Deck abrufen
router.get("/", async (req, res) => {
    const { deckId } = req.query;
    const games = await Game.find({ deckId, isActive: true });
    res.json(games);
});

// Spieler setzt "Bereit"-Status
router.post("/ready", async (req, res) => {
    const { username, roomCode, isReady } = req.body;

    try {
        const game = await Game.findById(roomCode);
        if (!game) return res.status(404).json({ error: "Raum nicht gefunden." });

        const player = game.players.find(p => p.username === username);
        if (player) {
            player.isReady = isReady;
            await game.save();
        }

        res.json({ players: game.players });
    } catch (error) {
        console.error("Fehler beim Setzen des Bereit-Status:", error);
        res.status(500).json({ error: "Fehler beim Setzen des Bereit-Status." });
    }
});

// Spieler tritt einem Spiel bei
router.post("/join", async (req, res) => {
    const { username, roomCode } = req.body;

    try {
        const game = await Game.findById(roomCode);
        if (!game) return res.status(404).json({ error: "Raum nicht gefunden." });

        game.players.push({ username, score: 0, isReady: false });
        await game.save();

        res.json(game);
    } catch (error) {
        console.error("Fehler beim Beitreten:", error);
        res.status(500).json({ error: "Fehler beim Beitreten des Spiels." });
    }
});

module.exports = router;
