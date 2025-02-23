const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    quizDeckId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizDeck', required: true },
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true },
    reports: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', QuestionSchema);
