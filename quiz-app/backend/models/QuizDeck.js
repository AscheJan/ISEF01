// Importiert das Mongoose-Modul, um mit MongoDB-Daten zu arbeiten
const mongoose = require('mongoose');

// Definiert das Schema für ein QuizDeck – also eine Sammlung von Fragen zu einem Thema
const QuizDeckSchema = new mongoose.Schema({
    // Der Name des Decks (z. B. "JavaScript Grundlagen" oder "Mathe 5. Klasse")
    name: { 
        type: String, 
        required: true 
    },

    // Eine Liste von referenzierten Fragen (ObjectIds), die zu diesem Deck gehören
    questions: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Question' 
    }]
});

// Exportiert das Modell 'QuizDeck', damit es in anderen Dateien verwendet werden kann
module.exports = mongoose.model('QuizDeck', QuizDeckSchema);
