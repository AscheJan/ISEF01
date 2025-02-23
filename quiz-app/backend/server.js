const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const { initializeSocket } = require('./socket');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors());

// Datenbankverbindung herstellen
connectDB();

// Socket.IO initialisieren
initializeSocket(server);

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, '../public')));

// Standardroute für das Laden der index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

server.listen(5000, () => console.log('Server läuft auf Port 5000'));
