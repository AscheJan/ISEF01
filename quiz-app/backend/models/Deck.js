const mongoose = require("mongoose");

const DeckSchema = new mongoose.Schema({
    name: { type: String, required: true },
    questions: [{ question: String, options: [String], correctIndex: Number }]
});

module.exports = mongoose.model("Deck", DeckSchema);
