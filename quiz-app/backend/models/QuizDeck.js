const mongoose = require('mongoose');

const QuizDeckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Kann leer sein bei globalen Decks
  },
  isGlobal: {
    type: Boolean,
    default: false // false = privat, true = global
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('QuizDeck', QuizDeckSchema);
