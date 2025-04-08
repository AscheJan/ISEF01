// Importiert das Mongoose-Modul, um mit MongoDB zu arbeiten
const mongoose = require('mongoose');

// Definiert ein neues Schema für ein "Game"-Dokument in der MongoDB
const GameSchema = new mongoose.Schema({
  // Eindeutige ID für den Raum (z. B. für Multiplayer-Spiele oder Quizräume)
  roomId: String,

  // Liste der Spieler im Spiel – referenziert User-Dokumente über ihre ObjectIds
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Referenz auf ein QuizDeck-Dokument, das die Fragen enthält
  quizDeck: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizDeck' },

  // Status des Spiels – z. B. 'waiting', 'running', 'finished'; Standard ist 'waiting'
  status: { type: String, default: 'waiting' },
});

// Exportiert das Modell 'Game', damit es in anderen Dateien verwendet werden kann
module.exports = mongoose.model('Game', GameSchema);
