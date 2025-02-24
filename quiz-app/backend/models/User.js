const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, default: 'user' },
  highscores: { type: Map, of: Number, default: {} } // Speichert Highscores pro Deck
});

module.exports = mongoose.model('User', UserSchema);
