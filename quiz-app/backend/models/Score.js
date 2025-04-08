// Importiert das Mongoose-Modul, um mit MongoDB-Datenbanken zu arbeiten
const mongoose = require('mongoose');

// Definiert das Schema für einen gespeicherten Punktestand eines Nutzers
const ScoreSchema = new mongoose.Schema({
    // Referenz auf den User, der diesen Score erreicht hat
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },

    // Der Benutzername – wird gespeichert, um den Score auch bei gelöschtem User anzeigen zu können
    username: { 
        type: String, 
        required: true 
    },

    // Referenz auf das zugehörige QuizDeck
    deckId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'QuizDeck', // Hinweis: früher 'Deck', jetzt klarer benannt
        required: true 
    },

    // Der erreichte Punktestand (z. B. Anzahl richtiger Antworten)
    score: { 
        type: Number, 
        required: true 
    }
});

// Exportiert das Score-Modell, damit es in anderen Modulen verwendet werden kann
module.exports = mongoose.model('Score', ScoreSchema);
