const express = require("express");
const router = express.Router();
const Deck = require("../models/Deck");

// 📌 Alle Decks abrufen
router.get("/", async (req, res) => {
    try {
        const decks = await Deck.find();
        res.json(decks);
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Abrufen der Decks" });
    }
});

// 📌 Neues Deck erstellen
router.post("/", async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: "Deck-Name ist erforderlich" });
        }

        const newDeck = new Deck({ name, questions: [] }); // Neues Deck ohne Fragen erstellen
        await newDeck.save();
        
        res.status(201).json({ message: "Deck erfolgreich erstellt!", deck: newDeck });
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Erstellen des Decks" });
    }
});

// 📌 Ein bestimmtes Deck abrufen
router.get("/:deckId", async (req, res) => {
    try {
        const deck = await Deck.findById(req.params.deckId);
        if (!deck) {
            return res.status(404).json({ error: "Deck nicht gefunden" });
        }
        res.json(deck);
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Abrufen des Decks" });
    }
});

// 📌 Ein Deck löschen
router.delete("/:deckId", async (req, res) => {
    try {
        const deletedDeck = await Deck.findByIdAndDelete(req.params.deckId);
        if (!deletedDeck) {
            return res.status(404).json({ error: "Deck nicht gefunden" });
        }
        res.json({ message: "Deck erfolgreich gelöscht!" });
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Löschen des Decks" });
    }
});

module.exports = router;
