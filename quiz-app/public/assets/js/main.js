document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 DOM vollständig geladen.");
    
    initializeApp();

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
    countdownValue: 5
};

// === Deklariere submitReportButton gleich hier, nachdem der DOM geladen ist ===
const submitReportButton = document.getElementById("submitReport");

// Funktion: handleDeckChange
function handleDeckChange(event) {
    gameState.selectedDeck = event.target.value;
    console.log(`📌 Deck geändert: ${gameState.selectedDeck}`);
    
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




// Beispiel für submitReport (falls noch nicht definiert)
async function submitReport() {
    const reason = document.getElementById("reportReasonInput")?.value.trim();
    if (!reason) {
        showNotification("⚠️ Bitte gib einen Grund für die Meldung an!");
        return;
    }
    // Hier kannst du den Report-API-Call einbauen...
    try {
        const response = await fetch("/api/admin/report-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason })
        });
        const data = await response.json();
        console.log("📥 Antwort vom Server:", data);
        if (!response.ok) {
            showNotification(`❌ Fehler: ${data.message}`);
            return;
        }
        showNotification("✅ Frage wurde gemeldet!");
    } catch (error) {
        console.error("❌ Fehler beim Melden der Frage:", error);
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
        console.log(`👤 Eingeloggt als: ${username}`);
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


// ✅ **Deck-Handling**
async function loadDeckOptions() {
    console.log("🔄 Lade Decks aus API...");
    const token = localStorage.getItem('token');
    if (!token) return showNotification("⚠️ Bitte melde dich an.");

    try {
        const response = await fetch('/api/admin/decks', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Fehler beim Laden der Decks.");

        const data = await response.json();
        const selectDeckLobby = document.querySelector('#lobby #selectDeck');
        const selectDeckAdmin = document.querySelector('#adminModal #selectDeck');

        [selectDeckLobby, selectDeckAdmin].forEach(select => {
            if (!select) return;
            select.innerHTML = '<option value="">-- Deck auswählen --</option>';
            data.decks.forEach(deck => {
                const option = document.createElement('option');
                option.value = deck._id;
                option.innerText = deck.name;
                select.appendChild(option);
            });
        });

        console.log("✅ Decks erfolgreich geladen.");
    } catch (error) {
        console.error('❌ Fehler beim Laden der Decks:', error);
    }
}




// ✅ **Fragen eines Decks abrufen**
async function loadDeckQuestions(deckId) {
    console.log(`📥 Lade Fragen für Deck: ${deckId}`);
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


// ✅ **Fragen in UI anzeigen**
function displayQuestion() {
    const questionContainer = document.getElementById("question-container");
    if (!questionContainer) {
        console.error("❌ Fehler: Element mit ID 'question-container' nicht gefunden!");
        return;
    }

    if (gameState.questionSet.length === 0) {
        questionContainer.innerHTML = "<p>⚠️ Keine Fragen verfügbar.</p>";
        return;
    }

    // Beispiel für die Anzeige der ersten Frage
    const firstQuestion = gameState.questionSet[0];
    questionContainer.innerHTML = `<h2>${firstQuestion.questionText}</h2>`;
}


// ✅ **Spielmodus wählen**
function selectGameMode(mode) {
    gameState.selectedGameMode = mode;

    // Markiere den ausgewählten Spielmodus visuell
    document.querySelectorAll("#gameModeSelection button").forEach(btn => btn.classList.remove("selected"));
    document.querySelector(`#gameModeSelection button[data-mode='${mode}']`)?.classList.add("selected");

    updateReadyButtonState(); // Überprüft, ob der "Bereit"-Button sichtbar sein sollte
}



// ✅ **"Bereit"-Button Status aktualisieren**
function updateReadyButtonState() {
    const readyButton = document.getElementById("readyButton");
    const statusText = document.getElementById("status");

    if (gameState.selectedDeck && gameState.selectedGameMode) {
        readyButton.style.display = "block";
        statusText.innerText = "Drücke 'Bereit', um das Spiel zu starten!";
    } else {
        readyButton.style.display = "none";
        statusText.innerText = "Bitte wähle ein Deck und einen Spielmodus.";
    }
}



// ✅ **Spiel starten**
async function startQuiz() {
    console.log("🚀 Quiz wird gestartet...");

    if (!gameState.selectedDeck) {
        showNotification("⚠️ Kein Deck ausgewählt. Bitte wähle zuerst ein Deck!");
        return;
    }

    document.getElementById("lobby").style.display = "none";
    document.getElementById("quizContainer").style.display = "block";

    gameState.score = 0;
    gameState.currentQuestionIndex = 0;
    gameState.questionSet = []; // Setze Fragen zurück

    document.getElementById("scoreDisplay").innerText = `🏆 Punktestand: ${gameState.score}`;

    // 🔄 Fragen für das gewählte Deck abrufen und anzeigen
    await loadDeckQuestions(gameState.selectedDeck);
}


// ✅ **Frage anzeigen**
function displayQuestion() {
    if (gameState.currentQuestionIndex >= gameState.questionSet.length) {
        endQuiz();
        return;
    }

    const currentQuestion = gameState.questionSet[gameState.currentQuestionIndex];
    document.getElementById("questionText").innerText = currentQuestion.questionText;
    document.getElementById("answerOptions").innerHTML = "";

    currentQuestion.options.forEach((option, index) => {
        const btn = document.createElement("button");
        btn.innerText = option;
        btn.onclick = () => checkAnswer(index, currentQuestion.correctOptionIndex);
        document.getElementById("answerOptions").appendChild(btn);
    });
}


async function saveHighscore(deckId, score) {
    const userId = localStorage.getItem("username"); // Verwende die tatsächliche `userId`, nicht `username`
    const username = localStorage.getItem("username") || "Anonym"; // Username ist weiterhin optional

    if (!userId || !deckId || score === undefined) {
        console.error("❌ Fehlende Daten für Highscore-Speicherung:", { userId, deckId, score });
        return;
    }

    console.log("📤 Highscore-Daten senden:", { userId, username, deckId, score });

    try {
        const response = await fetch("http://localhost:5000/api/scores/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, username, deckId, score })
        });

        if (!response.ok) {
            throw new Error(`❌ Fehler: ${response.status} - ${await response.text()}`);
        }

        console.log("✅ Highscore gespeichert!");

    } catch (error) {
        console.error("❌ Fehler beim Speichern des Highscores:", error);
    }
}







// ✅ **Quiz beenden**
async function endQuiz() {
    console.log("🏁 Quiz beendet!");

    const username = localStorage.getItem("username");  // `username` ist jetzt der `userId`
    const userId = username;  // userId wird jetzt vom `username` gesetzt
    const deckId = gameState.selectedDeck;
    const score = gameState.score;

    console.log("📤 Highscore wird gespeichert für:", { userId, username, deckId, score });

    if (!userId || !deckId || score === undefined) {
        console.error("❌ Fehlende Daten für Highscore-Speicherung:", { userId, deckId, score });
        return;
    }

    // Speichern des Highscores
    await saveHighscore(deckId, score);

    // ✅ Zeige das Endscreen-Element an
    document.getElementById("quizContainer").style.display = "none"; // Quiz ausblenden
    document.getElementById("finalScreen").style.display = "block"; // Endscreen anzeigen

    // ✅ Punkteanzeige aktualisieren
    document.getElementById("finalScore").innerText = `🏆 Dein Score: ${score}`;

    // 📊 Leaderboard für das aktuelle Deck laden
    await loadLeaderboard(deckId);
}






// ✅ **Benutzer Logout**
function logout() {
    console.log("🔴 Nutzer wird abgemeldet...");
    localStorage.removeItem('token');
    window.location.href = "/login.html";
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

async function loadDeckOptions() {
    console.log("🔄 Lade Decks aus API...");
    const decks = await fetchDecks();
    const selectDeckLobby = document.querySelector('#lobby #selectDeck');
    const selectDeckAdmin = document.querySelector('#adminModal #selectDeck');

    [selectDeckLobby, selectDeckAdmin].forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- Deck auswählen --</option>';
        decks.forEach(deck => {
            const option = document.createElement('option');
            option.value = deck._id;
            option.innerText = deck.name;
            select.appendChild(option);
        });
    });

    console.log("✅ Decks erfolgreich geladen.");
}

    //----------------------------------------------------------------

        


        function startCountdown() {
            let timeLeft = gameState.countdownValue;
            const statusText = document.getElementById("status");
        
            if (!statusText) {
                console.error("❌ Fehler: `statusText` Element nicht gefunden!");
                return;
            }
        
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
        
        // 🛑 **Countdown abbrechen**
        function stopCountdown() {
            clearInterval(gameState.countdownTimer);
        }
    
    
        // ✅ **Antwort prüfen**
        function checkAnswer(selectedIndex, correctIndex) {
            if (gameState.timer) {
                clearTimeout(gameState.timer); // ✅ Verhindert "ReferenceError"
            }
        
            if (selectedIndex === correctIndex) {
                gameState.score++;
                document.getElementById("scoreDisplay").innerText = `🏆 Punktestand: ${gameState.score}`;
            }
        
            gameState.currentQuestionIndex++;
            displayQuestion();
        }
        
    
        // ⏳ **Time Attack Modus**
        function startTimeAttackTimer() {
            let timeLeft = 5;
            statusText.innerText = `⏳ Zeit: ${timeLeft}s`;
    
            timer = setInterval(() => {
                timeLeft--;
                statusText.innerText = `⏳ Zeit: ${timeLeft}s`;
    
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    currentQuestionIndex++;
                    displayQuestion();
                }
            }, 1000);
        }
    

    // 📊 Leaderboard für das aktuelle Deck laden
    async function loadLeaderboard(deckId) {
        console.log(`📊 Lade Leaderboard für Deck: ${deckId}`);

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


        
    
        // 🛑 **Frage melden Modal öffnen**
        function openReportModal() {
            reportModal.style.display = "block";
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
        console.log('Gemeldete Fragen:', data);
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
            console.log("User-Rolle geladen:", user.role);
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
  function register() {
    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;
    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Registrierung erfolgreich') {
            showNotification('Registrierung erfolgreich! Bitte melde dich an.');
            showLogin();
        } else {
            document.getElementById('registerError').innerText = data.message;
        }
    });
  }
  function showRegister() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('register').style.display = 'block';
  }

  async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        return showError("⚠️ Bitte Benutzername und Passwort eingeben.");
    }

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login fehlgeschlagen.");
        }

        // 🔐 `userId` speichern, wenn vorhanden
        if (data.userId) {
            localStorage.setItem("userId", data.userId);
        } else {
            console.warn("⚠️ userId fehlt in der Server-Antwort!");
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username || username);

        console.log("✅ Login erfolgreich! Benutzer:", username, "UserID:", data.userId);
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
    console.log("🔴 Nutzer wird abgemeldet...");
    localStorage.removeItem('token'); // 🛑 Token löschen
    localStorage.removeItem('role');  // 🔄 Falls Rolle gespeichert wurde, ebenfalls entfernen
    window.location.href = "/login.html"; // 🔄 Sofortige Weiterleitung zur Login-Seite
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


