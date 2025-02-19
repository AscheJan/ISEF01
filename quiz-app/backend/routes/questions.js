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

module.exports = router;
