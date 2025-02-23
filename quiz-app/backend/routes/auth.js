const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.get('/user', async (req, res) => {
  try {
      console.log("🔍 Anfrage an /api/user erhalten.");

      // 🔹 Token aus Header extrahieren
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
          console.warn("⚠️ Kein Token bereitgestellt.");
          return res.status(401).json({ error: "Kein Token bereitgestellt" });
      }

      // 🔹 Token entschlüsseln
      let decoded;
      try {
          decoded = jwt.verify(token, 'geheim'); // **Hier das korrekte Secret 'geheim' nutzen**
      } catch (error) {
          console.error("❌ Token ungültig:", error.message);
          return res.status(401).json({ error: "Token ungültig oder abgelaufen" });
      }

      console.log(`🔍 Benutzer-ID aus Token: ${decoded.userId}`);

      // 🔹 Benutzer aus MongoDB abrufen
      const user = await User.findById(decoded.userId).select('username');

      if (!user) {
          console.warn("⚠️ Benutzer nicht gefunden.");
          return res.status(404).json({ error: "Benutzer nicht gefunden" });
      }

      console.log(`✅ Benutzer gefunden: ${user.username}`);
      res.json({ username: user.username, userId: decoded.userId });

  } catch (error) {
      console.error("❌ Fehler beim Abrufen des Benutzernamens:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
  }
});


// Registrierung eines neuen Benutzers
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  // Überprüfen, ob der Benutzername bereits existiert
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: 'Benutzername bereits vergeben' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, role: 'user' }); // Standardrolle: user
  await user.save();
  res.json({ message: 'Registrierung erfolgreich' });
});

// Benutzer-Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: 'Ungültige Anmeldedaten' });
  }
  const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, 'geheim', { expiresIn: '1h' });
  res.json({ token, username: user.username, role: user.role });
});

// Authentifizierten Benutzer abrufen und Rolle prüfen
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Nicht autorisiert' });
  try {
    const decoded = jwt.verify(token, 'geheim');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    res.json({ username: user.username, role: user.role });
  } catch (err) {
    res.status(401).json({ message: 'Token ungültig' });
  }
});

// Funktion zur Überprüfung des Login-Status
function checkLoginStatus(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Nicht autorisiert' });
  try {
    const decoded = jwt.verify(token, 'geheim');
    User.findById(decoded.userId).select('-password').then(user => {
      if (user) {
        res.json({ username: user.username, role: user.role });
      } else {
        res.status(404).json({ message: 'Benutzer nicht gefunden' });
      }
    });
  } catch (err) {
    res.status(401).json({ message: 'Token ungültig' });
  }
}

// Benutzer abmelden (optional, für Frontend-Handling)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout erfolgreich' });
});

module.exports = router;