document.getElementById("selectDeck").addEventListener("change", function () {
    const selectedDeck = this.value;
    if (selectedDeck) {
        loadDeckQuestions(selectedDeck);
    }
});




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
        console.log("🔄 Lade Decks für Admin-Panel...");
        await loadDecks();
        console.log("✅ Decks erfolgreich geladen.");
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
  
  // Decks laden und anzeigen
  async function loadDecks() {
    console.log("🔄 Lade Decks aus der API...");
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
        console.log("🟢 API-Antwort erhalten:", data);
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
            deleteButton.innerText = "🗑 Löschen";
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
        console.log("✅ Decks erfolgreich in die Liste und das Dropdown eingefügt.");
    } catch (error) {
        console.error('❌ Fehler beim Laden der Decks:', error);
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
    console.log(`📥 Lade Fragen für Deck: ${deckId}`);

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification("⚠️ Nicht angemeldet! Bitte melde dich an.", "warning");
        window.location.href = "/login";
        return;
    }

    const questionList = document.getElementById('questionList');
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
            editButton.innerHTML = "✏️ Bearbeiten";
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => 
                openEditQuestionModal(question._id, question.questionText, question.options, question.correctOptionIndex)
            );

            // 🗑 Löschen-Button (falls benötigt)
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = "🗑 Löschen";
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

