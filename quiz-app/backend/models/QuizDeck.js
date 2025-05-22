// Importiert das Mongoose-Modul, um mit MongoDB-Daten zu arbeiten
const mongoose = require('mongoose');

// Definiert das Schema für ein QuizDeck (Sammlung von Fragen zu einem Thema)
const QuizDeckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },

  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});


// Exportiert das Modell 'QuizDeck' zur Verwendung in anderen Modulen
module.exports = mongoose.model('QuizDeck', QuizDeckSchema);
