// Importiert das Mongoose-Modul zur Modellierung von Benutzerdaten
const mongoose = require('mongoose');

// Definiert das Schema für einen Benutzeraccount
const UserSchema = new mongoose.Schema({
  // Benutzername (muss eindeutig und sinnvoll benannt sein)
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },

  // E-Mail-Adresse (eindeutig, zur Authentifizierung)
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Bitte eine gültige E-Mail-Adresse eingeben']
  },

  // Verschlüsseltes Passwort
  password: {
    type: String,
    required: true,
    minlength: 6
  },

  // Rolle des Nutzers (z. B. 'user', 'admin')
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'admin'] // optional erweiterbar
  },

  // Highscores je Deck (Key = Deck-ID, Value = Punktzahl)
  highscores: {
    type: Map,
    of: Number,
    default: {}
  }

}, {
  // Automatische Verwaltung von createdAt & updatedAt
  timestamps: true
});

// Exportiert das User-Modell
module.exports = mongoose.model('User', UserSchema);
