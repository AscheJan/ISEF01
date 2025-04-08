document.addEventListener("DOMContentLoaded", () => {
    checkAndHandleLoginStatus();
    initializeApp();


    const selectDeckAdmin = document.getElementById("selectDeckAdmin");

    if (!selectDeckAdmin) {
        console.error("❌ Fehler: `selectDeckAdmin` wurde nicht gefunden!");
        return;
    }


    selectDeckAdmin.addEventListener("change", function () {
        const selectedDeck = selectDeckAdmin.value;

        if (!selectedDeck || selectedDeck === "") {
            console.warn("⚠️ Kein Deck ausgewählt!");
            return;
        }

        loadAdminQuestions();
    });

    const readyButton = document.getElementById("readyButton");
    const statusText = document.getElementById("status"); // ✅ Korrekte Initialisierung

    if (!readyButton || !statusText) {
        console.error("❌ Fehler: 'readyButton' oder 'statusText' nicht gefunden!");
        return;
    }

    // 🎯 "Bereit"-Button Logik mit Countdown
    readyButton.addEventListener("click", function () {
        if (!gameState.selectedDeck || !gameState.selectedGameMode) {
            showNotification("Bitte wähle zuerst ein Deck und einen Spielmodus!");
            return;
        }

        gameState.isReady = !gameState.isReady;

        if (gameState.isReady) {
            readyButton.innerText = "Nicht bereit";
            statusText.innerText = `Das Quiz startet in ${gameState.countdownValue} Sekunden...`;
            startCountdown();
        } else {
            readyButton.innerText = "Bereit";
            statusText.innerText = "Bitte wähle ein Deck und klicke 'Bereit'.";
            stopCountdown();
        }
    });
});



// 🏗 **Initialisierung der App**
function initializeApp() {
    fetchUserDataIfAuthenticated();
    setupEventListeners();
    initializeUI();
    loadDeckOptions(); // Initial Decks laden
}

// 🎮 **Globale Spielfortschritt-Variablen**
const gameState = {
    selectedDeck: null,
    selectedGameMode: null,
    isReady: false,
    score: 0,
    currentQuestionIndex: 0,
    questionSet: [],
    countdownTimer: null,
    timer: null,
    globalTimer: null,
    countdownValue: 5,
    totalTimeLeft: 60, // Für Speed-Modus
    jokerUsed: false
};


// === Deklariere submitReportButton gleich hier, nachdem der DOM geladen ist ===
const submitReportButton = document.getElementById("submitReport");

// Funktion: handleDeckChange
function handleDeckChange(event) {
    gameState.selectedDeck = event.target.value;
    
    if (gameState.selectedDeck) {
        loadDeckQuestions(gameState.selectedDeck);
    }
    
    updateReadyButtonState(); // Bereit-Button Status überprüfen
}

function handleReadyButton() {
    if (!gameState.selectedDeck || !gameState.selectedGameMode) {
        showNotification("⚠️ Bitte wähle ein Deck und einen Spielmodus!");
        return;
    }

    gameState.isReady = !gameState.isReady;
    const readyButton = document.getElementById("readyButton");
    const statusText = document.getElementById("status");

    if (gameState.isReady) {
        readyButton.innerText = "Nicht bereit";
        statusText.innerText = `🟢 Quiz startet...`;
        startQuiz(); // 🎯 Quiz sofort starten!
    } else {
        readyButton.innerText = "Bereit";
        statusText.innerText = "Bitte wähle ein Deck und einen Spielmodus.";
    }
}




// ✅ **Zentrale Event-Listener**
function setupEventListeners() {
    const selectDeckElement = document.getElementById("selectDeck");
    const readyButton = document.getElementById("readyButton");

    // 🎯 Event-Listener für das Deck-Auswahlmenü
    selectDeckElement?.addEventListener("change", function (event) {
        gameState.selectedDeck = event.target.value;
        updateReadyButtonState();
    });

    // 🎯 Event-Listener für Spielmodus-Buttons
    document.querySelectorAll("#gameModeSelection button").forEach(button => {
        button.addEventListener("click", function () {
            const mode = this.getAttribute("data-mode");
            selectGameMode(mode);
            updateReadyButtonState();
        });
    });

    // 🎯 "Bereit"-Button Funktion
    readyButton?.addEventListener("click", handleReadyButton);

    
}




// Beispiel für handleEscapeKey
function handleEscapeKey(event) {
    if (event.key === "Escape") {
        document.querySelectorAll(".modal").forEach(modal => {
            if (modal.style.display === "block") {
                modal.style.display = "none";
            }
        });
    }
}


// ✅ **UI-Initialisierung**
function initializeUI() {
    const usernameDisplay = document.getElementById("displayUsername");
    const username = localStorage.getItem("username") || "DeinBenutzername";

    if (usernameDisplay) {
        usernameDisplay.innerText = username;
    } else {
        console.warn("⚠️ Benutzername nicht gefunden.");
    }
    const readyButton = document.getElementById("readyButton");
    if (readyButton) readyButton.style.display = "none";
    setupModals();
}

// ✅ **Modale verwalten**
function setupModals() {
    const modal = document.getElementById('editQuestionModal');
    if (!modal) return;

    document.addEventListener('keydown', (event) => {
        if (event.key === "Escape" && modal.style.display === "block") {
            closeEditQuestionModal();
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeEditQuestionModal();
        }
    });
}

// ✅ **User-Authentifizierung**
function fetchUserDataIfAuthenticated() {
    if (localStorage.getItem('token')) {
        fetchUserData();
    } else {
        console.warn("⚠️ Kein Token gefunden – Benutzer möglicherweise nicht eingeloggt.");
    }
}


async function loadDeckOptions() {
    const token = localStorage.getItem('token');

    if (!token) {
        console.warn("⚠️ Kein Token gefunden – Benutzer nicht eingeloggt?");
        showNotification("Bitte melde dich erneut an.");
        return;
    }

    try {
        const response = await fetch('/api/admin/decks', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Fehler beim Laden der Decks: ${response.status}`);

        const data = await response.json();

        if (!data.decks || data.decks.length === 0) {
            console.warn("⚠️ Keine Decks gefunden.");
            return;
        }

        // 🔽 Alle relevanten Select-Elemente abrufen
        const selectDeckAdmin = document.getElementById("selectDeckAdmin");
        const selectDeckLobby = document.getElementById("selectDeck");

        const selectElements = [selectDeckAdmin, selectDeckLobby].filter(el => el !== null);

        if (selectElements.length === 0) {
            console.error("❌ Keine passenden <select>-Elemente gefunden!");
            return;
        }

        // 🔄 Alle gefundenen <select>-Elemente aktualisieren
        selectElements.forEach(select => {
            select.innerHTML = '<option value="">-- Deck auswählen --</option>';

            data.decks.forEach(deck => {
                const option = document.createElement('option');
                option.value = deck._id;
                option.innerText = deck.name;
                select.appendChild(option);
            });
        });

        // 🏆 Event-Listener für die Deck-Auswahl in der Lobby hinzufügen
        if (selectDeckLobby) {
            selectDeckLobby.addEventListener("change", function () {
                let selectedDeckId = this.value;
                let selectedDeckName = data.decks.find(deck => deck._id === selectedDeckId)?.name || "Unbekanntes Deck";

                if (selectedDeckId) {
                    loadDeckQuestions(selectedDeckId);

                    // 📡 Falls der Nutzer in einem Raum ist, Deck-Auswahl senden
                    if (typeof socket !== "undefined" && currentRoom) {
                        socket.emit("selectDeck", { roomCode: currentRoom, playerId, deckId: selectedDeckId });
                    }
                }
            });
        }

    } catch (error) {
        console.error("❌ Fehler beim Laden der Decks:", error);
        showNotification(error.message);
    }
}



// ✅ **Fragen eines Decks abrufen**
async function loadDeckQuestions(deckId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification("⚠️ Bitte melde dich an.");
        return;
    }

    try {
        const response = await fetch(`/api/admin/questions/${deckId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Fehler beim Abrufen der Fragen.");
        }

        const data = await response.json();
        gameState.questionSet = data.questions; // Speichere die Fragen global

        if (gameState.questionSet.length === 0) {
            showNotification("⚠️ Keine Fragen in diesem Deck verfügbar!");
        } else {
            displayQuestion(); // Zeige die erste Frage direkt an
        }

    } catch (error) {
        console.error('❌ Fehler beim Laden der Fragen:', error);
        showNotification("❌ Fehler beim Laden der Fragen.");
    }
}



// ✅ **Report-Modal öffnen**
function openReportModal(questionId, quizDeckId) {
    const reportModal = document.getElementById("reportModal");
    if (!reportModal) {
        console.error("❌ Fehler: `reportModal` nicht gefunden!");
        return;
    }

    reportModal.style.display = "block";
    document.getElementById("reportQuestionId").value = questionId;
    document.getElementById("reportQuizDeckId").value = quizDeckId;
}

// ✅ **Frage melden**
async function submitReport() {
    const questionId = document.getElementById("reportQuestionId").value.trim();
    const quizDeckId = document.getElementById("reportQuizDeckId").value.trim();
    const reason = document.getElementById("reportReason").value.trim();
    const reportedBy = localStorage.getItem("username") || "Anonym";

    if (!questionId || !quizDeckId || !reason) {
        showNotification("⚠️ Bitte gib einen Grund für die Meldung an!", "warning");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        showNotification("⚠️ Nicht angemeldet! Bitte melde dich an.", "warning");
        return;
    }

    try {
        const response = await fetch("/api/admin/report-question", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ questionId, quizDeckId, reportedBy, reason })
        });

        const data = await response.json();
        if (!response.ok) {
            showNotification(`❌ Fehler: ${data.message}`, "error");
            return;
        }

        showNotification("✅ Frage wurde gemeldet!", "success");
        closeReportModal();
        document.getElementById("reportReason").value = ""; // Eingabe leeren

    } catch (error) {
        console.error("❌ Fehler beim Melden der Frage:", error);
        showNotification("❌ Fehler beim Melden der Frage.", "error");
    }
}


