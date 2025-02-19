// routes/highscores.js
const express = require('express');
const router = express.Router();
const Highscore = require('../models/highscore');

// Funktion zum Speichern eines Highscores
const saveHighscore = async (username, score, gameMode) => {
  try {
    // Überprüfen, ob der Spieler bereits einen Highscore hat und ob der neue Score besser ist
    const existingHighscore = await Highscore.findOne({ username, gameMode }).sort({ score: -1 });

    if (existingHighscore && existingHighscore.score >= score) {
      return null; // Wenn der bestehende Highscore gleich oder besser ist, keine Speicherung
    }

    const newHighscore = new Highscore({
      username,
      score,
      gameMode,
    });

    return await newHighscore.save();
  } catch (err) {
    console.error('[ERROR] Fehler beim Speichern des Highscores:', err);
    throw new Error('Fehler beim Speichern des Highscores');
  }
};

// Highscore speichern
router.post('/', async (req, res) => {
  const { username, score, gameMode } = req.body;

  try {
    const newHighscore = await saveHighscore(username, score, gameMode);
    if (newHighscore) {
      res.status(201).send(newHighscore);
    } else {
      res.status(200).send({ message: 'Kein neuer Highscore, da der Score nicht höher ist.' });
    }
  } catch (err) {
    res.status(500).send(err.message || 'Fehler beim Speichern des Highscores.');
  }
});

// Highscores abrufen, basierend auf dem Spielmodus (Einzelspieler oder Mehrspieler)
router.get('/', (req, res) => {
  const { gameMode } = req.query; // 'singleplayer' oder 'multiplayer'

  Highscore.find({ gameMode })
    .sort({ score: -1 }) // Highscores absteigend nach Punktzahl sortieren
    .then((highscores) => res.status(200).send(highscores))
    .catch((err) => res.status(500).send(err));
});

module.exports = router;
