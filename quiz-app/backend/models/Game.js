// Import Mongoose für die Arbeit mit MongoDB
const mongoose = require('mongoose');

// Game-Schema für Multiplayer- oder Quizräume
const GameSchema = new mongoose.Schema({
  // Eindeutige Raum-ID (z. B. "room-abc123")
  roomId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // Liste der Spieler (Verknüpfung zu User-Dokumenten)
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  // Referenz auf das QuizDeck (enthält die Fragen)
  quizDeck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizDeck',
    required: true
  },

  // Spielstatus: 'waiting', 'running', 'finished'
  status: {
    type: String,
    enum: ['waiting', 'running', 'finished'],
    default: 'waiting'
  }
}, {
  // Automatische Zeitstempel für createdAt und updatedAt
  timestamps: true
});

// Exportiere das Game-Modell zur weiteren Nutzung
module.exports = mongoose.model('Game', GameSchema);