// ✅ **Spielmodus wählen & UI aktualisieren**
function selectGameMode(mode) {
    gameState.selectedGameMode = mode;

    // 🔄 Markiere den ausgewählten Spielmodus visuell
    document.querySelectorAll("#gameModeSelection button").forEach(btn => btn.classList.remove("selected"));
    document.querySelector(`#gameModeSelection button[data-mode='${mode}']`)?.classList.add("selected");

    updateReadyButtonState();
}



// ✅ **"Bereit"-Button Status aktualisieren**
function updateReadyButtonState() {
    const readyButton = document.getElementById("readyButton");
    const statusText = document.getElementById("status");
    const statusDeck = document.getElementById("statusDeck"); // 🆕 Anzeige für Deck
    const statusGameMode = document.getElementById("statusGameMode"); // 🆕 Anzeige für Spielmodus

    if (gameState.selectedDeck) {
        const deckElement = document.querySelector(`#selectDeck option[value="${gameState.selectedDeck}"]`);
        statusDeck.innerText = `📖 Gewähltes Deck: ${deckElement ? deckElement.innerText : "Unbekannt"}`;
    } else {
        statusDeck.innerText = "📖 Gewähltes Deck: Noch nicht gewählt";
    }

    if (gameState.selectedGameMode) {
        statusGameMode.innerText = `🎮 Spielmodus: ${gameState.selectedGameMode}`;
    } else {
        statusGameMode.innerText = "🎮 Spielmodus: Noch nicht gewählt";
    }

    if (gameState.selectedDeck && gameState.selectedGameMode) {
        readyButton.style.display = "block";
        statusText.innerText = "Drücke 'Bereit', um das Spiel zu starten!";
    } else {
        readyButton.style.display = "none";
        statusText.innerText = "Bitte wähle ein Deck und einen Spielmodus.";
    }
}


function resetGameState() {
    gameState.score = 0;
    gameState.currentQuestionIndex = 0;
    gameState.questionSet = [];
    gameState.jokerUsed = false;
    stopAllTimers();
}

function stopAllTimers() {
    clearInterval(gameState.timer);
    clearInterval(gameState.countdownTimer);
    clearInterval(gameState.globalTimer);
}




// ✅ **Quiz starten (abhängig vom gewählten Modus)**
function startQuiz() {
    resetGameState();
    document.getElementById("lobby").style.display = "none";
    document.getElementById("quizContainer").style.display = "block";

    loadDeckQuestions(gameState.selectedDeck).then(() => {
        if (gameState.selectedGameMode === "shuffle") shuffleQuestions();
        displayQuestion();

        // ✅ Zeitangriff-Modus (mit Timer)
        if (gameState.selectedGameMode === "timeattack") startTimeAttackMode();

        // ✅ Speed-Modus (60 Sekunden Gesamtzeit)
        if (gameState.selectedGameMode === "speed") startSpeedMode();

        // ✅ Überlebensmodus (eine falsche Antwort = Ende)
        if (gameState.selectedGameMode === "survival") console.log("🛡️ Überlebensmodus aktiv!");

        // ✅ Endlosmodus (Fragen rotieren weiter, kein Ende)
        if (gameState.selectedGameMode === "endless") console.log("🔄 Endlosmodus aktiv!");

        // ✅ Risikomodus (doppelte Punkte oder Punktabzug)
        if (gameState.selectedGameMode === "risk") console.log("🎲 Risikomodus aktiv!");
    });
}

// ✅ **Report-Modal schließen**
function closeReportModal() {
    document.getElementById("reportModal").style.display = "none";
}

async function saveHighscore(deckId, score) {
    const userId = localStorage.getItem("username"); // Verwende die tatsächliche `userId`, nicht `username`
    const username = localStorage.getItem("username") || "Anonym"; // Username ist weiterhin optional

    if (!userId || !deckId || score === undefined) {
        console.error("❌ Fehlende Daten für Highscore-Speicherung:", { userId, deckId, score });
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/scores/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, username, deckId, score })
        });

        if (!response.ok) {
            throw new Error(`❌ Fehler: ${response.status} - ${await response.text()}`);
        }
    } catch (error) {
        console.error("❌ Fehler beim Speichern des Highscores:", error);
    }
}







// ✅ **Quiz beenden**
async function endQuiz() {
    stopAllTimers(); // Stelle sicher, dass alle Timer gestoppt sind

    const userId = localStorage.getItem("username");
    const deckId = gameState.selectedDeck;
    const score = gameState.score;

    if (!userId || !deckId || score === undefined) {
        console.error("❌ Fehlende Daten für Highscore-Speicherung:", { userId, deckId, score });
        return;
    }

    await saveHighscore(deckId, score);

    const quizContainer = document.getElementById("quizContainer");
    const finalScreen = document.getElementById("finalScreen");
    const finalScore = document.getElementById("finalScore");

    if (!quizContainer || !finalScreen || !finalScore) {
        console.error("❌ UI-Elemente für Endscreen fehlen!");
        return;
    }

    quizContainer.style.display = "none"; 
    finalScreen.style.display = "block"; 
    finalScore.innerText = `🏆 Dein Score: ${score}`;

    await loadLeaderboard(deckId);
}



// 🏠 **Escape-Taste & Klick außerhalb des Modals schließen Modale**
function handleOutsideClick(event) {
    document.querySelectorAll(".modal").forEach(modal => {
        if (event.target === modal) modal.style.display = "none";
    });
}


async function fetchDecks() {
    const token = localStorage.getItem('token');
    if (!token) return [];

    try {
        const response = await fetch('/api/admin/decks', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Fehler beim Laden der Decks.");
        const data = await response.json();
        return data.decks;
    } catch (error) {
        console.error("❌ Fehler beim Laden der Decks:", error);
        return [];
    }
}



    //----------------------------------------------------------------
// ✅ **Spielregeln anzeigen**
function openGameRulesModal() {
    document.getElementById("gameRulesModal").style.display = "block";
}

// ❌ **Spielregeln schließen**
function closeGameRulesModal() {
    document.getElementById("gameRulesModal").style.display = "none";
}

// 🏠 **Schließen mit Escape-Taste oder Klick außerhalb**
window.onclick = function(event) {
    const modal = document.getElementById("gameRulesModal");
    if (event.target === modal) {
        closeGameRulesModal();
    }
};

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeGameRulesModal();
    }
});

        
function startCountdown() {
    let timeLeft = gameState.countdownValue;
    const statusText = document.getElementById("status");

    statusText.innerText = `Das Quiz startet in ${timeLeft} Sekunden...`;

    gameState.countdownTimer = setInterval(() => {
        timeLeft--;
        statusText.innerText = `Das Quiz startet in ${timeLeft} Sekunden...`;

        if (timeLeft <= 0) {
            clearInterval(gameState.countdownTimer);
            startQuiz();
        }
    }, 1000);
}

function stopCountdown() {
    clearInterval(gameState.countdownTimer);
}


