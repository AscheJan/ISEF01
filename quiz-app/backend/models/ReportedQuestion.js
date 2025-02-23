const mongoose = require('mongoose');

const ReportedQuestionSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    quizDeckId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizDeck', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReportedQuestion', ReportedQuestionSchema);
