// 🔌 Importiert benötigte Module
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

// 📦 Importiere die Mongoose-Modelle
const User = require('../models/User');
const Score = require('../models/Score');
const QuizDeck = require('../models/QuizDeck');

router.post('/save', async (req, res) => {
    try {
        console.log("📥 Eingehende Daten:", req.body);
        let { userId, username, deckId, score } = req.body;

        // 🔍 Falls `userId` kein gültiges ObjectId-Format ist → eventuell ein Benutzername!
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.warn(`⚠️ userId ist keine gültige ObjectId! Versuche, anhand des Benutzernamens (${username}) die ObjectId zu finden.`);

            // Versuche, User anhand von `userId` als username zu finden
            const user = await User.findOne({ username: userId });
            if (!user) {
                return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
            }

            // Benutzer erfolgreich gefunden → ObjectId extrahieren
            userId = user._id;
            console.log(`✅ Benutzer gefunden: ${username} -> userId: ${userId}`);
        }

        // ✅ Validierung der `deckId`
        if (!mongoose.Types.ObjectId.isValid(deckId)) {
            return res.status(400).json({ message: "❌ Ungültige deckId: Kein gültiges ObjectId-Format" });
        }

        // In Mongoose-Objekt konvertieren
        deckId = new mongoose.Types.ObjectId(deckId);

        // 🔍 Überprüfen, ob das angegebene Deck überhaupt existiert
        const deckExists = await QuizDeck.findById(deckId);
        if (!deckExists) {
            return res.status(404).json({ message: "❌ Deck nicht gefunden" });
        }

        // 🔍 Prüfen, ob bereits ein Score für diesen User + Deck gespeichert wurde
        const existingScore = await Score.findOne({ userId, deckId });
        if (existingScore) {
            return res.status(400).json({ message: "❌ Highscore für dieses Deck bereits gespeichert" });
        }

        // ✅ Score neu erstellen und speichern
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
        // 📊 Finde alle Scores zu diesem Deck, sortiert nach Punktzahl absteigend
        const leaderboard = await Score.find({ deckId })
            .sort({ score: -1 })  // Höchste Punktzahlen zuerst
            .limit(10);           // Begrenze auf die Top 10

        // 🟢 Rückgabe des Leaderboards als JSON
        res.json(leaderboard);

    } catch (error) {
        console.error("❌ Fehler beim Laden des Leaderboards:", error);
        res.status(500).json({ message: "Interner Serverfehler" });
    }
});


module.exports = router;