function checkAnswer(selectedIndex, correctIndex) {
    clearInterval(gameState.timer); // ⏳ Stopp den Timer für die aktuelle Frage

    const answerButtons = document.querySelectorAll("#answerOptions button");

    if (!answerButtons || answerButtons.length === 0) {
        console.error("❌ Fehler: Antwort-Buttons nicht gefunden!");
        return;
    }

    // 🔇 (Optional) Sounds abspielen
    const correctSound = new Audio("sounds/correct.mp3"); // 🎵 Richtig
    const incorrectSound = new Audio("sounds/incorrect.mp3"); // ❌ Falsch

    // 🚀 Buttons deaktivieren, damit nicht mehrfach geklickt werden kann
    answerButtons.forEach(btn => btn.disabled = true);

    // ✅ Korrekte Antwort markieren
    answerButtons.forEach((btn, index) => {
        if (index === correctIndex) {
            btn.style.backgroundImage = "linear-gradient(135deg, #28a745, #1e7e34)"; // Grün
            btn.style.color = "white";
            btn.style.border = "2px solid #155d27";
            btn.style.animation = "correctFlash 0.3s ease-in-out";
            correctSound.play(); // ✅ Sound abspielen
        }

        if (index === selectedIndex && selectedIndex !== correctIndex) {
            // ❌ Falsche Antwort markieren
            btn.style.backgroundImage = "linear-gradient(135deg, #dc3545, #a71d2a)"; // Rot
            btn.style.color = "white";
            btn.style.border = "2px solid #6a121b";
            btn.style.animation = "incorrectShake 0.3s ease-in-out";
            incorrectSound.play(); // ❌ Sound abspielen
        }
    });

    // 🔥 Punktesystem aktualisieren
    if (selectedIndex === correctIndex) {
        gameState.score++;
    } else {
        // 🔴 Überlebensmodus: Bei Fehler sofort beenden!
        if (gameState.selectedGameMode === "survival") {
            stopAllTimers();
            endQuiz();
            return;
        }

        // ⚠️ Risikomodus: Punkte abziehen
        if (gameState.selectedGameMode === "risk") {
            gameState.score = Math.max(0, gameState.score - 1);
        }
    }

    document.getElementById("scoreDisplay").innerText = `🏆 Punktestand: ${gameState.score}`;

    // ⏳ Warte 3 Sekunden, bevor zur nächsten Frage gewechselt wird
    setTimeout(() => {
        // 🔄 Reset Button-Designs
        answerButtons.forEach(btn => {
            btn.style.backgroundImage = "";
            btn.style.color = "";
            btn.style.border = "";
            btn.style.animation = "";
            btn.disabled = false; // Reaktivieren
        });

        gameState.currentQuestionIndex++;

        // 🔄 Endlosmodus: Falls alle Fragen durch sind → zurücksetzen
        if (gameState.selectedGameMode === "endless" && gameState.currentQuestionIndex >= gameState.questionSet.length) {
            gameState.currentQuestionIndex = 0;
            shuffleQuestions();
        }

        // 🚀 Falls noch Fragen übrig sind → nächste Frage anzeigen
        if (gameState.currentQuestionIndex < gameState.questionSet.length) {
            displayQuestion();
        } else {
            endQuiz();
        }
    }, 3000);
}





// 🎲 **Fragen zufällig mischen**
function shuffleQuestions() {
    for (let i = gameState.questionSet.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.questionSet[i], gameState.questionSet[j]] = [gameState.questionSet[j], gameState.questionSet[i]];
    }
}

function checkAnswerSurvival(selectedIndex, correctIndex) {
    if (selectedIndex === correctIndex) {
        gameState.score++;
        document.getElementById("scoreDisplay").innerText = `🏆 Punktestand: ${gameState.score}`;
        gameState.currentQuestionIndex++;
        displayQuestion();
    } else {
        stopAllTimers();
        gameState.currentQuestionIndex = gameState.questionSet.length;
        endQuiz();
    }
}




let totalTimeLeft = 60; // Gesamtzeitlimit für das ganze Quiz

function startSpeedMode() {
    stopAllTimers(); // Stelle sicher, dass kein anderer Timer läuft!

    gameState.totalTimeLeft = 60; // Setze die Gesamtzeit für das Quiz
    document.getElementById("totalTimeDisplay").style.display = "block";

    gameState.globalTimer = setInterval(() => {
        gameState.totalTimeLeft--;
        document.getElementById("totalTimeDisplay").innerText = `⏳ Zeit: ${gameState.totalTimeLeft}s`;

        if (gameState.totalTimeLeft <= 0) {
            clearInterval(gameState.globalTimer);
            endQuiz();
        }
    }, 1000);
}


function checkAnswerRisk(selectedIndex, correctIndex) {
    let riskPoints = 1;

    if (confirm("💰 Möchtest du das Risiko eingehen? Richtige Antwort = 2 Punkte, falsche = -1 Punkt!")) {
        riskPoints = 2;
    } else {
        return;
    }

    if (selectedIndex === correctIndex) {
        gameState.score += riskPoints;
    } else {
        gameState.score -= 1;
    }

    document.getElementById("scoreDisplay").innerText = `🏆 Punktestand: ${gameState.score}`;
    gameState.currentQuestionIndex++;
    displayQuestion();
}



let jokerUsed = false;

function useFiftyFiftyJoker(currentQuestion) {
    if (gameState.jokerUsed) {
        showNotification("⚠️ Du hast den 50:50 Joker bereits benutzt!");
        return;
    }

    gameState.jokerUsed = true;
    let wrongAnswers = currentQuestion.options
        .map((option, index) => index !== currentQuestion.correctOptionIndex ? index : null)
        .filter(index => index !== null);
    
    let removedIndexes = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    document.querySelectorAll("#answerOptions button").forEach((btn, index) => {
        if (removedIndexes.includes(index)) {
            btn.style.display = "none";
        }
    });
}

function checkAnswerEndless(selectedIndex, correctIndex) {
    if (selectedIndex === correctIndex) {
        gameState.score++;
        document.getElementById("scoreDisplay").innerText = `🏆 Punktestand: ${gameState.score}`;
        gameState.currentQuestionIndex++;

        if (gameState.currentQuestionIndex >= gameState.questionSet.length) {
            gameState.currentQuestionIndex = 0;
            shuffleQuestions();
        }

        displayQuestion();
    }
}



function startTimeAttackMode() {
    stopAllTimers();
    displayQuestion();
}

