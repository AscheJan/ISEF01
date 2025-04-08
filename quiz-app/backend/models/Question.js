// Importiert das Mongoose-Modul zur Modellierung von MongoDB-Daten
const mongoose = require('mongoose');

// Definiert das Schema für eine einzelne Quizfrage
const QuestionSchema = new mongoose.Schema({
    // Referenz zum zugehörigen QuizDeck – jede Frage gehört zu einem bestimmten Deck
    quizDeckId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'QuizDeck', 
        required: true 
    },

    // Der eigentliche Fragetext, der angezeigt wird
    questionText: { 
        type: String, 
        required: true 
    },

    // Eine Liste von Antwortmöglichkeiten (z. B. ["A", "B", "C", "D"])
    options: [{ 
        type: String, 
        required: true 
    }],

    // Der Index der richtigen Antwort innerhalb des options-Arrays
    correctOptionIndex: { 
        type: Number, 
        required: true 
    },

    // Zähler für Meldungen durch Nutzer (z. B. bei Fehlern oder Unklarheiten)
    reports: { 
        type: Number, 
        default: 0 
    },

    // Zeitstempel, wann die Frage erstellt wurde
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Exportiert das Modell 'Question', um es in anderen Modulen nutzen zu können
module.exports = mongoose.model('Question', QuestionSchema);
