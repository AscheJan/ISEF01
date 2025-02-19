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

    // Spieler-Liste vorab leeren, um doppelte Einträge zu vermeiden
    playerList.innerHTML = "";

    const addedPlayers = new Set(); // Set zur Speicherung von bereits hinzugefügten Spielern

    players.forEach(player => {
        if (!addedPlayers.has(player.username)) {
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <span>${player.username} ${player.isReady ? "✅" : "❌"} ${player.username === host ? "(Host)" : ""}</span>
                ${player.username === username ? `<button class="btn ${player.isReady ? "btn-danger" : "btn-secondary"}" onclick="toggleReady()" id="readyBtn">${player.isReady ? "❌ Nicht bereit" : "✅ Bereit"}</button>` : ""}
            `;
            playerList.appendChild(listItem);
            addedPlayers.add(player.username); // Spieler zur Set-Liste hinzufügen
        }
    });

    // Bereit-Status prüfen und "Spiel starten"-Button nur für den Host anzeigen
    const allReady = players.every(player => player.isReady);
    if (username === host) {
        document.getElementById("startGameBtn").style.display = allReady ? "block" : "none";
    }
}




// 🎯 Wird aufgerufen, wenn sich der Bereitschaftsstatus eines Spielers ändert
socket.on("updateReadyStatus", ({ players }) => {
    updatePlayerList(players);

    const allReady = players.length > 0 && players.every(player => player.isReady);
    
    console.log(`[DEBUG] Alle Spieler bereit: ${allReady}`);

    // "Warten auf andere Spieler" Nachricht anzeigen/verbergen
    const readyMessage = document.getElementById("readyMessage");
    if (readyMessage) {
        readyMessage.style.display = allReady ? "none" : "block";
    }

    // ✅ Host darf das Deck nur wechseln, wenn nicht alle bereit sind
    const hostDeckSelection = document.getElementById("hostDeckSelection");
    if (hostDeckSelection) {
        hostDeckSelection.style.display = allReady ? "none" : "block";
    }

    // ✅ "Spiel starten"-Button nur für den Host sichtbar, wenn alle bereit sind
    document.getElementById("startGameBtn").style.display = (allReady && isHost) ? "block" : "none";
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
        console.error("[ERROR] Kein gültiger Raumcode!");
        return;
    }

    isReady = !isReady;
    socket.emit('playerReady', { roomCode, username, isReady });

    const readyBtn = document.getElementById("readyBtn");
    if (readyBtn) {
        readyBtn.innerText = isReady ? "❌ Nicht bereit" : "✅ Bereit";
        readyBtn.classList.toggle("btn-danger", isReady);
        readyBtn.classList.toggle("btn-secondary", !isReady);
    }

    showNotification(isReady ? "success" : "error", isReady ? "Du bist bereit! ✅" : "Du bist nicht mehr bereit! ❌");

}

socket.on("showLeaderboard", ({ players, host }) => {
    console.log("[DEBUG] Leaderboard erhalten:", players, "Host:", host, "User:", username);

    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML = ""; // Leere das Leaderboard, bevor neue Spieler hinzugefügt werden

    const addedPlayers = new Set(); // Set zur Speicherung von bereits hinzugefügten Spielern

    // Spieler nach Punktzahl sortieren (von höchster zu niedrigster Punktzahl)
    const sortedPlayers = players.sort((a, b) => b.score - a.score);

    // Durchlaufe alle Spieler und füge sie nur einmal hinzu
    sortedPlayers.forEach(player => {
        if (!addedPlayers.has(player.username)) {
            const listItem = document.createElement("li");
            listItem.innerHTML = `${player.username}: ${player.score} Punkte`;
            leaderboardList.appendChild(listItem);
            addedPlayers.add(player.username); // Spieler zur Set-Liste hinzufügen
        }
    });

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

    // Leaderboard anzeigen
    showScreen('leaderboard');
});




function restartGame() {
    if (!isHost) {
        showNotification("error", "❌ Nur der Host kann das Spiel neustarten!");
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

    showNotification("info", "🔄 Spiel wird neugestartet...");

}

// 🎯 Server sendet zurück, dass das Spiel neugestartet wurde
socket.on("gameRestarted", ({ gameId, deckId, players, host }) => {
    console.log("[DEBUG] Spiel wurde neugestartet:", gameId, "Deck:", deckId, "Spieler:", players.length);

    if (!players || players.length === 0) {
        console.error("[ERROR] Keine Spieler-Daten erhalten!");
        return showNotification("error", "❌ Spieler-Daten fehlen!");
    }

    // Spielvariablen zurücksetzen
    roomCode = gameId;
    selectedDeck = deckId;
    currentQuestionIndex = 0;
    score = 0;
    answerSelected = false;

    updatePlayerList(players, host);
    showScreen('waitingRoom');

    console.log("[DEBUG] UI wurde aktualisiert.");
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
    socket.emit("submitAnswer", { username, roomCode, answerIndex: selectedIndex }); // Verwende `selectedIndex` statt `answerIndex`
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
        showNotification("error", "❌ Nur der Host kann das Spiel neustarten!");
        return;
    }

    console.log("[DEBUG] Neustart-Button wurde gedrückt. Sende Event an Server mit gameId:", roomCode);

    socket.emit("restartGame", { gameId: roomCode });

    showNotification("info", "🔄 Spiel wird neugestartet...");
}


function openDeckSelection() {
    if (!isHost) {
        showNotification("❌ Nur der Host kann das Deck wechseln!");
        return;
    }

    console.log("[DEBUG] Deck-Auswahl geöffnet.");

    // 📌 Deck-Auswahl anzeigen
    document.getElementById("hostDeckSelection").style.display = "block"; 

    // 📌 Lade aktuelle Decks
    loadDecksInRoom();
}


socket.on("deckChanged", ({ newDeckId, players }) => {
    console.log(`[DEBUG] Neues Deck gewählt: ${newDeckId}`);

    selectedDeck = newDeckId;  // Speichert das neue Deck

    // ✅ Bleibt im Warteraum
    showScreen('waitingRoom');

    // ✅ Spieler-Liste aktualisieren
    updatePlayerList(players);

    // ✅ Bereit-Status zurücksetzen
    document.getElementById("readyMessage").innerText = "Bitte erneut auf 'Bereit' klicken!";
    document.getElementById("readyMessage").style.display = "block";

    // ✅ "Spiel starten" wird erst wieder aktiv, wenn alle bereit sind
    startGameBtn.style.display = "none";

    console.log("[DEBUG] Alle Spieler wurden auf 'nicht bereit' gesetzt.");
});


function changeDeck() {
    if (!isHost) {
        showNotification("error", "Nur der Host kann das Deck wechseln!");
        return;
    }

    const newDeckId = document.getElementById("deckListInRoom").value;
    if (!newDeckId) {
        showNotification("Bitte wähle ein neues Deck!");
        return;
    }

    console.log(`[DEBUG] Deck-Wechsel angefordert: ${newDeckId}`);

    // ✅ Sende den Deck-Wechsel an den Server
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
function showNotification(type, message) {
    // ✅ Stelle sicher, dass der Typ eine gültige Klasse ist
    const validTypes = ["success", "error", "info", "warning"];
    if (!validTypes.includes(type)) {
        console.warn(`[WARN] Ungültiger Typ für Benachrichtigung: ${type}. Standardwert 'info' wird verwendet.`);
        type = "info"; // Fallback für ungültige Typen
    }

    // 🛠 Erstelle das Benachrichtigungs-Element
    const notification = document.createElement("div");
    notification.classList.add("notification-modal", "show-notification", type); // ✅ Keine Leerzeichen im Klassennamen!

    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === "success" ? "✅" : "❌"}</span>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(notification);

    // ✅ Schließen-Button hinzufügen
    notification.querySelector(".notification-close").addEventListener("click", () => {
        hideNotification(notification);
    });

    // ✅ Automatisches Ausblenden nach 5 Sekunden
    setTimeout(() => {
        hideNotification(notification);
    }, 5000);
}


// Funktion zum Verstecken der Benachrichtigung
function hideNotification(notification) {
    notification.classList.remove("show-notification");
    setTimeout(() => {
        notification.remove();
    }, 300);
}

// Beispielaufruf für eine Benachrichtigung
showNotification("success", "Deine Änderungen wurden gespeichert!");



// Leaderboard in Echtzeit aktualisieren
socket.on("updateLeaderboard", (players) => {
    updateLeaderboardUI(players);
});

// Leaderboard in Echtzeit aktualisieren
socket.on("updateLeaderboard", (players) => {
    updateLeaderboardUI(players);
});

// Leaderboard-Daten in HTML aktualisieren
function updateLeaderboardUI(players) {
    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML = ""; // Zurücksetzen

    // Spieler nach Punktzahl sortieren (absteigend: höchster Punktestand zuerst)
    players.sort((a, b) => b.score - a.score);

    players.forEach(player => {
        const listItem = document.createElement("li");
        listItem.textContent = `${player.username}: ${player.score} Punkte`;
        leaderboardList.appendChild(listItem);
    });
}


async function fetchLeaderboard(gameId) {
    try {
        const response = await fetch(`/leaderboard/${gameId}`);

        if (!response.ok) {
            throw new Error(`Fehler: ${response.status} ${response.statusText}`);
        }

        const leaderboard = await response.json();
        updateLeaderboardUI(leaderboard);
    } catch (error) {
        console.error("Fehler beim Laden des Leaderboards:", error.message);
    }
}



// **Automatische Backup-Aktualisierung**
setInterval(() => {
    if (roomCode) {
        fetchLeaderboard(roomCode);
    }
}, 5000);


// **Score-Update senden**
function updatePlayerScore(newScore) {
    const gameId = getCurrentGameId();  // Hole die aktuelle Spiel-ID
    if (!gameId || !username) {
        console.error("Fehler: Spiel-ID oder Benutzername nicht definiert!");
        return;
    }

    fetch(`${API_URL}/api/games/updateScore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, username, score: newScore })
    })
    .catch(error => console.error("Fehler beim Aktualisieren des Scores:", error));
}


