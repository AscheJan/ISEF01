// Globale Konstanten
const API_URL = "http://localhost:5000";
const socket = io(API_URL);

// HTML-Elemente referenzieren
const screens = {
    home: document.getElementById('home'),
    deckSelection: document.getElementById('deckSelection'),
    waitingRoom: document.getElementById('waitingRoom'),
    quiz: document.getElementById('quiz'),
    leaderboard: document.getElementById('leaderboardSection')
};

const usernameInput = document.getElementById('username');
const deckList = document.getElementById('deckList');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playerList = document.getElementById('playerList');
const startGameBtn = document.getElementById('startGameBtn');
const questionText = document.getElementById('question');
const optionsGrid = document.getElementById('options');
const nextQuestionBtn = document.getElementById('nextQuestion');
const finishGameBtn = document.getElementById('finishGame');
const leaderboardList = document.getElementById('leaderboardList');

// Spielstatus-Variablen
let roomCode = '';
let username = '';
let selectedDeck = '';
let currentQuestionIndex = 0;
let score = 0;
let questions = [];
let answerSelected = false;
let isHost = false;
let isReady = false;
let playersReady = {};

function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
        screen.style.opacity = 0;  // Animation starten
    });

    setTimeout(() => {
        screens[screenName].classList.add('active');
        screens[screenName].style.opacity = 1;  // Sichtbarkeit erhöhen
    }, 200);
}


// Decks laden aus Backend
async function loadDecks() {
    try {
        const response = await fetch('/api/decks');
        const decks = await response.json();
        deckList.innerHTML = decks.map(deck => `<option value="${deck._id}">${deck.name}</option>`).join('');
    } catch (error) {
        console.error('Fehler beim Laden der Decks:', error);
    }
}

// Weiter zur Deck-Auswahl
function selectDeck() {
    username = usernameInput.value.trim();
    if (!username) return showNotification('Bitte gib deinen Namen ein!');
    showScreen('deckSelection');
    loadDecks();
}

// Spiel erstellen
function createGame() {
    selectedDeck = deckList.value;
    if (!selectedDeck || selectedDeck === 'undefined') {
        showNotification('Bitte wähle ein Deck aus!');
        return;
    }

    isHost = true; // Markiere den aktuellen Benutzer als Host
    socket.emit('createRoom', { username, deckId: selectedDeck, isHost: true });
}





socket.on('roomCreated', ({ roomId, deckId, players }) => {
    roomCode = roomId;
    document.getElementById("roomCodeText").innerText = roomCode;
    roomCodeDisplay.style.display = 'block';

    updatePlayerList(players);
    loadDecksInRoom();
    showScreen('waitingRoom');

    setupReadyButton(); // Stellt den Button für den Host bereit
});



// Spiel beitreten
// 🚀 Öffnet das Raumcode-Modal
function joinExistingGame() {
    document.getElementById("roomCodeModal").style.display = "flex";
}

// ❌ Schließt das Modal
function closeRoomCodeModal() {
    document.getElementById("roomCodeModal").style.display = "none";
}

// ✅ Übermittelt den Raumcode
function submitRoomCode() {
    const code = document.getElementById("roomCodeInput").value.trim();
    if (!code) {
        showNotification("Bitte gib einen gültigen Raumcode ein!");
        return;
    }

    roomCode = code;  // Speichert den Raumcode
    socket.emit('joinRoom', { username, roomCode: code });

    closeRoomCodeModal(); // Schließt das Modal nach dem Beitritt
}



socket.on('roomJoined', ({ roomCode: joinedRoomCode, players, host }) => {
    roomCode = joinedRoomCode;  
    document.getElementById("roomCodeText").innerText = roomCode; // ✅ Setzt den Raumcode für Host & Gast
    roomCodeDisplay.style.display = 'block';

    // ✅ Zeigt den aktuellen Benutzernamen im Warteraum an
    document.getElementById("playerUsername").innerText = username;

    updatePlayerList(players);
    showScreen('waitingRoom');

    // ✅ Stelle sicher, dass Gäste den "Spiel starten"-Button nicht sehen
    const isHostPlayer = (username === host);
    document.getElementById("startGameBtn").style.display = isHostPlayer ? "block" : "none";

    setupReadyButton(); 
});


