const mongoose = require('mongoose');

const QuizDeckSchema = new mongoose.Schema({
    name: { type: String, required: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
});

module.exports = mongoose.model('QuizDeck', QuizDeckSchema);
