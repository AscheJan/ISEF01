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

// 📌 Neue Route zum Hinzufügen einer Frage zu einem bestimmten Deck
router.post("/:deckId", async (req, res) => {
    try {
        const { deckId } = req.params;
        const { question, options, correctIndex } = req.body;

        // 🔍 Stelle sicher, dass das Deck existiert
        const deck = await Deck.findById(deckId);
        if (!deck) {
            return res.status(404).json({ error: "Deck nicht gefunden" });
        }

        // 🏗 Neue Frage erstellen und ins Deck hinzufügen
        const newQuestion = { question, options, correctIndex };
        deck.questions.push(newQuestion);
        await deck.save();

        res.status(201).json({ message: "Frage erfolgreich hinzugefügt", newQuestion });
    } catch (error) {
        console.error("❌ Fehler beim Hinzufügen der Frage:", error);
        res.status(500).json({ error: "Fehler beim Speichern der Frage" });
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


// 📌 Route zum Löschen einer Frage innerhalb eines Decks (JEDER Benutzer kann löschen)
router.delete("/:deckId/:questionId", async (req, res) => {
    try {
        const { deckId, questionId } = req.params;

        // 🔍 Stelle sicher, dass das Deck existiert
        const deck = await Deck.findById(deckId);
        if (!deck) {
            return res.status(404).json({ error: "Deck nicht gefunden" });
        }

        // 🔎 Finde die Frage im Deck und entferne sie
        const questionIndex = deck.questions.findIndex(q => q._id.toString() === questionId);
        if (questionIndex === -1) {
            return res.status(404).json({ error: "Frage nicht gefunden" });
        }

        deck.questions.splice(questionIndex, 1); // ❌ Frage aus dem Array entfernen
        await deck.save(); // 📌 Speichern

        res.status(200).json({ message: "Frage erfolgreich gelöscht" });
    } catch (error) {
        console.error("❌ Fehler beim Löschen der Frage:", error);
        res.status(500).json({ error: "Fehler beim Löschen der Frage" });
    }
});


// 📌 Route zum Bearbeiten einer Frage innerhalb eines Decks (JEDER Benutzer kann bearbeiten)
router.put("/:deckId/:questionId", async (req, res) => {
    try {
        const { deckId, questionId } = req.params;
        const { question, options, correctIndex } = req.body; // 👈 HostSocketId entfernt!

        // 🔍 Stelle sicher, dass das Deck existiert
        const deck = await Deck.findById(deckId);
        if (!deck) {
            return res.status(404).json({ error: "Deck nicht gefunden" });
        }

        // 🔎 Finde die Frage im Deck
        const questionToUpdate = deck.questions.id(questionId);
        if (!questionToUpdate) {
            return res.status(404).json({ error: "Frage nicht gefunden" });
        }

        // 🛠 Aktualisiere die Frage mit den neuen Werten
        questionToUpdate.question = question || questionToUpdate.question;
        questionToUpdate.options = options || questionToUpdate.options;
        questionToUpdate.correctIndex = correctIndex !== undefined ? correctIndex : questionToUpdate.correctIndex;

        // 📌 Speichere das aktualisierte Deck
        await deck.save();

        res.status(200).json({ message: "Frage erfolgreich aktualisiert", updatedQuestion: questionToUpdate });
    } catch (error) {
        console.error("❌ Fehler beim Bearbeiten der Frage:", error);
        res.status(500).json({ error: "Fehler beim Bearbeiten der Frage" });
    }
});


module.exports = router;
