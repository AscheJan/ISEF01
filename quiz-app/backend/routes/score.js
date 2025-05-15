// 🔌 Importiert benötigte Module
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

// 📦 Importiere die Mongoose-Modelle
const User = require('../models/User');
const Score = require('../models/Score');
const QuizDeck = require('../models/QuizDeck');

router.post('/save', async (req, res) => {
    try {
      let { userId, username, deckId, score } = req.body;
      console.log('📥 Eingehende Daten:', { userId, username, deckId, score });
  
      // —————————————————————————————————————————
      // 1) userId ggf. aus username ermitteln
      // —————————————————————————————————————————
      if (!userId && username) {
        // kein userId-Feld, aber username da → in DB nachschlagen
        const user = await User.findOne({ username });
        if (!user) {
          return res.status(404).json({ message: '❌ Benutzer nicht gefunden' });
        }
        userId = user._id;
      }
  
      // jetzt muss userId eine gültige ObjectId sein
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: '❌ Ungültige userId' });
      }
      userId = new mongoose.Types.ObjectId(userId);
  
      // —————————————————————————————————————————
      // 2) deckId validieren und existieren prüfen
      // —————————————————————————————————————————
      if (!mongoose.Types.ObjectId.isValid(deckId)) {
        return res.status(400).json({ message: '❌ Ungültige deckId' });
      }
      deckId = new mongoose.Types.ObjectId(deckId);
  
      if (!await QuizDeck.exists({ _id: deckId })) {
        return res.status(404).json({ message: '❌ Deck nicht gefunden' });
      }
  
      // —————————————————————————————————————————
      // 3) Upsert: Score anlegen oder aktualisieren
      // —————————————————————————————————————————
      const filter  = { userId, deckId };
      const update  = { username, score };
      const options = { new: true, upsert: true, setDefaultsOnInsert: true };
      const entry   = await Score.findOneAndUpdate(filter, update, options);
  
      // —————————————————————————————————————————
      // 4) Top-10 neu laden
      // —————————————————————————————————————————
      const top10 = await Score.find({ deckId })
                                .sort({ score: -1 })
                                .limit(10)
                                .lean();
  
      // —————————————————————————————————————————
      // 5) Live-Update per Socket.IO
      // —————————————————————————————————————————
      const io = req.app.get('io');
      if (io) {
        io.to(`leaderboard_${deckId.toString()}`)
          .emit('leaderboardUpdated', top10);
      }
  
      console.log('✅ Highscore gespeichert/aktualisiert:', entry);
      return res.json({
        message: '✅ Highscore gespeichert!',
        score:   entry
      });
  
    } catch (err) {
      console.error('❌ Fehler beim Speichern des Highscores:', err);
      return res.status(500).json({
        message: '❌ Interner Serverfehler',
        error:   err.message
      });
    }
  });
  
  router.get('/leaderboard/:deckId', async (req, res) => {
    try {
      const { deckId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(deckId)) {
        return res.status(400).json({ message: '❌ Ungültige deckId' });
      }
      const leaderboard = await Score.find({ deckId })
                                     .sort({ score: -1 })
                                     .limit(10)
                                     .lean();
      return res.json(leaderboard);
    } catch (err) {
      console.error('❌ Fehler beim Laden des Leaderboards:', err);
      return res.status(500).json({ message: '❌ Interner Serverfehler' });
    }
  });

module.exports = router;
