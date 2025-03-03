const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }, // E-Mail hinzugefügt
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  highscores: { type: Map, of: Number, default: {} } // Speichert Highscores pro Deck
});

module.exports = mongoose.model('User', UserSchema);
