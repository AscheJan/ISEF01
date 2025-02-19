// models/highscore.js
const mongoose = require('mongoose');

// Schema für das Highscore-Modell
const highscoreSchema = new mongoose.Schema({
  username: { type: String, required: true },
  score: { type: Number, required: true },
  gameMode: { type: String, enum: ['singleplayer', 'multiplayer'], required: true }, // Spielmodus: Einzelspieler oder Mehrspieler
}, { timestamps: true });

const Highscore = mongoose.model('Highscore', highscoreSchema);

module.exports = Highscore;
