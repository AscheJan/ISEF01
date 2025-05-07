// Importiert notwendige Module
const mongoose = require('mongoose');
require('dotenv').config(); // Lädt Umgebungsvariablen aus der .env-Datei
const chalk = require('chalk');

// Asynchrone Funktion zur Herstellung der Verbindung zur MongoDB
const connectDB = async () => {
    console.log(chalk.blue('[MongoDB] Verbindung wird hergestellt...'));

    // Überprüft, ob die Umgebungsvariable korrekt geladen wurde
    if (!process.env.MONGO_URI) {
        console.error(chalk.red('[MongoDB] Fehler: MONGO_URI ist nicht definiert. Überprüfe deine .env Datei.'));
        process.exit(1);
    }

    // Verbindungsversuch
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        // Erfolgreiche Verbindung
        console.log(chalk.greenBright('\n✔️  MongoDB-Verbindung erfolgreich hergestellt!'));
        console.log(chalk.cyanBright(`🔗 Host: ${chalk.white(conn.connection.host)}`));
        console.log(chalk.cyanBright(`📂 Datenbank: ${chalk.white(conn.connection.name)}\n`));
    } catch (error) {
        // Fehlerbehandlung mit detaillierter Ausgabe
        console.error(chalk.red(`[MongoDB] Fehler: ${error.message}`));

        switch (true) {
            case error.message.includes('ECONNREFUSED'):
                console.error(chalk.yellow('[MongoDB] Verbindung wurde abgelehnt. Läuft dein MongoDB-Server?'));
                break;
            case error.message.includes('authentication'):
                console.error(chalk.yellow('[MongoDB] Authentifizierungsfehler. Überprüfe Benutzername/Passwort in der .env Datei.'));
                break;
            case error.message.includes('ENOTFOUND'):
                console.error(chalk.yellow('[MongoDB] Host konnte nicht gefunden werden. Überprüfe die URI.'));
                break;
            default:
                console.error(chalk.yellow('[MongoDB] Ein unerwarteter Fehler ist aufgetreten.'));
        }

        // Anwendung mit Fehlercode 1 beenden
        process.exit(1);
    }
};

// Export der Funktion zur Verwendung in anderen Dateien
module.exports = connectDB;
