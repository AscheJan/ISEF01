const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  gamesPlayed: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 }
});

module.exports = mongoose.model("Player", playerSchema);
