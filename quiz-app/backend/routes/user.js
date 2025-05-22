const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const QuizDeck = require('../models/QuizDeck');
const Question = require('../models/Question');

const router = express.Router();

// 🔐 Middleware: JWT prüfen und Benutzer-ID anhängen
function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Nicht autorisiert (Token fehlt)' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token ungültig oder abgelaufen' });
  }
}

// 📦 Deck erstellen
router.post('/create-deck', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Deck-Name erforderlich' });

    const newDeck = new QuizDeck({ name, userId: req.userId, questions: [] });
    await newDeck.save();
    res.json({ message: '✅ Deck erstellt', deck: newDeck });
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Decks:', error);
    res.status(500).json({ message: 'Serverfehler beim Deck-Erstellen' });
  }
});

// 📚 Eigene Decks laden
router.get('/decks', authenticateUser, async (req, res) => {
  try {
    const decks = await QuizDeck.find({ userId: req.userId });
    res.json({ decks });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Decks' });
  }
});

// ❓ Fragen für ein eigenes Deck laden
router.get('/questions/:deckId', authenticateUser, async (req, res) => {
  try {
    const { deckId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      return res.status(400).json({ message: 'Ungültige Deck-ID' });
    }

    const deck = await QuizDeck.findOne({ _id: deckId, userId: req.userId });
    if (!deck) return res.status(404).json({ message: 'Deck nicht gefunden' });

    const questions = await Question.find({ quizDeckId: deckId });
    res.json({ questions });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Fragen:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Fragen' });
  }
});

// ➕ Frage hinzufügen
router.post('/add-question', authenticateUser, async (req, res) => {
  try {
    const { deckId, questionText, options, correctOptionIndex } = req.body;

    if (!deckId || !questionText || !Array.isArray(options) || options.length !== 4 || correctOptionIndex === undefined) {
      return res.status(400).json({ message: 'Ungültige Eingabe' });
    }

    const deck = await QuizDeck.findOne({ _id: deckId, userId: req.userId });
    if (!deck) return res.status(404).json({ message: 'Deck nicht gefunden' });

    const question = new Question({ quizDeckId: deckId, questionText, options, correctOptionIndex });
    await question.save();

    deck.questions.push(question._id);
    await deck.save();

    res.status(201).json({ message: '✅ Frage hinzugefügt', question });
  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen der Frage:', error);
    res.status(500).json({ message: 'Fehler beim Hinzufügen der Frage' });
  }
});

// ✏️ Frage bearbeiten
router.put('/edit-question/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, options, correctOptionIndex } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Ungültige Frage-ID' });
    }

    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ message: 'Frage nicht gefunden' });

    const deck = await QuizDeck.findOne({ _id: question.quizDeckId, userId: req.userId });
    if (!deck) return res.status(403).json({ message: 'Nicht berechtigt' });

    question.questionText = questionText.trim();
    question.options = options.map(o => o.trim());
    question.correctOptionIndex = correctOptionIndex;
    await question.save();

    res.json({ message: '✅ Frage bearbeitet', question });
  } catch (error) {
    console.error('❌ Fehler beim Bearbeiten:', error);
    res.status(500).json({ message: 'Fehler beim Bearbeiten der Frage' });
  }
});

// 🗑 Frage löschen
router.delete('/delete-question/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
  
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Ungültige Frage-ID' });
    }
  
    try {
      const question = await Question.findById(id);
      if (!question) return res.status(404).json({ message: 'Frage nicht gefunden' });
  
      const deck = await QuizDeck.findOne({ _id: question.quizDeckId, userId: req.userId });
      if (!deck) return res.status(403).json({ message: 'Nicht berechtigt' });
  
      await QuizDeck.findByIdAndUpdate(question.quizDeckId, { $pull: { questions: id } });
      await Question.findByIdAndDelete(id);
  
      res.json({ message: '✅ Frage gelöscht' });
    } catch (error) {
      console.error('❌ Fehler beim Löschen:', error);
      res.status(500).json({ message: 'Fehler beim Löschen der Frage' });
    }
  });
  
  // 🗑️ Deck löschen
  router.delete('/delete-deck/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
  
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Ungültige Deck-ID' });
    }
  
    try {
      // Deck finden, das dem Nutzer gehört
      const deck = await QuizDeck.findOne({ _id: id, userId: req.userId });
      if (!deck) {
        return res.status(404).json({ message: 'Deck nicht gefunden oder unberechtigt' });
      }
  
      // Alle Fragen zu diesem Deck löschen
      await Question.deleteMany({ quizDeckId: id });
  
      // Deck selbst löschen
      await QuizDeck.findByIdAndDelete(id);
  
      return res.json({ message: '✅ Deck und alle Fragen wurden gelöscht' });
    } catch (error) {
      console.error('❌ Fehler beim Löschen des Decks:', error);
      return res.status(500).json({ message: 'Fehler beim Löschen des Decks' });
    }
  });
  
  
  

module.exports = router;
