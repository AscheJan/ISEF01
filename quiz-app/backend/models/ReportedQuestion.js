// Importiert das Mongoose-Modul, um mit MongoDB-Daten zu arbeiten
const mongoose = require('mongoose');

// Definiert das Schema für eine gemeldete Frage im System
const ReportedQuestionSchema = new mongoose.Schema({
    // Referenz auf die gemeldete Frage
    questionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Question', 
        required: true 
    },

    // Referenz auf das zugehörige QuizDeck
    quizDeckId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'QuizDeck', 
        required: true 
    },

    // Die ID oder der Name des meldenden Nutzers (hier als String gespeichert)
    reportedBy: { 
        type: String, 
        required: true 
    },

    // Der Grund der Meldung (z. B. "Falsche Antwort", "Unklar formuliert", "Inhaltlich falsch")
    reason: { 
        type: String, 
        required: true 
    },

    // Bearbeitungsstatus der Meldung: 'pending' (offen) oder 'resolved' (bearbeitet)
    status: { 
        type: String, 
        enum: ['pending', 'resolved'], 
        default: 'pending' 
    },

    // Zeitstempel, wann die Meldung erstellt wurde
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Exportiert das Modell 'ReportedQuestion', um es in anderen Teilen der App nutzen zu können
module.exports = mongoose.model('ReportedQuestion', ReportedQuestionSchema);