function startQuestionTimer() {
    let timeLeft = 5;
    const timeDisplay = document.getElementById("timeLeft");

    gameState.timer = setInterval(() => {
        timeLeft--;
        timeDisplay.innerText = `⏳ Zeit: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(gameState.timer);
            gameState.currentQuestionIndex++;
            displayQuestion();
        }
    }, 1000);
}



// 🏁 **Frage anzeigen & ggf. Timer starten**
function displayQuestion() {
    clearInterval(gameState.timer); // Timer stoppen, um Überschneidungen zu verhindern
    const questionContainer = document.getElementById("question-container");

    if (!questionContainer) {
        console.error("❌ Fehler: `question-container` nicht gefunden!");
        return;
    } 

    if (gameState.currentQuestionIndex >= gameState.questionSet.length) {
        endQuiz();
        return;
    }

    const currentQuestion = gameState.questionSet[gameState.currentQuestionIndex];

    if (!currentQuestion || !currentQuestion.questionText || !currentQuestion.options) {
        console.error("⚠️ Fehler: Ungültige Frage!");
        return;
    }

    // 🧹 Container leeren & neue Frage einfügen
    questionContainer.innerHTML = `
        <h2>${currentQuestion.questionText}</h2>
        <div id="answerOptions"></div>
        <p id="timeLeft" class="timer">⏳ Zeit: 5s</p>
        <button class="report-button" onclick="openReportModal('${currentQuestion._id}', '${gameState.selectedDeck}')">⚠️ Frage melden</button>
    `;

    // Antwortmöglichkeiten hinzufügen
    const answerOptionsContainer = document.getElementById("answerOptions");

    currentQuestion.options.forEach((option, index) => {
        const btn = document.createElement("button");
        btn.innerText = option;
        btn.onclick = () => checkAnswer(index, currentQuestion.correctOptionIndex);
        answerOptionsContainer.appendChild(btn);
    });

    // Falls "Zeitangriff"-Modus aktiv ist, Timer starten
    if (gameState.selectedGameMode === "timeattack") {
        startQuestionTimer();
    }
}




    

    // 📊 Leaderboard für das aktuelle Deck laden
    async function loadLeaderboard(deckId) {

        try {
            const response = await fetch(`/api/scores/leaderboard/${deckId}`);
            if (!response.ok) throw new Error(`Fehler: ${response.status} - ${await response.text()}`);

            const leaderboard = await response.json();
            const leaderboardContainer = document.getElementById("leaderboard");

            if (!leaderboard.length) {
                leaderboardContainer.innerHTML = "<p>❌ Noch keine Highscores für dieses Deck.</p>";
                return;
            }

            let leaderboardHTML = "<h3>🏆 Leaderboard</h3><ul>";
            leaderboard.forEach((entry, index) => {
                leaderboardHTML += `<li>${index + 1}. ${entry.username}: ${entry.score} Punkte</li>`;
            });
            leaderboardHTML += "</ul>";

            leaderboardContainer.innerHTML = leaderboardHTML;
        } catch (error) {
            console.error("❌ Fehler beim Laden des Leaderboards:", error);
        }
    }
    
 


  function loadAdminDashboard() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Kein Token gefunden');
        return;
    }
    fetch('/api/admin/reported-questions', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Nicht autorisiert');
        }
        return response.json();
    })
    .then(data => {
        showNotification(`Es gibt ${data.length} gemeldete Fragen.`);
    })
    .catch(error => console.error('Fehler beim Laden des Admin-Dashboards:', error));
  }

  
  function fetchUserData() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error("Kein Token gefunden!");
        return logout();
    }
    fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) throw new Error('Nicht autorisiert');
        return response.json();
    })
    .then(user => {
        if (user && user.username) {
            hideElement('home');
            showElement('dashboard');
            setText('displayUsername', user.username);
            // 🛠 Admin-Check verbessern
            localStorage.setItem('role', user.role);
            if (user.role === 'admin') {
                showElement('adminPanel');
            } else {
                hideElement('adminPanel');
            }
        } else {
            logout();
        }
    })
    .catch(error => {
        console.error("Fehler beim Abrufen des Benutzers:", error);
        logout();
    });
  }

  async function register() {
    const newUsername = document.getElementById('newUsername').value.trim();
    const newEmail = document.getElementById('newEmail').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();

    // **Frontend-Validierung: Prüfen, ob die E-Mail erlaubt ist**
    const allowedDomain = "@iu-study.org";
    if (!newEmail.endsWith(allowedDomain)) {
        showError(`❌ Bitte nutze eine gültige ${allowedDomain}-E-Mail-Adresse.`);
        return;
    }

    if (!newUsername || !newEmail || !newPassword) {
        showError("❌ Bitte fülle alle Felder aus.");
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername, email: newEmail, password: newPassword })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }

        showNotification("✅ Registrierung erfolgreich! Bitte melde dich an.");
        showLogin(); // Zurück zur Anmeldung navigieren
    } catch (error) {
        console.error("❌ Fehler bei der Registrierung:", error);
        showNotification("❌ Registrierung fehlgeschlagen.");
        showError(error.message);
    }
}




  function showRegister() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('register').style.display = 'block';
  }

  async function login() {
    const identifier = document.getElementById("username").value.trim(); // Kann Username oder E-Mail sein
    const password = document.getElementById("password").value.trim();

    if (!identifier || !password) {
        return showError("⚠️ Bitte Benutzername/E-Mail und Passwort eingeben.");
    }

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: identifier, email: identifier, password })
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            throw new Error("Ungültige Antwort vom Server. Bitte später erneut versuchen.");
        }

        if (!response.ok) {
            throw new Error(data.message || "Login fehlgeschlagen.");
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("email", data.email); // 🆕 E-Mail speichern

        window.location.reload();
    } catch (error) {
        console.error("❌ Fehler beim Login:", error);
        showError(error.message);
    }
}






  function showError(message) {
    const errorElement = document.getElementById("error");
    if (errorElement) {
        errorElement.innerText = message;
        errorElement.style.color = "red";
    }
  }

  function logout() {

    // 🔥 Entferne alle gespeicherten Daten
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");

    // Versuche, die Eingabefelder zu leeren, falls sie auf der aktuellen Seite existieren
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    if (usernameInput) usernameInput.value = "";
    if (passwordInput) passwordInput.value = "";

    // 🌍 Weiterleitung zur Login-Seite nach kurzem Timeout (um sicheres Löschen zu garantieren)
    setTimeout(() => {
        window.location.href = "/login.html";
    }, 100); 
 }


 function showLogin(){
    window.location.href = "/login.html";
 }

  function hideElement(id) {
    const element = document.getElementById(id);
    if (element) element.style.display = 'none';
  }
  function showElement(id) {
    const element = document.getElementById(id);
    if (element) element.style.display = 'block';
  }
  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.innerText = text;
  }







  function showAdminPanel() {
    fetchUserData(); // Sicherstellen, dass die Benutzerdaten geladen wurden
    hideElement('dashboard');
    showElement('adminPanel');
  }

  
  // Admin-Funktionen für Deck-Management und Fragenverwaltung
  async function openAdminModal() {
    const adminModal = document.getElementById('adminModal');
    if (!adminModal) {
        console.error("❌ Fehler: Das Admin-Modal existiert nicht!");
        return;
    }
    showElement('adminModal');
    try {
        await loadDecks();
    } catch (error) {
        console.error("❌ Fehler beim Laden der Decks:", error);
        showNotification("Fehler beim Laden der Decks!");
    }
  }



  function closeAdminModal() {
    hideElement('adminModal');
  }


  // Deck erstellen
  async function createDeck() {
    const deckNameInput = document.getElementById('deckName');
    if (!deckNameInput || !deckNameInput.value.trim()) {
        showNotification('❌ Bitte einen Namen für das Deck eingeben.');
        return;
    }
    const deckName = deckNameInput.value.trim();
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('⚠️ Authentifizierung fehlgeschlagen. Bitte erneut anmelden.');
        return;
    }
    try {
        const response = await fetch('/api/admin/create-deck', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: deckName })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Fehler beim Erstellen des Decks');
        showNotification(`✅ Deck "${deckName}" erfolgreich erstellt!`);
        deckNameInput.value = '';
        // Decks abrufen und Dropdowns füllen
        loadDeckOptions();
        await loadDecks(); // Deck-Liste aktualisieren
    } catch (error) {
        console.error('❌ Fehler beim Erstellen des Decks:', error);
        showNotification(error.message);
    }
  }
  





  // Deck löschen
  function deleteDeck(deckId) {
    if (!confirm('Möchtest du dieses Deck wirklich löschen?')) return;
    const token = localStorage.getItem('token');
    fetch(`/api/admin/delete-deck/${deckId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        showNotification('Deck erfolgreich gelöscht!');
        // Decks abrufen und Dropdowns füllen
        loadDeckOptions();
        loadDecks();
    })
    .catch(error => {
        showNotification('Fehler beim Löschen des Decks: ' + error.message);
    });
  }


async function loadDeckQuestionsAndDisplay(deckId) {

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification("⚠️ Nicht angemeldet! Bitte melde dich an.", "warning");
        window.location.href = "/login";
        return;
    }

    const questionList = document.getElementById('adminQuestionList');

    if (!questionList) {
        console.error("❌ `questionList` nicht gefunden!");
        return;
    }

    questionList.innerHTML = '<p>⏳ Fragen werden geladen...</p>'; // Lade-Status

    try {
        const response = await fetch(`/api/admin/questions/${deckId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`❌ Fehler: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        const questions = data.questions || [];

        questionList.innerHTML = ''; // Vorherige Inhalte entfernen

        if (questions.length === 0) {
            questionList.innerHTML = '<p>⚠️ Keine Fragen in diesem Deck vorhanden.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        questions.forEach(question => {
            const listItem = document.createElement('li');
            listItem.classList.add('question-item');
            listItem.innerHTML = `<strong>${question.questionText}</strong>`;

            // ✏️ Bearbeiten-Button
            const editButton = document.createElement('button');
            editButton.innerHTML = "✏️";
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => 
                openEditQuestionModal(question._id, question.questionText, question.options, question.correctOptionIndex)
            );

            // 🗑 Löschen-Button (falls benötigt)
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = "🗑";
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', async () => {
                await deleteQuestion(question._id, deckId);
            });

            listItem.appendChild(editButton);
            listItem.appendChild(deleteButton);
            fragment.appendChild(listItem);
        });

        questionList.appendChild(fragment);
        showNotification("✅ Fragen erfolgreich geladen!", "success");

    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Fragen:', error);
        showNotification(`Fehler beim Abrufen der Fragen: ${error.message}`, "error");
    }
}

