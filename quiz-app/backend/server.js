const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors());

// Datenbankverbindung herstellen
connectDB();


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, '../public')));

// Standardroute für das Laden der index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

server.listen(5000, () => console.log('Server läuft auf Port 5000'));
