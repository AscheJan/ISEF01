// Importiert das Mongoose-Modul zur Arbeit mit MongoDB
const mongoose = require('mongoose');

// Definiert das Schema für gespeicherte Punktestände eines Users
const ScoreSchema = new mongoose.Schema({
  // Referenz auf den User, der den Score erreicht hat
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 🧾 Benutzername (wird gespeichert, auch wenn der User später gelöscht wird)
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },

  // Referenz auf das zugehörige QuizDeck
  deckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizDeck',
    required: true
  },

  // Erreichter Punktestand (z. B. Anzahl korrekter Antworten)
  score: {
    type: Number,
    required: true,
    min: 0
  }

}, {
  // Automatische Timestamps für createdAt und updatedAt
  timestamps: true
});

// Exportiert das Score-Modell
module.exports = mongoose.model('Score', ScoreSchema);