async function loadAdminQuestions() {
    const selectDeckAdmin = document.getElementById("selectDeckAdmin"); // Admin-spezifisch
    if (!selectDeckAdmin) {
        console.error("❌ Fehler: `selectDeckAdmin` wurde nicht gefunden!");
        return;
    }

    const selectedDeck = selectDeckAdmin.value;

    if (!selectedDeck || selectedDeck === "") {
        console.warn("⚠️ Kein Deck ausgewählt!");
        return;
    }

    const questionList = document.getElementById('adminQuestionList');
    if (!questionList) {
        console.error("❌ `adminQuestionList` nicht gefunden!");
        return;
    }

    questionList.innerHTML = '<p>⏳ Fragen werden geladen...</p>'; // Lade-Status

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification("⚠️ Nicht angemeldet! Bitte melde dich an.", "warning");
        return;
    }

    try {
        const response = await fetch(`/api/admin/questions/${selectedDeck}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`❌ Fehler: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        const questions = data.questions || [];

        questionList.innerHTML = ''; // Vorherige Inhalte entfernen

        if (questions.length === 0) {
            questionList.innerHTML = '<p>⚠️ Keine Fragen in diesem Deck vorhanden.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        questions.forEach(question => {
            const listItem = document.createElement('li');
            listItem.classList.add('question-item');
            listItem.innerHTML = `<strong>${question.questionText}</strong>`;

            // ✏️ Bearbeiten-Button
            const editButton = document.createElement('button');
            editButton.innerHTML = "✏️";
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => openEditQuestionModal(question._id, question.questionText, question.options, question.correctOptionIndex));

            // 🗑 Löschen-Button
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = "🗑";
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', async () => {
                await deleteQuestion(question._id, selectedDeck);
            });

            listItem.appendChild(editButton);
            listItem.appendChild(deleteButton);
            fragment.appendChild(listItem);
        });

        questionList.appendChild(fragment);
        showNotification("✅ Fragen erfolgreich geladen!", "success");

    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Fragen:', error);
        showNotification(`Fehler beim Abrufen der Fragen: ${error.message}`, "error");
    }
}



