const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  roomId: String,
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  quizDeck: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizDeck' },
  status: { type: String, default: 'waiting' },
});
module.exports = mongoose.model('Game', GameSchema);