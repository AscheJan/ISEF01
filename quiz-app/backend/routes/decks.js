const express = require("express");
const router = express.Router();
const Deck = require("../models/Deck");

// Alle Decks abrufen
router.get("/", async (req, res) => {
    const decks = await Deck.find();
    res.json(decks);
});

module.exports = router;