// Funktion zum Hinzufügen einer neuen Frage
async function addQuestion() {

    const adminModal = document.getElementById('adminModal');
    if (!adminModal) {
        console.error("❌ Fehler: Admin-Modal nicht gefunden!");
        showNotification("❌ Fehler: Das Admin-Panel konnte nicht gefunden werden.", "error");
        return;
    }

    // 🛠 Sicherstellen, dass `selectDeckAdmin` existiert
    const selectDeckAdmin = document.getElementById("selectDeckAdmin");
    if (!selectDeckAdmin) {
        console.error("❌ Fehler: `selectDeckAdmin` nicht gefunden!");
        showNotification("❌ Fehler: Das Deck-Auswahlfeld fehlt!", "error");
        return;
    }

    const selectedOption = selectDeckAdmin.options[selectDeckAdmin.selectedIndex];
    const quizDeckId = selectedOption?.value.trim();

    if (!quizDeckId) {
        showNotification("⚠️ Bitte wähle ein Deck aus, bevor du eine Frage hinzufügst.", "warning");
        return;
    }

    // 🛠 Felder für die Frage
    const questionTextElement = adminModal.querySelector('#questionText');
    const option1Element = adminModal.querySelector('#option1');
    const option2Element = adminModal.querySelector('#option2');
    const option3Element = adminModal.querySelector('#option3');
    const option4Element = adminModal.querySelector('#option4');
    const correctOptionElement = adminModal.querySelector('#correctOption');

    if (!questionTextElement || !option1Element || !option2Element || !option3Element || !option4Element || !correctOptionElement) {
        console.error("❌ Fehler: Mindestens ein Eingabefeld fehlt!");
        showNotification("❌ Fehler: Ein erforderliches Eingabefeld fehlt!", "error");
        return;
    }

    const questionText = questionTextElement.value.trim();
    const options = [
        option1Element.value.trim(),
        option2Element.value.trim(),
        option3Element.value.trim(),
        option4Element.value.trim()
    ];
    const correctOptionIndex = parseInt(correctOptionElement.value, 10);

    // 🚨 Validierung der Eingaben
    if (!questionText || options.some(opt => opt === '')) {
        showNotification('⚠️ Bitte fülle alle Felder aus.', "warning");
        return;
    }

    if (isNaN(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
        showNotification('⚠️ Bitte gib eine gültige korrekte Antwortnummer (0-3) an.', "warning");
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification("⚠️ Nicht angemeldet! Bitte melde dich an.", "warning");
        window.location.href = "/login";
        return;
    }

    try {
        const response = await fetch('/api/admin/add-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quizDeckId, questionText, options, correctOptionIndex })
        });

        if (!response.ok) {
            throw new Error(`❌ Fehler beim Hinzufügen der Frage: ${response.status} - ${await response.text()}`);
        }

        showNotification('✅ Frage erfolgreich hinzugefügt!', "success");

        // 🔄 Lade die Fragen neu, damit sie in der Liste erscheinen
        await loadAdminQuestions();

        // 🧹 Felder zurücksetzen
        questionTextElement.value = "";
        option1Element.value = "";
        option2Element.value = "";
        option3Element.value = "";
        option4Element.value = "";
        correctOptionElement.value = "";
    } catch (error) {
        console.error('❌ Fehler beim Hinzufügen der Frage:', error);
        showNotification(`❌ Fehler beim Hinzufügen der Frage: ${error.message}`, "error");
    }
}




  // Modal für Fragenbearbeitung
  function openEditQuestionModal(questionId, questionText, options, correctIndex) {
    const modal = document.getElementById('editQuestionModal');
    if (!modal) {
        console.error("❌ Fehler: Modal nicht gefunden!");
        return;
    }
    document.getElementById('editQuestionId').value = questionId;
    document.getElementById('editQuestionText').value = questionText;
    document.getElementById('editOption1').value = options[0] || '';
    document.getElementById('editOption2').value = options[1] || '';
    document.getElementById('editOption3').value = options[2] || '';
    document.getElementById('editOption4').value = options[3] || '';
    document.getElementById('editCorrectOption').value = correctIndex;
    // Modal anzeigen
    modal.style.display = "block";
    // Fokus auf das Eingabefeld setzen
    setTimeout(() => document.getElementById('editQuestionText').focus(), 100);
  }
  // Schließt das Bearbeitungsmodalfunction closeEditQuestionModal() {
    function closeEditQuestionModal() {
      document.getElementById('editQuestionModal').style.display = "none";
  }
  // ✅ Bearbeiten einer Frage
  async function editQuestion() {
    const questionId = document.getElementById('editQuestionId').value.trim();
    const newText = document.getElementById('editQuestionText').value.trim();
    const newOptions = [
        document.getElementById('editOption1').value.trim(),
        document.getElementById('editOption2').value.trim(),
        document.getElementById('editOption3').value.trim(),
        document.getElementById('editOption4').value.trim()
    ];
    const correctOptionInput = document.getElementById('editCorrectOption').value.trim();
    const deckId = document.getElementById('selectDeck').value; // Deck ID für UI-Update
    // ✅ 1. Alle Felder müssen ausgefüllt sein
    if (!questionId || !newText || newOptions.some(option => option === '')) {
        showNotification('⚠️ Bitte fülle alle Felder aus.');
        return;
    }
    // ✅ 2. Überprüfung, ob die korrekte Antwort eine gültige Zahl zwischen 0-3 ist
    const newCorrectOption = parseInt(correctOptionInput, 10);
    if (isNaN(newCorrectOption) || newCorrectOption < 0 || newCorrectOption > 3) {
        showNotification('⚠️ Bitte gib eine gültige korrekte Antwortnummer zwischen 0 und 3 an.');
        return;
    }
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/admin/edit-question/${questionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                questionText: newText, 
                options: newOptions, 
                correctOptionIndex: newCorrectOption 
            })
        });
        if (!response.ok) {
            throw new Error(`Fehler beim Bearbeiten der Frage: ${response.status}`);
        }
        showNotification('✅ Frage erfolgreich bearbeitet!');
        closeEditQuestionModal();
        window.location.reload();
    } catch (error) {
        showNotification('❌ Fehler beim Bearbeiten der Frage: ' + error.message);
    }
  }
  // 🗑 Frage löschen mit Sicherheitsabfrage
  async function deleteQuestion(questionId, deckId, questionText = '') {
    if (!confirm(`🚨 Möchtest du die Frage wirklich löschen?\n\n❓ "${questionText}"`)) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/admin/delete-question/${questionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Fehler beim Löschen der Frage.');
        }
        showNotification('✅ Frage erfolgreich gelöscht!');
        // 🔄 UI sofort aktualisieren, ohne gesamte Liste neu zu laden
        const questionListItem = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionListItem) {
            questionListItem.remove();
        } else {
            await loadDeckQuestions(deckId); // Falls UI nicht aktualisiert wurde, gesamte Liste neu laden
        }
    } catch (error) {
        showNotification('❌ Fehler beim Löschen der Frage: ' + error.message);
    }
  }
  // 🗑 Frage löschen mit Sicherheitsabfrage
  async function deleteQuestion(questionId, deckId) {
    if (!confirm('🚨 Möchtest du diese Frage wirklich löschen?')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/admin/delete-question/${questionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Fehler beim Löschen der Frage.');
        }
        showNotification('✅ Frage erfolgreich gelöscht!');
        await loadDeckQuestions(deckId); // Nach dem Löschen Liste neu laden
    } catch (error) {
        showNotification('❌ Fehler beim Löschen der Frage: ' + error.message);
    }
  }
  // Öffnet das Modal für gemeldete Fragen
  function openReportedQuestionsModal() {
    showElement('reportedQuestionsModal');
    loadReportedQuestions();
  }
  // Schließt das Modal für gemeldete Fragen
  function closeReportedQuestionsModal() {
    hideElement('reportedQuestionsModal');
  }

  async function loadReportedQuestions() {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Nicht autorisiert. Bitte erneut anmelden.');
        return;
    }

    try {
        const response = await fetch('/api/admin/reported-questions', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Fehler: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const reportedQuestionsList = document.getElementById('reportedQuestionsList');
        reportedQuestionsList.innerHTML = '';

        if (data.length === 0) {
            reportedQuestionsList.innerHTML = '<p>Keine gemeldeten Fragen.</p>';
            return;
        }

        data.forEach(report => {
            const reportId = report._id || 'Unbekannt';
            const quizDeckName = report.quizDeckId?.name || 'Unbekannt';
            const questionId = report.questionId?._id || 'Unbekannt';
            const questionText = report.questionId?.questionText || 'Unbekannt';
            const reason = report.reason || 'Kein Grund angegeben';

            // 🛠 reportedBy prüfen:
            let reportedBy = 'Unbekannt';
            if (report.reportedBy && typeof report.reportedBy === 'object' && report.reportedBy.username) {
                reportedBy = report.reportedBy.username;
            } else if (report.reportedBy && typeof report.reportedBy === 'string') {
                reportedBy = `Unbekannt (ID: ${report.reportedBy})`;
            }

            const options = report.questionId?.options ? JSON.stringify(report.questionId.options) : '[]';
            const correctOptionIndex = typeof report.questionId?.correctOptionIndex === 'number' ? report.questionId.correctOptionIndex : 'Unbekannt';

            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>Deck:</strong> <span>${quizDeckName}</span><br>
                <strong>Frage:</strong> <span>${questionText}</span><br>
                <strong>Gemeldet von:</strong> <span>${reportedBy}</span><br>
                <strong>Grund:</strong> <span>${reason}</span><br>
            `;

            const editButton = document.createElement('button');
            editButton.innerHTML = "✏️ Bearbeiten";
            editButton.addEventListener("click", () => {
                openEditReportedQuestion(reportId, questionId, questionText, JSON.parse(options), correctOptionIndex);
            });

            listItem.appendChild(editButton);
            reportedQuestionsList.appendChild(listItem);
        });

    } catch (error) {
        console.error('❌ Fehler beim Laden der gemeldeten Fragen:', error);
        showNotification(`Fehler beim Laden der gemeldeten Fragen: ${error.message}`);
    }
}




async function validateReportedQuestion() {
    const reportId = document.getElementById('editReportedReportId').value.trim();
    const questionId = document.getElementById('editReportedQuestionId').value.trim();
    
    const updatedQuestionText = document.getElementById('editReportedQuestionText').value.trim();
    const updatedOptions = [
        document.getElementById('editReportedOption1').value.trim(),
        document.getElementById('editReportedOption2').value.trim(),
        document.getElementById('editReportedOption3').value.trim(),
        document.getElementById('editReportedOption4').value.trim()
    ];
    const updatedCorrectOption = parseInt(document.getElementById('editReportedCorrectOption').value.trim(), 10);

    if (!reportId || !questionId || !updatedQuestionText || updatedOptions.some(opt => opt === '') || isNaN(updatedCorrectOption) || updatedCorrectOption < 0 || updatedCorrectOption > 3) {
        showNotification("⚠️ Bitte fülle alle Felder korrekt aus.");
        return;
    }

    try {
        const response = await fetch('/api/admin/validate-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reportId,
                action: 'update',
                updatedQuestion: updatedQuestionText,
                updatedOptions,
                updatedCorrectOption
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        showNotification("✅ Frage erfolgreich aktualisiert!");
        document.getElementById('editReportedQuestionSection').style.display = 'none';
        loadReportedQuestions();
    } catch (error) {
        showNotification(`❌ Fehler: ${error.message}`);
    }
}

function openEditReportedQuestion(reportId, questionId, questionText, options, correctIndex) {

    document.getElementById('editReportedReportId').value = reportId;
    document.getElementById('editReportedQuestionId').value = questionId;
    document.getElementById('editReportedQuestionText').value = questionText;

    if (Array.isArray(options) && options.length === 4) {
        document.getElementById('editReportedOption1').value = options[0] || '';
        document.getElementById('editReportedOption2').value = options[1] || '';
        document.getElementById('editReportedOption3').value = options[2] || '';
        document.getElementById('editReportedOption4').value = options[3] || '';
    } else {
        console.warn("⚠️ Ungültige oder fehlende Antwortoptionen:", options);
    }

    if (typeof correctIndex === 'number' && correctIndex >= 0 && correctIndex <= 3) {
        document.getElementById('editReportedCorrectOption').value = correctIndex;
    } else {
        console.warn("⚠️ Ungültiger korrekter Index:", correctIndex);
    }

    document.getElementById('editReportedQuestionSection').style.display = 'block';
}




function closeEditReportedQuestion() {
    document.getElementById('editReportedQuestionSection').style.display = 'none';
}


function cancelEditReportedQuestion() {
    document.getElementById('editReportedQuestionSection').style.display = 'none';
}



  // Frage validieren (löschen oder bearbeiten)
  function validateQuestion(reportId, action, questionText = '') {
    if (action === 'update') {
        const newText = prompt('Neuen Fragetext eingeben:', questionText);
        if (!newText) return;
        sendValidationRequest(reportId, action, newText);
    } else if (action === 'delete') {
        if (!confirm('Möchtest du diese Frage wirklich löschen?')) return;
        sendValidationRequest(reportId, action);
    }
  }
  // Sendet die Validierungsanfrage an das Backend
  function sendValidationRequest(reportId, action, updatedQuestion = '') {
    const token = localStorage.getItem('token');
    fetch('/api/admin/validate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reportId, action, updatedQuestion })
    })
    .then(response => response.json())
    .then(data => {
        showNotification('Frage wurde validiert!');
        loadReportedQuestions();
    })
    .catch(error => {
        showNotification('Fehler beim Validieren der Frage: ' + error.message);
    });
  }

  
  // Spiel-Logik

  let currentRoom = null;
  let currentUser = null;
  let hostUsername = null;

  let gameMode = null;
  // 🛠 **Benutzernamen aus MongoDB abrufen**
  async function fetchUsername() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            checkAndHandleLoginStatus();
            return null;
        }

        const response = await fetch('/api/auth/user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return handleFetchError(response);
        }

        const data = await response.json();
        if (data.username) {
            localStorage.setItem('username', data.username);
            return data.username;
        } else {
            throw new Error("Benutzername nicht gefunden.");
        }
    } catch (error) {
        console.error("Fehler beim Abrufen des Benutzernamens:", error);
        return null;
    }
}

function checkAndHandleLoginStatus() {
    const token = localStorage.getItem("token");
    const homeElement = document.getElementById("home");
    const registerElement = document.getElementById("register");
    const dashboardElement = document.getElementById("dashboard");
    const lobbyElement = document.getElementById("lobby"); // Lobby-Element hinzufügen

    if (token) {
        // ✅ Benutzer ist eingeloggt
        console.debug("✅ Benutzer ist eingeloggt.");
        if (homeElement) homeElement.style.display = "none";
        if (registerElement) registerElement.style.display = "none";
        if (dashboardElement) dashboardElement.style.display = "block";
        if (lobbyElement) lobbyElement.style.display = "block"; // Lobby anzeigen

        // Benutzername aktualisieren
        const username = localStorage.getItem("username") || "Unbekannt";
        const displayUsernameElement = document.getElementById("displayUsername");
        if (displayUsernameElement) displayUsernameElement.innerText = username;
    } else {
        // ❌ Benutzer ist nicht eingeloggt
        console.warn("⚠ Benutzer ist nicht eingeloggt.");
        if (homeElement) homeElement.style.display = "block";
        if (registerElement) registerElement.style.display = "none";
        if (dashboardElement) dashboardElement.style.display = "none";
        if (lobbyElement) lobbyElement.style.display = "none"; // 💡 Lobby ausblenden

        // Falls nicht auf der Login-Seite, weiterleiten
        if (window.location.pathname !== "/login") {
            if (typeof showNotification === "function") {
                showNotification("Bitte melde dich zuerst an!");
            }
            window.location.href = "/login";
        }
    }
}



async function handleFetchError(response) {
    if (response.status === 401) {
        checkAndHandleLoginStatus();
        return null;
    }
    const errorText = await response.text();
    throw new Error(`Server-Fehler: ${response.status} - ${errorText}`);
}

  // Setze den Benutzernamen beim Laden der Seite
  document.addEventListener('DOMContentLoaded', async () => {
    usernameGame = await fetchUsername();
  });

// 🎮 **Neues Spiel starten**
async function createGame() {

    // **Dashboard verstecken & Lobby anzeigen**
    document.getElementById("quizContainer").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("lobby").style.display = "block";

    // **Decks aus API laden**
    await loadDecks();

    // **Zufälligen Raumcode generieren**
    const roomCode = generateRoomCode();
    document.getElementById("roomCode").textContent = roomCode;
}

// ✅ Hilfsfunktion: Raumcode generieren
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}





  async function loadDecks() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn("⚠️ Kein Token gefunden – Benutzer nicht eingeloggt?");
        showNotification("Bitte melde dich erneut an.");
        return;
    }
    try {
        const response = await fetch('/api/admin/decks', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) throw new Error('⚠️ Nicht autorisiert – Bitte erneut einloggen.');
        if (response.status === 403) throw new Error('⛔ Zugriff verweigert – Nur Admins dürfen Decks verwalten.');
        if (!response.ok) throw new Error(`❌ Fehler beim Abrufen der Decks – Status: ${response.status}`);
        const data = await response.json();
        const deckList = document.getElementById('deckList');
        const selectDeck = document.getElementById('selectDeck');
        if (!deckList || !selectDeck) {
            console.error("❌ `deckList` oder `selectDeck` nicht gefunden. Abbruch.");
            return;
        }
        // Vorhandene Einträge löschen
        deckList.innerHTML = '';
        selectDeck.innerHTML = '<option value="">-- Deck auswählen --</option>';
        if (!data.decks || data.decks.length === 0) {
            console.warn("⚠️ Keine Decks gefunden.");
            return;
        }
        // Decks zur Liste und Dropdown hinzufügen
        data.decks.forEach(deck => {
            const listItem = document.createElement('li');
            listItem.innerText = deck.name;
            listItem.addEventListener('click', () => loadDeckQuestions(deck._id));
            const deleteButton = document.createElement('button');
            deleteButton.innerText = "🗑";
            deleteButton.addEventListener('click', async (event) => {
                event.stopPropagation(); // Verhindert, dass der Klick auch das Deck lädt
                await deleteDeck(deck._id);
            });
            listItem.appendChild(deleteButton);
            deckList.appendChild(listItem);
            // Dropdown-Option
            const option = document.createElement('option');
            option.value = deck._id;
            option.innerText = deck.name;
            selectDeck.appendChild(option);
        });
    } catch (error) {
        console.error('❌ Fehler beim Laden der Decks:', error);
        showNotification(error.message);
    }
  }

  function showNotification(message, type = "info", duration = 3000) {
    // 🔄 Falls bereits eine Benachrichtigung existiert, entfernen
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
        existingNotification.remove();
    }

    // 🏗️ Benachrichtigung erstellen
    const notification = document.createElement("div");
    notification.classList.add("notification", type);
    notification.innerText = message;

    // ❌ Klick schließt die Benachrichtigung
    notification.addEventListener("click", () => {
        notification.remove();
    });

    // 📌 Benachrichtigung in den Body einfügen
    document.body.appendChild(notification);

    // ⏳ Automatisch nach `duration` ms entfernen
    setTimeout(() => {
        notification.remove();
    }, duration);
}



//socket IO

const socket = io();
let playerId = Math.random().toString(36).substr(2, 9);
let isMultiplayer = false;
let isHost = false;

function openJoinGameModal() {
    document.getElementById("joinGameModal").style.display = "block";
}

function closeJoinGameModal() {
    document.getElementById("joinGameModal").style.display = "none";
}

// DOM-Elemente holen
const leaveButton = document.getElementById("leaveButton");

// Sicherstellen, dass der Button versteckt ist, bevor er gebraucht wird
leaveButton.style.display = "none";

// Spieler tritt Multiplayer bei
function joinMultiplayer() {
    isMultiplayer = true;

    // Überprüfen, ob der Button existiert und anzeigen
    if (leaveButton) {
        leaveButton.style.display = "block";
    }

    socket.emit("joinLobby", { playerId });
}

// Spieler verlässt Multiplayer-Lobby
leaveButton.addEventListener("click", () => {
    socket.emit("leaveLobby", { playerId, roomCode: currentRoom });
});

// Lobby aktualisieren
socket.on("updateLobby", (players) => {
    updatePlayers(players); // Verwenden wir eine einheitliche Funktion!
    checkIfHost(players);
});

// 🏆 Spieler-Liste aktualisieren
// 🏆 Spieler-Liste aktualisieren
function updatePlayers(players, host) {
    let playerList = document.getElementById("playerList"); 
    if (!playerList) {
        console.error("❌ Fehler: `playerList` nicht gefunden!");
        return;
    }

    playerList.innerHTML = ""; // 🧹 Liste leeren

    players.forEach((player) => {
        let li = document.createElement("li");
        let playerName = player.name || `Spieler ${player.id.substring(0, 5)}`;

        // **Nur wenn Multiplayer: Host anzeigen**
        if (players.length > 1 && host && player.id === host.id) {
            li.textContent = `👑 ${playerName} (Host)`;
        } else {
            li.textContent = `👤 ${playerName}`;
        }

        playerList.appendChild(li);
    });

    // Host-Status anzeigen
    let statusText = document.getElementById("lobbyStatus");
    if (!statusText) return;

    if (players.length > 1 && host) {
        statusText.textContent = `👑 ${host.username} ist der Host`;
    } else {
        statusText.textContent = `🕹️ Einzelspieler-Modus`;
    }
}



// 🏆 Neuen Host bestimmen
function checkIfHost(players) {
    let currentPlayer = players.find(p => p.id === playerId);
    let lobbyStatusElement = document.getElementById("lobbyStatus");

    if (!lobbyStatusElement) {
        //console.error("❌ Fehler: `lobbyStatus` nicht gefunden!");
        return;
    }

    if (currentPlayer && currentPlayer.isHost) {
        isHost = true;
        lobbyStatusElement.textContent = "Du bist der Host!";
    } else {
        isHost = false;
        lobbyStatusElement.textContent = "Wartelobby";
    }
}


// Spieler verlässt die Lobby
socket.on("playerLeft", (players) => {
    if (!players.some(p => p.id === playerId)) {
        isMultiplayer = false;
        
        // Button ausblenden
        if (leaveButton) {
            leaveButton.style.display = "none";
        }
    }
});

// Automatisch neuen Host bestimmen
socket.on("newHost", (newHostId) => {
    if (playerId === newHostId) {
        isHost = true;
        document.getElementById("lobbyStatus").textContent = "Du bist der neue Host!";
    }
});


document.getElementById("selectDeck").addEventListener("change", function () {
    let selectedDeckId = this.value;
    if (selectedDeckId) {
        gameState.selectedDeck = selectedDeckId;
        socket.emit("selectDeck", { roomCode: currentRoom, deckId: selectedDeckId });
    }
});

socket.on("updateDeckSelection", (deckId) => {
    document.getElementById("statusDeck").innerText = `📖 Gewähltes Deck: ${deckId}`;
});

// 🎮 Spielmodus synchronisieren
document.querySelectorAll("#gameModeSelection button").forEach(button => {
    button.addEventListener("click", function () {
        const mode = this.getAttribute("data-mode");
        gameState.selectedGameMode = mode;
        socket.emit("selectGameMode", { roomCode: currentRoom, gameMode: mode });
    });
});

// 🏁 Server informiert alle Spieler, dass Deck & Modus gewählt wurden
socket.on("allSelectionsMade", ({ deck, mode }) => {
    let statusText = document.getElementById("status");
    if (statusText) {
        statusText.innerText = `📖 Gewähltes Deck: ${deck} | 🎮 Spielmodus: ${mode}`;
    }

    let readyButton = document.getElementById("readyButton");
    if (readyButton) {
        readyButton.style.display = "block";
    }
});

socket.on("updateGameModeSelection", (gameMode) => {
    document.getElementById("statusGameMode").innerText = `🎮 Spielmodus: ${gameMode}`;
});




function setReady() {
    if (!currentRoom) return;
    socket.emit("playerReady", { roomCode: currentRoom, playerId });
}

document.getElementById("readyButton").addEventListener("click", function () {
    socket.emit("playerReady", { roomCode: currentRoom, playerId });
});

socket.on("updateReadyStatus", (players) => {
    let readyStatusList = document.getElementById("readyStatus");
    readyStatusList.innerHTML = "";
    players.forEach(player => {
        let li = document.createElement("li");
        li.innerText = `${player.username}: ${player.isReady ? "✅ Bereit" : "⏳ Warten..."}`;
        readyStatusList.appendChild(li);
    });
});


// Event: Spiel kann starten
socket.on("gameCanStart", () => {
    document.getElementById("startGameBtn").style.display = "block";
});


socket.on("connect", () => {

    // Funktion zur Überprüfung, ob der Username im Local Storage ist
    function waitForUsername() {
        let username = localStorage.getItem("username");
        if (username) {
            clearInterval(checkUsernameInterval); // Beende das Intervall
            autoCreateRoom(username);
        }
    }

    // Falls der Username noch nicht im Local Storage ist, warte darauf
    if (!localStorage.getItem("username")) {
        
        let checkUsernameInterval = setInterval(waitForUsername, 500); // Alle 500ms prüfen
    } else {
        autoCreateRoom(localStorage.getItem("username"));
    }
});

// Funktion zur automatischen Raumerstellung mit Namen
function autoCreateRoom(username) {
    socket.emit("createRoom", username);
}



socket.on("roomCreated", (data) => {
    const token = localStorage.getItem("token"); // Token überprüfen

    if (!token) {
        console.warn("❌ Raum-Erstellung abgebrochen: Benutzer ist nicht eingeloggt.");
        return; // Beendet die Funktion, wenn kein Token vorhanden ist
    }

    // ✅ Benutzer ist eingeloggt → Raum-Erstellung erlauben
    currentRoom = data.roomCode;
    isHost = true; // Spieler ist der Host

    setTimeout(() => {
        let roomCodeElement = document.getElementById("roomCode");
        if (roomCodeElement) {
            roomCodeElement.innerText = `Raumcode: ${currentRoom}`;
        }

        let lobbyElement = document.getElementById("lobby");
        if (lobbyElement) {
            lobbyElement.style.display = "block";
        }

        let startGameBtn = document.getElementById("startGameBtn");
        if (startGameBtn) {
            startGameBtn.style.display = "block"; // Host sieht den Button
        }

    }, 100);
});


socket.on("updatePlayers", ({ players, host }) => {

    const playerList = document.getElementById("playerList");
    const statusText = document.getElementById("status");

    if (!playerList || !statusText) {
        console.error("❌ Fehler: `playerList` oder `status` nicht gefunden!");
        return;
    }

    // 🧹 Liste leeren
    playerList.innerHTML = "";

    // 🎮 **Host immer anzeigen**
    const hostUsername = host?.username || "Unbekannter Host";

    // 🕹️ Einzelspieler-Modus
    if (players.length === 1) {
        statusText.innerText = `🕹️ Einzelspieler-Modus (Host: ${hostUsername})`;

        const hostElement = document.createElement("li");
        hostElement.innerText = `${hostUsername}`;
        playerList.appendChild(hostElement);
        return;
    }

    // 🎮 Multiplayer-Modus → Host zuerst anzeigen
    statusText.innerText = `👥 Spieler im Raum: ${players.length} (Host: ${hostUsername})`;
    
    const hostElement = document.createElement("li");
    hostElement.innerText = `👑 ${hostUsername} (Host)`;
    playerList.appendChild(hostElement);

    // 🔄 Restliche Spieler (außer Host) hinzufügen
    players.forEach(player => {
        if (player.username !== hostUsername) {
            const playerElement = document.createElement("li");
            playerElement.innerText = `👤 ${player.username}`;
            playerList.appendChild(playerElement);
        }
    });
});



function joinGame() {
    let roomCode = document.getElementById("roomCodeInput").value.trim();
    let username = localStorage.getItem("username") || prompt("Bitte gib deinen Namen ein:");

    if (!roomCode || !username) {
        showNotification("❌ Bitte Raumcode und Namen eingeben!");
        return;
    }

    localStorage.setItem("username", username);
    socket.emit("joinRoom", { roomCode, username });
}


// Event: Erfolgreicher Beitritt
socket.on("roomJoined", (data) => {
    currentRoom = data.roomCode;

    if (data.isSingleplayer) {
        document.getElementById("status").innerText = "🕹️ Einzelspieler-Modus aktiviert!";
    } else {
        document.getElementById("status").innerText = `👥 Spieler im Raum: ${data.players.length}`;
        updatePlayers(data.players); // Falls Multiplayer, zeige Liste an
    }

    document.getElementById("dashboard").style.display = "none";
    document.getElementById("lobby").style.display = "block";
    document.getElementById("roomCode").innerText = `Raumcode: ${currentRoom}`;
});


function updatePlayers(players) {
    const playerList = document.getElementById("playerList");
    if (!playerList) {
        console.error("❌ Fehler: `playerList` nicht gefunden!");
        return;
    }

    // 🧹 Liste leeren
    playerList.innerHTML = "";

    players.forEach(player => {
        const playerElement = document.createElement("li");
        playerElement.innerText = player.username + (player.isHost ? " (Host)" : "");
        playerList.appendChild(playerElement);
    });
}


// Event: Fehler beim Beitreten
socket.on("error", (message) => {
    showNotification(message);
});




// Event: Fehler bei Raumbeitritt
socket.on("error", (message) => {
    showNotification(message);
});




// Event: Spielstart
socket.on("gameStarted", ({ questions }) => {
    document.getElementById("lobby").style.display = "none";
    document.getElementById("quizContainer").style.display = "block";
});

function endGame() {
    socket.emit("endGame", currentRoom);
}

socket.on("returnToLobby", () => {
    document.getElementById("quizContainer").style.display = "none";
    document.getElementById("lobby").style.display = "block";

    // Setze "Bereit"-Status zurück
    document.getElementById("readyButton").innerText = "Bereit";
});


// Event: Neue Frage anzeigen
socket.on("newQuestion", (question) => {
    document.getElementById("questionText").innerText = question.text;
    let optionsContainer = document.getElementById("answerOptions");
    optionsContainer.innerHTML = "";

    question.options.forEach((option, index) => {
        let btn = document.createElement("button");
        btn.innerText = option;
        btn.onclick = () => sendAnswer(question.id, index);
        optionsContainer.appendChild(btn);
    });
});

// Funktion: Antwort senden
function sendAnswer(questionId, answerIndex) {
    socket.emit("answer", { roomCode: currentRoom, questionId, answerIndex, playerId: socket.id });
}

// Event: Punkte aktualisieren
socket.on("updateScores", (scores) => {
    let scoreDisplay = document.getElementById("scoreDisplay");
    scoreDisplay.innerHTML = "🏆 Punktestand:<br>";
    for (let player in scores) {
        scoreDisplay.innerHTML += `${player}: ${scores[player]} Punkte<br>`;
    }
});

// Event: Spielende & Ergebnisse anzeigen
socket.on("gameOver", (finalScores) => {
    document.getElementById("quizContainer").style.display = "none";
    document.getElementById("finalScreen").style.display = "block";
    let finalScoreText = document.getElementById("finalScore");
    finalScoreText.innerHTML = "🏆 Endergebnis:<br>";

    Object.entries(finalScores)
        .sort((a, b) => b[1] - a[1])
        .forEach(([player, score]) => {
            finalScoreText.innerHTML += `${player}: ${score} Punkte<br>`;
        });
});