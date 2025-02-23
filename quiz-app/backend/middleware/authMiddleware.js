const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Falls Benutzerrolle benötigt wird

const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Nicht autorisiert' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Benutzerinformationen speichern
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token ungültig' });
    }
};

// **Fehlende requireAdmin Funktion hinzufügen**
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Nicht autorisiert – Kein Benutzer gefunden' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Zugriff verweigert – nur für Admins' });
    }

    next();
};


module.exports = { requireAuth, requireAdmin };
