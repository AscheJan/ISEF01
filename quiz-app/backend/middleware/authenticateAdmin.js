// middleware/authenticateAdmin.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Nicht autorisiert' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Nur Admins erlaubt' });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token ungültig oder abgelaufen' });
  }
};
