const Question = require("../models/Question");
const Deck = require("../models/Deck");
const chalk = require("chalk");

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log(chalk.blue(`[WS] Einzelspieler verbunden: ${socket.id}`));

        // Einzelspieler startet ein Spiel
        socket.on("startSingleplayer", async ({ username, deckId }) => {
            try {
                if (!deckId) {
                    console.error("[ERROR] Kein Deck gewählt!");
                    socket.emit("errorMessage", "Kein Deck gewählt!");
                    return;
                }

                const deck = await Deck.findById(deckId);
                if (!deck) {
                    console.error("[ERROR] Deck nicht gefunden:", deckId);
                    socket.emit("errorMessage", "Deck nicht gefunden.");
                    return;
                }

                console.log(chalk.green(`[SINGLE] Einzelspieler ${username} spielt mit Deck ${deck.name}`));

                // Fragen senden
                socket.emit("singleplayerGameStarted", { questions: deck.questions });
            } catch (error) {
                console.error(chalk.red(`[ERROR] Fehler im Einzelspielermodus: ${error.message}`));
            }
        });

        // Einzelspieler beantwortet eine Frage
        socket.on("submitSingleplayerAnswer", async ({ username, deckId, questionIndex, answerIndex }) => {
            try {
                const deck = await Deck.findById(deckId);
                if (!deck || questionIndex >= deck.questions.length) {
                    console.error("[ERROR] Ungültige Frage oder Deck nicht gefunden.");
                    return;
                }
        
                const question = deck.questions[questionIndex];
                const isCorrect = question.correctIndex === answerIndex;
        
                console.log(chalk.magenta(`[SINGLE] ${username} hat Frage ${questionIndex} beantwortet: ${isCorrect ? "RICHTIG ✅" : "FALSCH ❌"}`));
        
                socket.emit("singleplayerAnswerResult", { isCorrect });
            } catch (error) {
                console.error(`[ERROR] Fehler bei der Antwortverarbeitung: ${error.message}`);
            }
        });
        

        // Einzelspieler beendet das Spiel
        socket.on("finishSingleplayer", ({ username, score }) => {
            console.log(chalk.green(`[SINGLE] ${username} hat das Einzelspieler-Spiel mit ${score} Punkten beendet.`));
            socket.emit("singleplayerFinished", { score });
        });
    });
};
