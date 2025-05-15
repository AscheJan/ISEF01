// Importiert das Mongoose-Modul für MongoDB-Datenmodellierung
const mongoose = require('mongoose');

// Definiert das Schema für eine gemeldete Frage im System
const ReportedQuestionSchema = new mongoose.Schema({
  // Referenz auf die gemeldete Frage
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },

  // Referenz auf das zugehörige QuizDeck
  quizDeckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizDeck',
    required: true
  },

  // Meldender Nutzer (z. B. Nutzer-ID oder Klarname)
  reportedBy: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },

  // Grund der Meldung (z. B. "Falsche Antwort")
  reason: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 300
  },

  // Bearbeitungsstatus der Meldung
  status: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending'
  }

}, {
  // Automatische Zeitstempel für createdAt und updatedAt
  timestamps: true
});

// Exportiere das Modell 'ReportedQuestion'
module.exports = mongoose.model('ReportedQuestion', ReportedQuestionSchema);
