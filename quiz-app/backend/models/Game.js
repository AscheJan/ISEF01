const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
    deckId: { type: mongoose.Schema.Types.ObjectId, ref: "Deck", required: true },
    players: [{ 
        username: String, 
        score: Number, 
        isReady: { type: Boolean, default: false } // 💡 Neu hinzugefügt
    }],
    currentQuestionIndex: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("Game", GameSchema);
