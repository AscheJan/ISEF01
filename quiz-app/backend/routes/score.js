const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');
const QuizDeck = require('../models/QuizDeck');

router.post('/save', async (req, res) => {
    try {
        console.log("📥 Eingehende Daten:", req.body);
        let { userId, username, deckId, score } = req.body;

        // 🔍 **Falls `userId` ein Benutzername ist, hole die `ObjectId`**
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.warn(`⚠️ userId ist keine gültige ObjectId! Versuche, anhand des Benutzernamens (${username}) die ObjectId zu finden.`);
            const user = await User.findOne({ username: userId }); // `userId` ist in Wirklichkeit der Benutzername
            if (!user) {
                return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
            }
            userId = user._id; // ✅ Verwende die `ObjectId`
            console.log(`✅ Benutzer gefunden: ${username} -> userId: ${userId}`);
        }

        // ✅ **Konvertiere `deckId` zu einer gültigen ObjectId**
        if (!mongoose.Types.ObjectId.isValid(deckId)) {
            return res.status(400).json({ message: "❌ Ungültige deckId: Kein gültiges ObjectId-Format" });
        }
        deckId = new mongoose.Types.ObjectId(deckId);

        // 🔍 **Überprüfe, ob das Deck existiert**
        const deckExists = await QuizDeck.findById(deckId);
        if (!deckExists) {
            return res.status(404).json({ message: "❌ Deck nicht gefunden" });
        }

        // 🔍 **Überprüfe, ob der Benutzer bereits ein Highscore für dieses Deck hat**
        const existingScore = await Score.findOne({ userId, deckId });
        if (existingScore) {
            return res.status(400).json({ message: "❌ Highscore für dieses Deck bereits gespeichert" });
        }

        // ✅ **Highscore speichern**
        const newScore = new Score({ userId, username, deckId, score });
        await newScore.save();

        console.log("✅ Highscore erfolgreich gespeichert:", newScore);
        res.json({ message: '✅ Highscore gespeichert!', score: newScore });

    } catch (error) {
        console.error("❌ Fehler beim Speichern des Highscores:", error);
        res.status(500).json({ message: '❌ Fehler beim Speichern des Highscores', error: error.message });
    }
});



// 📊 Leaderboard für ein Deck abrufen
router.get('/leaderboard/:deckId', async (req, res) => {
    const { deckId } = req.params;

    try {
        const leaderboard = await Score.find({ deckId })
            .sort({ score: -1 }) // Höchste Punkte zuerst
            .limit(10); // Top 10 Spieler anzeigen

        res.json(leaderboard);
    } catch (error) {
        console.error("Fehler beim Laden des Leaderboards:", error);
        res.status(500).json({ message: "Interner Serverfehler" });
    }
});

module.exports = router;
