// Importiert das Mongoose-Modul für die Arbeit mit MongoDB
const mongoose = require('mongoose');

// Lädt Umgebungsvariablen aus der .env-Datei (z. B. MONGO_URI)
require('dotenv').config(); // Falls noch nicht geladen

// Chalk ermöglicht farbige Konsolenausgaben (zur besseren Lesbarkeit)
const chalk = require('chalk');

// Asynchrone Funktion zur Herstellung einer Verbindung zur MongoDB
const connectDB = async () => {
    console.log(chalk.blue('[MongoDB] Verbindung wird hergestellt...'));

    try {
        // Verbindet sich mit der MongoDB über die Umgebungsvariable MONGO_URI
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,         // Nutzt den neuen URL-Parser
            useUnifiedTopology: true,      // Verwendet den neuen Server-Discovery-Mechanismus
        });

        // ✅ Erfolgreiche Verbindung zur Datenbank
        console.log(chalk.greenBright('\n✔️  MongoDB-Verbindung hergestellt!'));
        console.log(chalk.cyanBright(`🔗 Host: ${chalk.white(conn.connection.host)}`));
        console.log(chalk.cyanBright(`📂 Datenbank: ${chalk.white(conn.connection.name)}\n`));


    } catch (error) {
        // Gibt bei einem Verbindungsfehler eine Fehlermeldung aus
        console.error(chalk.red(`[MongoDB] Fehler: ${error.message}`));

        // Zusätzliche Hinweise je nach Fehlertyp
        if (error.message.includes('ECONNREFUSED')) {
            console.error(chalk.yellow('[MongoDB] Verbindung wurde abgelehnt. Läuft dein MongoDB-Server?'));
        } else if (error.message.includes('authentication')) {
            console.error(chalk.yellow('[MongoDB] Authentifizierungsfehler. Überprüfe Benutzername/Passwort in der .env Datei.'));
        } else {
            console.error(chalk.yellow('[MongoDB] Ein unerwarteter Fehler ist aufgetreten.'));
        }

        // Beendet die Anwendung mit Exit-Code 1 bei einem Verbindungsfehler
        process.exit(1);
    }
};

// Exportiert die Funktion zur Verwendung in anderen Dateien
module.exports = connectDB;