function getCurrentGameId() {
    return roomCode; // Die aktuelle Spiel-ID ist in `roomCode` gespeichert
}

async function loadLeaderboard(gameId) {
    if (!gameId) {
        console.error("Fehler: Keine Spiel-ID übergeben.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/leaderboard/${gameId}`);
        const leaderboard = await response.json();

        const leaderboardList = document.getElementById("leaderboardList");
        leaderboardList.innerHTML = ""; // Liste zurücksetzen

        leaderboard.forEach(player => {
            const li = document.createElement("li");
            li.textContent = `${player.username}: ${player.score} Punkte`;
            leaderboardList.appendChild(li);
        });
    } catch (error) {
        console.error("Fehler beim Laden des Leaderboards:", error);
    }
}


// Leaderboard nach Spielende laden
document.getElementById("finishGame").addEventListener("click", () => {
    const gameId = getCurrentGameId(); // Funktion muss noch implementiert werden
    loadLeaderboard(gameId);
});


document.getElementById("restartGameBtn").addEventListener("click", () => {
    if (!isHost) {
        showNotification("error", "Nur der Host kann das Spiel neustarten!");
        return;
    }

    console.log("[DEBUG] Neustart-Button wurde gedrückt.");
    socket.emit("restartGame", { gameId: roomCode });

    showNotification("info", "🔄 Spiel wird neugestartet...");

});

function updateReadyMessage(players) {
    const readyMessage = document.getElementById("readyMessage");

    if (!readyMessage) return;

    // 🔥 Prüfe, ob alle bereit sind
    const allReady = players.length > 0 && players.every(player => player.isReady);

    // ✅ Standardmäßig sichtbar, nur verstecken wenn ALLE bereit sind
    if (allReady) {
        readyMessage.classList.add("hidden"); // Verstecken
    } else {
        readyMessage.classList.remove("hidden"); // Zeigen
    }
}




socket.off("updatePlayers"); // 🛠 Entfernt doppelte Listener
socket.on("updatePlayers", ({ players, host }) => {
    updatePlayerList(players, host);
});

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("roomCodeModal").style.display = "none";
    const readyMessage = document.getElementById("readyMessage");
});
