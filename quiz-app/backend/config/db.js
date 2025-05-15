// Importiere erforderliche Module
const mongoose = require('mongoose');
const chalk = require('chalk');
const dotenv = require('dotenv');

// Umgebungsvariablen laden und validieren
const result = dotenv.config();
if (result.error) {
  console.error(chalk.red('[ENV] Fehler beim Laden der .env-Datei:'), result.error);
  process.exit(1);
}

// Asynchrone Verbindungsfunktion zur MongoDB
const connectDB = async () => {
  console.log(chalk.blueBright('[MongoDB] Verbindung wird vorbereitet...'));

  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    console.error(chalk.red('[MongoDB] ❌ Fehler: MONGO_URI ist nicht definiert oder leer.'));
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log(chalk.greenBright('\n✔️ MongoDB verbunden!'));
    console.log(chalk.cyanBright(`🔗 Host: ${chalk.white(conn.connection.host)}`));
    console.log(chalk.cyanBright(`📂 Datenbank: ${chalk.white(conn.connection.name)}\n`));

    // Optional: Log-Level für spätere Diagnose setzen
    mongoose.set('debug', process.env.NODE_ENV === 'development');

  } catch (error) {
    console.error(chalk.redBright(`\n[MongoDB] ❌ Fehler beim Verbindungsaufbau: ${error.message}`));

    if (error.name === 'MongoNetworkError') {
      console.error(chalk.yellow('📡 Netzwerkproblem: Prüfe deine Internetverbindung oder den Mongo-Server.'));
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error(chalk.yellow('🚫 Verbindung wurde abgelehnt – läuft dein MongoDB-Dienst?'));
    } else if (error.message.includes('ENOTFOUND')) {
      console.error(chalk.yellow('❓ Host nicht gefunden – URI korrekt?'));
    } else if (error.message.includes('authentication')) {
      console.error(chalk.yellow('🔐 Authentifizierungsfehler – Benutzername/Passwort prüfen.'));
    } else {
      console.error(chalk.yellow('⚠️ Unerwarteter Fehler – weitere Details oben.'));
    }

    process.exit(1);
  }
};

// Exportiere die Verbindungsfunktion
module.exports = connectDB;
