// middleware/authenticateUser.js
const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: '⛔ Kein Token bereitgestellt' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: '⛔ Token ungültig oder abgelaufen' });
  }
}

module.exports = authenticateUser;
