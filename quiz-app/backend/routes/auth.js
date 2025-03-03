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
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
      // 🛑 **E-Mail-Domain validieren**
      if (!email.endsWith("@iu-study.org")) {
          return res.status(400).json({ message: "❌ Nur E-Mails mit @iu-study.org sind erlaubt!" });
      }

      // 🛑 **Prüfen, ob Benutzername oder E-Mail bereits existiert**
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
          if (existingUser.email === email) {
              return res.status(400).json({ message: "❌ Diese E-Mail ist bereits registriert!" });
          } else {
              return res.status(400).json({ message: "❌ Dieser Benutzername ist bereits vergeben!" });
          }
      }

      // 🔐 **Passwort hashen**
      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ **Neuen Benutzer speichern**
      const newUser = new User({
          username,
          email,
          password: hashedPassword,
          role: "user",
      });

      await newUser.save();
      res.status(201).json({ message: "✅ Registrierung erfolgreich! Bitte melde dich an." });

  } catch (error) {
      console.error("❌ Fehler bei der Registrierung:", error);

      // Prüfen, ob der Fehler durch ein MongoDB Unique-Constraint-Problem verursacht wurde
      if (error.code === 11000) {
          if (error.keyPattern.username) {
              return res.status(400).json({ message: "❌ Dieser Benutzername ist bereits vergeben!" });
          }
          if (error.keyPattern.email) {
              return res.status(400).json({ message: "❌ Diese E-Mail ist bereits registriert!" });
          }
      }

      res.status(500).json({ message: "❌ Interner Serverfehler. Bitte später erneut versuchen." });
  }
});


// Benutzer-Login
router.post('/login', async (req, res) => {
  const { username, email, password } = req.body;

  // 🔍 Suche nach Benutzer anhand von E-Mail oder Username
  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: 'Ungültige Anmeldedaten' });
  }

  const token = jwt.sign(
    { userId: user._id, username: user.username, email: user.email, role: user.role },
    'geheim',
    { expiresIn: '1h' }
  );

  res.json({ token, username: user.username, email: user.email, role: user.role });
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
