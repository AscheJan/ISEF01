const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const Deck = require("../models/Deck");

// Frage hinzufügen
router.post("/", async (req, res) => {
    try {
        const { question, options, correctIndex } = req.body;
        const newQuestion = new Question({ question, options, correctIndex });
        await newQuestion.save();
        res.json(newQuestion);
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Hinzufügen der Frage" });
    }
});

// 📌 Fragen eines bestimmten Decks abrufen
router.get("/:deckId", async (req, res) => {
    try {
        const deck = await Deck.findById(req.params.deckId);
        if (!deck) {
            return res.status(404).json({ error: "Deck nicht gefunden" });
        }
        res.json(deck.questions);
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Abrufen der Fragen" });
    }
});


// Route zum Löschen einer Frage
router.delete('/deleteQuestion', async (req, res) => {
    const { roomCode, questionId, hostSocketId } = req.body;

    try {
        const game = await Game.findById(roomCode);
        if (!game) return res.status(404).json({ message: 'Raum nicht gefunden.' });

        // Stelle sicher, dass nur der Host Fragen löschen kann
        if (game.hostSocketId !== hostSocketId) {
            return res.status(403).json({ message: 'Nur der Host kann Fragen löschen.' });
        }

        const deck = await Deck.findById(game.deckId);
        const questionIndex = deck.questions.findIndex(q => q._id.toString() === questionId);
        if (questionIndex === -1) return res.status(404).json({ message: 'Frage nicht gefunden.' });

        // Lösche die Frage
        deck.questions.splice(questionIndex, 1);
        await deck.save();

        // Sende die aktualisierte Liste der Fragen an alle Spieler
        io.to(roomCode).emit('updateQuestions', deck.questions);
        res.status(200).json({ message: 'Frage erfolgreich gelöscht.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Fehler beim Löschen der Frage.' });
    }
});

// Route zum Bearbeiten einer Frage
router.put('/editQuestion', async (req, res) => {
    const { roomCode, questionId, updatedQuestionData, hostSocketId } = req.body;

    try {
        const game = await Game.findById(roomCode);
        if (!game) return res.status(404).json({ message: 'Raum nicht gefunden.' });

        // Stelle sicher, dass nur der Host Fragen bearbeiten kann
        if (game.hostSocketId !== hostSocketId) {
            return res.status(403).json({ message: 'Nur der Host kann Fragen bearbeiten.' });
        }

        const deck = await Deck.findById(game.deckId);
        const questionIndex = deck.questions.findIndex(q => q._id.toString() === questionId);
        if (questionIndex === -1) return res.status(404).json({ message: 'Frage nicht gefunden.' });

        // Aktualisiere die Frage
        deck.questions[questionIndex] = { ...deck.questions[questionIndex], ...updatedQuestionData };
        await deck.save();

        // Sende die aktualisierte Liste der Fragen an alle Spieler
        io.to(roomCode).emit('updateQuestions', deck.questions);
        res.status(200).json({ message: 'Frage erfolgreich bearbeitet.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Fehler beim Bearbeiten der Frage.' });
    }
});

module.exports = router;
