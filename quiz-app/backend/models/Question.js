const mongoose = require('mongoose');
const ReportedQuestion = require('./ReportedQuestion'); // Passe den Pfad an

const QuestionSchema = new mongoose.Schema({
  quizDeckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizDeck',
    required: true
  },

  questionText: {
    type: String,
    required: true,
    trim: true
  },

  // genau 4 Optionen
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function (opts) {
        return Array.isArray(opts) && opts.length === 4;
      },
      message: 'Eine Frage muss genau 4 Antwortmöglichkeiten haben.'
    }
  },

  correctOptionIndex: {
    type: Number,
    required: true,
    validate: {
      validator: function(i) {
        // 0 ≤ i ≤ options.length-1
        return Number.isInteger(i) && i >= 0 && i < this.options.length;
      },
      message: 'Der Index der richtigen Antwort muss zwischen 0 und ' +
               (this.options ? this.options.length - 1 : 'Anzahl der Optionen minus 1') +
               ' liegen.'
    }
  },
  
  

  reports: {
    type: Number,
    default: 0,
    min: 0
  }

}, {
  timestamps: true
});

// ➡️ Cascade-Delete aller ReportedQuestion, wenn diese Frage gelöscht wird
QuestionSchema.pre('remove', async function() {
  await ReportedQuestion.deleteMany({ questionId: this._id });
});

module.exports = mongoose.model('Question', QuestionSchema);
