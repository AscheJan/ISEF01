const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizDeck', required: true }, // Ändere 'Deck' zu 'QuizDeck'
    score: { type: Number, required: true }
});

module.exports = mongoose.model('Score', ScoreSchema);
