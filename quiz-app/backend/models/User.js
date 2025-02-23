const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, default: 'user' },
  highscore: { type: Number, default: 0 },
});
module.exports = mongoose.model('User', UserSchema);