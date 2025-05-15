// Importiere Mongoose für die Modellierung von MongoDB-Daten
const mongoose = require('mongoose');

// Definiert das Schema für eine einzelne Quizfrage
const QuestionSchema = new mongoose.Schema({
  // 🔗 Referenz zum zugehörigen QuizDeck
  quizDeckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizDeck',
    required: true
  },

  // Der Fragetext
  questionText: {
    type: String,
    required: true,
    trim: true
  },

  // Liste der Antwortoptionen (z. B. ["A", "B", "C", "D"])
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function (opts) {
        return Array.isArray(opts) && opts.length >= 2 && opts.length <= 10;
      },
      message: 'Eine Frage muss zwischen 2 und 10 Antwortmöglichkeiten haben.'
    }
  },

  // Index der korrekten Antwort (bezogen auf das options-Array)
  correctOptionIndex: {
    type: Number,
    required: true,
    validate: {
      validator: function (i) {
        return Number.isInteger(i) && i >= 0 && (!this.options || i < this.options.length);
      },
      message: 'Der Index der richtigen Antwort muss gültig im Options-Array liegen.'
    }
  },

  // Anzahl der Nutzermeldungen (z. B. bei Unklarheiten)
  reports: {
    type: Number,
    default: 0,
    min: 0
  }

}, {
  // Automatische Erstellung von createdAt und updatedAt
  timestamps: true
});

// Exportiere das Question-Modell
module.exports = mongoose.model('Question', QuestionSchema);
