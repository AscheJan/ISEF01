const mongoose = require('mongoose');
require('dotenv').config(); // Falls noch nicht geladen
const chalk = require('chalk'); // Für farbige Logs

const connectDB = async () => {
    console.log(chalk.blue('[MongoDB] Verbindung wird hergestellt...'));

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(chalk.green(`[MongoDB] Erfolgreich verbunden: ${conn.connection.host}`));
        console.log(chalk.magenta(`[MongoDB] Datenbank: ${conn.connection.name}`));

    } catch (error) {
        console.error(chalk.red(`[MongoDB] Fehler: ${error.message}`));

        if (error.message.includes('ECONNREFUSED')) {
            console.error(chalk.yellow('[MongoDB] Verbindung wurde abgelehnt. Läuft dein MongoDB-Server?'));
        } else if (error.message.includes('authentication')) {
            console.error(chalk.yellow('[MongoDB] Authentifizierungsfehler. Überprüfe Benutzername/Passwort in der .env Datei.'));
        } else {
            console.error(chalk.yellow('[MongoDB] Ein unerwarteter Fehler ist aufgetreten.'));
        }

        process.exit(1); // Erzwingt das Beenden der Anwendung
    }
};

module.exports = connectDB;