async function addQuestion() {
    console.log("🔄 Versuche, eine neue Frage hinzuzufügen...");

    // 🛠 Stelle sicher, dass das Modal existiert
    const adminModal = document.getElementById('adminModal');
    if (!adminModal) {
        console.error("❌ Fehler: Admin-Modal nicht gefunden!");
        showNotification("❌ Fehler: Das Admin-Panel konnte nicht gefunden werden.", "error");
        return;
    }

    // 🛠 Sicherstellen, dass `selectDeck` existiert
    const selectDeck = adminModal.querySelector('#selectDeck');
    if (!selectDeck) {
        console.error("❌ Fehler: `selectDeck` nicht gefunden!");
        showNotification("⚠️ Fehler: Das Deck-Auswahlfeld existiert nicht.", "error");
        return;
    }

    // ✅ Stelle sicher, dass eine Option existiert
    const selectedOption = selectDeck.options[selectDeck.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        showNotification('⚠️ Bitte wähle ein Deck aus.', "warning");
        selectDeck.style.border = "2px solid red";
        return;
    }
    selectDeck.style.border = "";

    const quizDeckId = selectedOption.value.trim();

    // 🛠 Sichere Abfrage der Input-Felder
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

    // 📝 Werte abrufen
    const questionText = questionTextElement.value?.trim() || "";
    const options = [
        option1Element.value?.trim() || "",
        option2Element.value?.trim() || "",
        option3Element.value?.trim() || "",
        option4Element.value?.trim() || ""
    ];
    const correctOptionIndex = parseInt(correctOptionElement.value, 10);

    // ✅ Validierung
    if (!questionText || options.some(opt => !opt)) {
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

    // 🚀 API-Anfrage senden
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
        await loadDeckQuestionsAndDisplay(quizDeckId);

        // Felder nach erfolgreicher Erstellung leeren
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
  // Lädt alle gemeldeten Fragen
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

        const fragment = document.createDocumentFragment();
        data.forEach(report => {
            const listItem = document.createElement('div');
            listItem.classList.add('reported-question-item');

            const deckName = document.createElement('p');
            deckName.innerHTML = `<strong>Deck:</strong> ${report.quizDeckId?.name || 'Unbekannt'}`;

            const questionText = document.createElement('p');
            questionText.innerHTML = `<strong>Frage:</strong> ${report.questionId?.questionText || 'Unbekannt'}`;

            const reportedBy = document.createElement('p');
            reportedBy.innerHTML = `<strong>Gemeldet von:</strong> ${report.reportedBy?.username || 'Unbekannt'}`;

            const reason = document.createElement('p');
            reason.innerHTML = `<strong>Grund:</strong> ${report.reason}`;

            const editButton = document.createElement('button');
            editButton.textContent = 'Bearbeiten';
            editButton.onclick = () => validateQuestion(report._id, 'update', report.questionId?.questionText);

            listItem.append(deckName, questionText, reportedBy, reason, editButton);
            fragment.appendChild(listItem);
        });

        reportedQuestionsList.appendChild(fragment);
    } catch (error) {
        console.error('❌ Fehler beim Laden der gemeldeten Fragen:', error);
        showNotification('Fehler beim Laden der gemeldeten Fragen.');
    }
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
  let isHost = false;
  let hostUsername = null;

  let gameMode = null;
  // 🛠 **Benutzernamen aus MongoDB abrufen**
  async function fetchUsername() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            handleUnauthorized();
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

function handleUnauthorized() {
    document.getElementById("quizContainer").style.display = "none";
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("lobby").style.display = "none";
    showNotification("Bitte melde dich zuerst an!");
    if (window.location.pathname !== "/login") {
        window.location.href = "/login";
    }
}

async function handleFetchError(response) {
    if (response.status === 401) {
        handleUnauthorized();
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
    console.log("🚀 Spiel wird erstellt...");

    // **Dashboard verstecken & Lobby anzeigen**
    document.getElementById("quizContainer").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("lobby").style.display = "block";

    // **Decks aus API laden**
    await loadDecks();

    // **Zufälligen Raumcode generieren**
    const roomCode = generateRoomCode();
    document.getElementById("roomCode").textContent = roomCode;

    console.log("✅ Spiel erstellt mit Raumcode:", roomCode);
}

// ✅ Hilfsfunktion: Raumcode generieren
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}





  async function loadDecks() {
    console.log("🔄 Lade Decks aus der API...");
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
        console.log("🟢 API-Antwort erhalten:", data);
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
            deleteButton.innerText = "🗑 Löschen";
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
        console.log("✅ Decks erfolgreich in die Liste und das Dropdown eingefügt.");
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
