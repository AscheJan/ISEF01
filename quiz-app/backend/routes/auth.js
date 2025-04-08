// Importiert benötigte Module
require('dotenv').config(); // Falls noch nicht geschehen

const express = require('express');
const bcrypt = require('bcrypt');         // Zum sicheren Hashen von Passwörtern
const jwt = require('jsonwebtoken');      // Zum Erstellen und Verifizieren von Tokens
const User = require('../models/User');   // User-Modell
const router = express.Router();          // Erstellt eine neue Router-Instanz

router.get('/user', async (req, res) => {
  try {
      console.log("🔍 Anfrage an /api/user erhalten.");

      // Token aus dem Authorization-Header extrahieren
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
          console.warn("⚠️ Kein Token bereitgestellt.");
          return res.status(401).json({ error: "Kein Token bereitgestellt" });
      }

      // Token verifizieren
      let decoded;
      try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
          console.error("❌ Token ungültig:", error.message);
          return res.status(401).json({ error: "Token ungültig oder abgelaufen" });
      }

      console.log(`🔍 Benutzer-ID aus Token: ${decoded.userId}`);

      // Benutzer aus der DB holen (nur username anzeigen)
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


router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
      // Nur @iu-study.org erlaubt (anpassbar)
      if (!email.endsWith("@iu-study.org")) {
          return res.status(400).json({ message: "❌ Nur E-Mails mit @iu-study.org sind erlaubt!" });
      }

      // Prüfen, ob Benutzername oder E-Mail bereits existieren
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
          if (existingUser.email === email) {
              return res.status(400).json({ message: "❌ Diese E-Mail ist bereits registriert!" });
          } else {
              return res.status(400).json({ message: "❌ Dieser Benutzername ist bereits vergeben!" });
          }
      }

      // Passwort hashen
      const hashedPassword = await bcrypt.hash(password, 10);

      // Benutzer erstellen und speichern
      const newUser = new User({ username, email, password: hashedPassword, role: "user" });
      await newUser.save();

      res.status(201).json({ message: "✅ Registrierung erfolgreich! Bitte melde dich an." });

  } catch (error) {
      console.error("❌ Fehler bei der Registrierung:", error);

      // Behandlung von MongoDB-Fehlern bei Unique Constraints
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


router.post('/login', async (req, res) => {
  const { username, email, password } = req.body;

  // Suche Benutzer per Username oder E-Mail
  const user = await User.findOne({ $or: [{ username }, { email }] });

  // Wenn kein Benutzer oder Passwort nicht stimmt → Fehler
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: 'Ungültige Anmeldedaten' });
  }

  // JWT erstellen (1 Stunde gültig)
  const token = jwt.sign(
    { userId: user._id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET, // ⚠️ Auch hier sollte das Secret aus process.env kommen!
    { expiresIn: '1h' }
  );

  res.json({ token, username: user.username, email: user.email, role: user.role });
});


// Authentifizierten Benutzer abrufen und Rolle prüfen
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Nicht autorisiert' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
