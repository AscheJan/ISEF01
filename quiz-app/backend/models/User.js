// Importiert das Mongoose-Modul zur Modellierung von Benutzerdaten in MongoDB
const mongoose = require('mongoose');

// Definiert das Schema für einen Benutzeraccount
const UserSchema = new mongoose.Schema({
  // Der Benutzername muss eindeutig sein
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },

  // Die E-Mail-Adresse – ebenfalls eindeutig, z. B. für Login oder Passwort-Reset
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  // Das verschlüsselte Passwort des Nutzers
  password: { 
    type: String, 
    required: true 
  },

  // Rolle des Nutzers, z. B. 'user', 'admin', etc.
  role: { 
    type: String, 
    default: 'user' 
  },

  // Highscores je Deck – gespeichert als Key-Value-Paar (Deck-ID → Punktzahl)
  highscores: { 
    type: Map, 
    of: Number, 
    default: {} 
  }
});

// Exportiert das User-Modell zur Verwendung in anderen Teilen der App
module.exports = mongoose.model('User', UserSchema);
