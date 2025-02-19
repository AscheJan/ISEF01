const express = require("express");
const router = express.Router();
const Player = require("../models/Player");

// Spieler-Statistiken aktualisieren
router.post("/updateStats", async (req, res) => {
    try {
        const { username, correctAnswers } = req.body;
        const player = await Player.findOneAndUpdate(
            { username },
            { $inc: { gamesPlayed: 1, correctAnswers } },
            { new: true, upsert: true }
        );
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Aktualisieren der Spielerstatistiken" });
    }
});

module.exports = router;
