const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
    deckId: { type: mongoose.Schema.Types.ObjectId, ref: "Deck", required: true },
    players: [{ 
        username: String, 
        score: Number, 
        isReady: Boolean, 
        socketId: String 
    }],
    host: { type: String, required: true },
    currentQuestionIndex: { type: Number, default: 0 }
}, { versionKey: false });  // ✅ Versionierung deaktiviert

module.exports = mongoose.model("Game", GameSchema);
