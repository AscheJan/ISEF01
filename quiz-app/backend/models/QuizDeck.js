// Importiert das Mongoose-Modul, um mit MongoDB-Daten zu arbeiten
const mongoose = require('mongoose');

// Definiert das Schema für ein QuizDeck (Sammlung von Fragen zu einem Thema)
const QuizDeckSchema = new mongoose.Schema({
  // Name des Decks (z. B. "JavaScript Grundlagen", "Mathe 5. Klasse")
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },

  // Liste von Fragen (Referenzen auf Question-Objekte)
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }]
}, {
  // Automatische Timestamps für createdAt und updatedAt
  timestamps: true
});

// Exportiert das Modell 'QuizDeck' zur Verwendung in anderen Modulen
module.exports = mongoose.model('QuizDeck', QuizDeckSchema);