socket.on("playerReady", async ({ roomCode, username, isReady }) => {
    try {
        const game = await Game.findOneAndUpdate(
            { _id: roomCode, "players.username": username },
            { $set: { "players.$.isReady": isReady } },
            { new: true, runValidators: false }
        );

        if (!game) {
            console.error("[ERROR] Raum oder Spieler nicht gefunden:", roomCode, username);
            return socket.emit("errorMessage", "❌ Raum oder Spieler nicht gefunden.");
        }

        io.to(roomCode).emit("updateReadyStatus", game.players);
    } catch (error) {
        console.error(`[ERROR] Fehler beim Setzen des Bereit-Status: ${error.message}`);
    }
});
function updatePlayerList(players, host) {
    const playerList = document.getElementById("waitingPlayerList");
    if (!playerList) {
        console.error("[ERROR] Spieler-Liste nicht gefunden!");
        return;
    }

    playerList.innerHTML = ""; // 🛠 Nur die UI wird aktualisiert, keine Spieler entfernt

    players.forEach(player => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            <span>${player.username} ${player.isReady ? "✅" : "❌"} ${player.username === host ? "(Host)" : ""}</span>
            ${player.username === username ? `<button class="btn ${player.isReady ? "btn-danger" : "btn-secondary"}" onclick="toggleReady()" id="readyBtn">${player.isReady ? "❌ Nicht bereit" : "✅ Bereit"}</button>` : ""}
        `;
        playerList.appendChild(listItem);
    });

    // ✅ Host sieht den "Spiel starten"-Button nur, wenn alle bereit sind
    const allReady = players.every(player => player.isReady);
    if (username === host) {
        document.getElementById("startGameBtn").style.display = allReady ? "block" : "none";
    }
}

// 🎯 Wird aufgerufen, wenn sich der Bereitschaftsstatus eines Spielers ändert
socket.on("updateReadyStatus", (players) => {
    const host = players.find(p => p.username === username)?.host;
    updatePlayerList(players, host);
});



socket.on("updateReadyStatus", ({ players, host }) => {
    updatePlayerList(players, host); // ✅ Host wird jetzt mitgegeben

    const allReady = players.length > 0 && players.every(player => player.isReady);
    
    console.log(`[DEBUG] Alle Spieler bereit: ${allReady}, Host: ${host}`);

    // "Warten auf andere Spieler" Nachricht anzeigen/verbergen
    const readyMessage = document.getElementById("readyMessage");
    if (readyMessage) {
        readyMessage.style.display = allReady ? "none" : "block";
    }

    // ✅ "Bereit"-Button für ALLE sichtbar lassen, auch für den Host!
    const readyBtn = document.getElementById("readyBtn");
    if (readyBtn) {
        readyBtn.style.display = "block";  // Immer anzeigen!
    }

    // ✅ "Spiel starten"-Button nur für den Host sichtbar, wenn alle bereit sind
    document.getElementById("startGameBtn").style.display = (allReady && username === host) ? "block" : "none";
});




socket.on("roomJoined", ({ roomCode: joinedRoomCode, players, host }) => {
    console.log("[DEBUG] Spieler-Liste beim Beitritt:", players); // Debugging-Ausgabe

    roomCode = joinedRoomCode;  
    document.getElementById("roomCodeText").innerText = roomCode;
    roomCodeDisplay.style.display = 'block';

    updatePlayerList(players); // ✅ Aktualisieren der Liste

    const isHostPlayer = (username === host);
    document.getElementById("startGameBtn").style.display = "none";

    setupReadyButton(); 
});

socket.on("joinRoom", async ({ username, roomCode }) => {
    try {
        const game = await Game.findById(roomCode);
        if (!game) return socket.emit("errorMessage", "Raum nicht gefunden.");

        // 🛠 Spieler darf nur einmal hinzugefügt werden!
        const playerExists = game.players.some(player => player.username === username);
        if (!playerExists) {
            game.players.push({ username, score: 0, isReady: false, socketId: socket.id });
            await game.save();
        }

        socket.join(roomCode);
        io.to(roomCode).emit("updatePlayers", { players: game.players, host: game.host });  
        socket.emit("showWaitingRoom", { roomCode, players: game.players, host: game.host });

    } catch (error) {
        console.error(`[ERROR] Fehler beim Beitritt: ${error.message}`);
    }
});









socket.on('error', showNotification);

// "Bereit"-Button für Spieler setzen
function setupReadyButton() {
    const readyBtn = document.getElementById("readyBtn");
    if (!readyBtn) return console.error("[ERROR] readyBtn nicht gefunden!");

    readyBtn.innerText = '✅ Bereit';
    readyBtn.classList.add('btn', 'secondary');
    readyBtn.onclick = toggleReady;
}


function toggleReady() {
    if (!roomCode) {
        console.error("[ERROR] Kein gültiger Raumcode für Spieler bereit.");
        return;
    }

    isReady = !isReady;
    socket.emit('playerReady', { roomCode, username, isReady });

    const readyMessage = document.getElementById("readyMessage");

    if (!readyMessage) {
        console.error("[ERROR] Element 'readyMessage' nicht gefunden!");
        return;
    }

    readyMessage.innerText = isReady ? "Warten auf andere Spieler..." : "";
    readyMessage.style.display = isReady ? "block" : "none";
}


socket.on("showLeaderboard", ({ players, host }) => {
    console.log("[DEBUG] Leaderboard erhalten:", players, "Host:", host, "User:", username);

    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML = players.map(player => 
        `<li>${player.username}: ${player.score} Punkte</li>`
    ).join('');

    if (!username) {
        console.error("[ERROR] username ist nicht definiert!");
        return;
    }

    const isHost = (username === host);

    // Host sieht "Neues Deck wählen"
    const hostDeckSelection = document.getElementById("hostDeckSelection");
    if (hostDeckSelection) {
        hostDeckSelection.style.display = isHost ? "block" : "none";
        console.log(`[DEBUG] hostDeckSelection Sichtbarkeit: ${hostDeckSelection.style.display}`);
    } else {
        console.error("[ERROR] hostDeckSelection nicht gefunden!");
    }

    // Gäste sehen "Bereit"-Button
    const readyBtn = document.getElementById("readyBtn");
    if (readyBtn) {
        readyBtn.style.display = isHost ? "none" : "block";
        console.log(`[DEBUG] readyBtn Sichtbarkeit: ${readyBtn.style.display}`);
    } else {
        console.error("[ERROR] readyBtn nicht gefunden!");
    }

    showScreen('leaderboard');
});

function restartGame() {
    if (!isHost) {
        showNotification("❌ Nur der Host kann das Spiel neustarten!");
        return;
    }

    console.log("[DEBUG] Neustart-Button wurde gedrückt."); 

    // ✅ Backend informieren
    socket.emit("restartGame", { gameId: roomCode });

    // ✅ UI zurücksetzen
    showScreen('waitingRoom');
    document.getElementById("startGameBtn").style.display = "none"; // Erst nach Bereit-Status sichtbar

    // ✅ "Bereit"-Button für ALLE sicherstellen
    let readyBtn = document.getElementById("readyBtn");

    if (!readyBtn) {
        console.warn("[WARN] 'Bereit'-Button nicht gefunden, wird neu erstellt!");

        readyBtn = document.createElement("button");
        readyBtn.id = "readyBtn";
        readyBtn.className = "btn secondary";
        readyBtn.innerText = "✅ Bereit";
        readyBtn.onclick = toggleReady;

        const waitingRoom = document.getElementById("waitingRoom");
        if (waitingRoom) {
            waitingRoom.appendChild(readyBtn);
            console.log("[DEBUG] 'Bereit'-Button wurde neu hinzugefügt!");
        } else {
            console.error("[ERROR] 'waitingRoom' nicht gefunden!");
        }
    } else {
        readyBtn.style.display = "block"; 
        readyBtn.disabled = false;  // Falls deaktiviert, wieder aktivieren
        readyBtn.innerText = "✅ Bereit";
        console.log("[DEBUG] 'Bereit'-Button sichtbar gemacht.");
    }

    // ✅ „Warten auf andere Spieler“-Text anzeigen
    const readyMessage = document.getElementById("readyMessage");
    if (readyMessage) {
        readyMessage.innerText = "Bitte erneut auf 'Bereit' klicken!";
        readyMessage.style.display = "block";
    }

    // ✅ Antworten-Container leeren (falls Quiz schon gestartet war)
    optionsGrid.innerHTML = "";

    showNotification("🔄 Spiel wird neugestartet...");
}

// 🎯 Server sendet zurück, dass das Spiel neugestartet wurde
socket.on("gameRestarted", ({ gameId, deckId, players, host, questions }) => {
    console.log("[DEBUG] Spiel wurde neugestartet:", gameId, "Deck:", deckId, "Fragen:", questions.length);

    // ✅ Spielstatus-Variablen zurücksetzen
    roomCode = gameId;
    selectedDeck = deckId;
    currentQuestionIndex = 0;
    score = 0;
    answerSelected = false;
    
    // ✅ Neue Fragen setzen
    if (questions && questions.length > 0) {
        console.log("[DEBUG] Fragenliste aktualisiert!");
        fetchQuestions(deckId);
    } else {
        console.warn("[WARN] Keine neuen Fragen erhalten!");
    }

    // ✅ UI zurücksetzen
    showScreen('waitingRoom');
    updatePlayerList(players, host);

    // ✅ "Nächste Frage"-Button wieder sichtbar machen
    const nextQuestionBtn = document.getElementById("nextQuestion");
    if (nextQuestionBtn) {
        nextQuestionBtn.style.display = "block";  // ✅ Button sichtbar!
    } else {
        console.error("[ERROR] 'nextQuestion' Button nicht gefunden!");
    }

    // ✅ Sicherstellen, dass das Quiz nicht als „beendet“ angezeigt wird
    finishGameBtn.style.display = 'none';

    console.log("[DEBUG] Spiel erfolgreich neugestartet und UI aktualisiert.");
});






socket.on("deckChanged", ({ newDeckId, players }) => {
    console.log("[DEBUG] Neues Deck gewählt:", newDeckId);

    selectedDeck = newDeckId; // Speichert das neue Deck für das Spiel
    showScreen('waitingRoom'); // Bleibt im Warteraum

    updatePlayerList(players); // Aktualisiert die Spieler-Liste mit "nicht bereit"

    document.getElementById("readyMessage").innerText = "Bitte erneut auf 'Bereit' klicken!";
    document.getElementById("readyMessage").style.display = "block";

    startGameBtn.style.display = "none"; // Versteckt "Spiel starten", bis alle wieder bereit sind

    console.log("[DEBUG] Alle Spieler wurden auf 'nicht bereit' gesetzt.");
});



socket.on("allPlayersReady", ({ canStart }) => {
    console.log("[DEBUG] Event erhalten: 'allPlayersReady', canStart =", canStart);
    
    if (canStart && isHost) {
        startGameBtn.style.display = 'block';
        console.log("[DEBUG] 'Spiel starten'-Button wurde eingeblendet.");
    }
});






// Decks im Warteraum laden
async function loadDecksInRoom() {
    try {
        const response = await fetch('/api/decks');
        const decks = await response.json();
        document.getElementById("deckListInRoom").innerHTML = decks.map(deck => 
            `<option value="${deck._id}">${deck.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Fehler beim Laden der Decks:', error);
    }
}

// Spiel starten (nur Host)
function startMultiplayerGame() {
    if (!isHost) {
        showNotification("❌ Nur der Host kann das Spiel starten!");
        return;
    }

    const selectedDeck = document.getElementById("deckListInRoom").value;
    if (!selectedDeck) {
        showNotification('Bitte wähle ein Deck aus!');
        return;
    }
    
    socket.emit('startGame', { roomCode, deckId: selectedDeck });
}


// Wenn das Spiel gestartet wird, startet es für alle Spieler
socket.on('gameStarted', ({ gameId, deckId }) => {
    console.log("[DEBUG] Spiel gestartet mit ID:", gameId, "und Deck:", deckId);

    roomCode = gameId;
    selectedDeck = deckId;

    const readyBtn = document.getElementById("readyBtn"); 
    if (readyBtn) {
        readyBtn.remove(); // Entferne den "Bereit"-Button
    }

    // ✅ "Nächste Frage"-Button sichtbar machen
    const nextQuestionBtn = document.getElementById("nextQuestion");
    if (nextQuestionBtn) {
        nextQuestionBtn.style.display = "block";
    }

    startGame(deckId);
});



// Spiel starten
function startGame(deckId) {
    if (!deckId || deckId === 'undefined') return showNotification("Fehler: Kein Deck gewählt!");
    showScreen('quiz');
    fetchQuestions(deckId);
}

// Fragen abrufen
async function fetchQuestions(deckId) {
    if (!deckId || deckId === 'undefined') return console.error("Fehler: Kein deckId übergeben!");
    try {
        const response = await fetch(`/api/questions/${deckId}`);
        if (!response.ok) throw new Error(`Fehler: ${response.status} ${response.statusText}`);
        questions = await response.json();
        currentQuestionIndex = 0;
        score = 0;
        displayQuestion();
    } catch (error) {
        console.error('Fehler beim Abrufen der Fragen:', error);
    }
}

// Frage anzeigen
function displayQuestion() {
    console.log(`[DEBUG] Zeige Frage ${currentQuestionIndex + 1} von ${questions.length}`);

    // ✅ Falls das Spiel neugestartet wurde, aber Fragen nicht geladen sind, erneute Anfrage stellen
    if (questions.length === 0) {
        console.warn("[WARN] Keine Fragen geladen, lade neu...");
        fetchQuestions(selectedDeck);
        return;
    }

    // ✅ Wenn es noch Fragen gibt, zeige sie an
    if (currentQuestionIndex < questions.length) {
        answerSelected = false;

        const question = questions[currentQuestionIndex];
        questionText.innerText = question.question;

        optionsGrid.innerHTML = question.options.map((option, index) => 
            `<button class="option-btn" onclick="selectAnswer(${index})">${option}</button>`
        ).join('');

        finishGameBtn.style.display = 'none'; // 🚀 Spielabschließen-Button verstecken
    } else {
        console.warn("[WARN] Alle Fragen beantwortet!"); 
        finishGameBtn.style.display = 'block'; 
        nextQuestionBtn.style.display = 'none';
    }
}



// Antwort wählen
function selectAnswer(selectedIndex) {
    if (answerSelected) return;
    answerSelected = true;
    console.log(`[DEBUG] Sende Antwort: Index ${selectedIndex}, Spiel-ID ${roomCode}`);

    // Alle Antwort-Buttons zurücksetzen
    document.querySelectorAll(".option-btn").forEach(btn => btn.classList.remove("selected"));

    // Die geklickte Antwort markieren
    document.querySelectorAll(".option-btn")[selectedIndex].classList.add("selected");

    // Score nur erhöhen, wenn die Antwort korrekt ist
    if (selectedIndex === questions[currentQuestionIndex].correctIndex) {
        score++;
    }

    // Antwort an Server senden
    socket.emit("submitAnswer", { username, roomCode, answerIndex }); 

}


// Nächste Frage anzeigen
function nextQuestion() {
    currentQuestionIndex++;
    displayQuestion();
}

// Spiel abschließen
function finishGame() {
    showScreen('leaderboard');
    leaderboardList.innerHTML = `<li>${username}: ${score} Punkte</li>`;
}

// Zurück zur Deck-Auswahl
function goToDeckSelection() {
    showScreen('deckSelection');
    loadDecks();
}

// Spiel neustarten
function restartGame() {
    if (!isHost) {
        showNotification("❌ Nur der Host kann das Spiel neustarten!");
        return;
    }

    console.log("[DEBUG] Neustart-Button wurde gedrückt."); // 🛠 Prüfen, ob Button funktioniert
    socket.emit("restartGame", { gameId: roomCode });

    showNotification("🔄 Spiel wird neugestartet...");
}


function openDeckSelection() {
    showScreen('waitingRoom'); // Bleibt im Warteraum
    document.getElementById("hostDeckSelection").style.display = "block"; // Zeigt das Deck-Auswahl-Feld
}


socket.on("deckChanged", ({ newDeckId }) => {
    console.log("[DEBUG] Neues Deck gewählt:", newDeckId);

    selectedDeck = newDeckId; // Speichert das neue Deck für das Spiel
    showScreen('waitingRoom'); // Bleibt im Warteraum und geht NICHT zurück zum Startbildschirm

    document.getElementById("readyMessage").innerText = "Bitte erneut auf 'Bereit' klicken!";
    document.getElementById("readyMessage").style.display = "block";
    
    startGameBtn.style.display = "none"; // Versteckt "Spiel starten", bis alle wieder bereit sind
});


function changeDeck() {
    const newDeckId = document.getElementById("deckListInRoom").value;
    if (!newDeckId) {
        showNotification("Bitte wähle ein neues Deck!");
        return;
    }

    socket.emit("changeDeck", { roomCode, newDeckId });
}

socket.on("showWaitingRoom", ({ roomCode, players, host }) => {
    console.log(`[DEBUG] Beigetreten in Raum ${roomCode}`);
    
    roomCode = roomCode; // Speichert die Spiel-ID
    updatePlayerList(players); // Zeigt Spieler-Liste an

    // Zeigt den Warteraum an
    showScreen("waitingRoom");

    // Unterscheide zwischen Host & Gast
    const isHost = username === host;
    document.getElementById("hostDeckSelection").style.display = isHost ? "block" : "none"; // Nur Host sieht Deck-Auswahl
    document.getElementById("readyBtn").style.display = "block"; // Jeder sieht "Bereit"-Button

    console.log(`[DEBUG] Host: ${host}, Aktueller Spieler: ${username}, Ist Host? ${isHost}`);
});

// Funktion zum Anzeigen der Benachrichtigung
function showNotification(message, type = "success") {
    const modal = document.getElementById("notificationModal");
    const messageElement = document.getElementById("notificationMessage");

    messageElement.innerText = message;
    modal.className = `notification-modal ${type}`; // Setzt Erfolgs- oder Fehlerklasse

    modal.style.display = "block"; // Modal sichtbar machen
}

// Funktion zum Schließen der Benachrichtigung
function closeNotification() {
    document.getElementById("notificationModal").style.display = "none";
}


document.getElementById("restartGameBtn").addEventListener("click", () => {
    if (!isHost) {
        showNotification("❌ Nur der Host kann das Spiel neustarten!");
        return;
    }

    console.log("[DEBUG] Neustart-Button wurde gedrückt.");
    socket.emit("restartGame", { gameId: roomCode });

    showNotification("🔄 Spiel wird neugestartet...");
});


document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("roomCodeModal").style.display = "none";
    const readyMessage = document.getElementById("readyMessage");
});
