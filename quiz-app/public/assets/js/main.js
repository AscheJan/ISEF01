// 🟢 Frontend Steuerung: Strukturierte Version

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🟢 DOM vollständig geladen.");
    initializeApp();
});

// 🔄 Initialisierung aller Event Listener
function initializeApp() {
    setupEventListeners();
    checkUserAuthentication();
}

// ✅ Alle Event Listener an einem Ort
function setupEventListeners() {
    document.getElementById("selectDeck")?.addEventListener("change", handleDeckChange);
    document.getElementById("readyButton")?.addEventListener("click", handleReadyButton);
    document.getElementById("submitReport")?.addEventListener("click", submitReport);
    document.getElementById("logoutButton")?.addEventListener("click", logout);
    document.addEventListener("keydown", handleEscapeKey);
    window.addEventListener("click", handleOutsideClick);
}

// 🛠 Escape-Taste schließt Modale
function handleEscapeKey(event) {
    if (event.key === "Escape") {
        closeAllModals();
    }
}

// 🛠 Klick außerhalb des Modals schließt es
function handleOutsideClick(event) {
    document.querySelectorAll(".modal").forEach(modal => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
}

// ✅ Überprüfung auf Token und Benutzerstatus
function checkUserAuthentication() {
    if (localStorage.getItem('token')) {
        fetchUserData();
    } else {
        console.warn("⚠️ Kein Token gefunden – Benutzer möglicherweise nicht eingeloggt.");
    }
}

// 📥 Deck-Auswahl-Handler
function handleDeckChange(event) {
    const deckId = event.target.value;
    if (deckId) {
        console.log(`📌 Deck gewählt: ${deckId}`);
        loadDeckQuestions(deckId);
    } else {
        console.warn("⚠️ Kein Deck ausgewählt.");
    }
}

// 🎮 "Bereit"-Button Logik
function handleReadyButton() {
    if (!window.selectedDeck || !window.selectedGameMode) {
        showNotification("Bitte wähle zuerst ein Deck und einen Spielmodus!");
        return;
    }
    window.isReady = !window.isReady;
    updateReadyButtonState();
}

// ⏳ Countdown für Quizstart
function startCountdown() {
    let timeLeft = 5;
    window.countdownTimer = setInterval(() => {
        timeLeft--;
        document.getElementById("status").innerText = `Das Quiz startet in ${timeLeft} Sekunden...`;
        if (timeLeft <= 0) {
            clearInterval(window.countdownTimer);
            startQuiz();
        }
    }, 1000);
}

// 🚀 Quiz starten
async function startQuiz() {
    document.getElementById("lobby").style.display = "none";
    document.getElementById("quizContainer").style.display = "block";
    window.score = 0;
    document.getElementById("scoreDisplay").innerText = `🏆 Punktestand: ${window.score}`;
    await loadDeckQuestions(window.selectedDeck);
    displayQuestion();
}

// 📥 Fragen aus API abrufen
async function loadDeckQuestions(deckId) {
    console.log(`📥 Lade Fragen für Deck: ${deckId}`);
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification("⚠️ Nicht angemeldet! Bitte melde dich an.", "warning");
        window.location.href = "/login";
        return;
    }
    try {
        const response = await fetch(`/api/admin/questions/${deckId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`❌ Fehler: ${response.status} - ${await response.text()}`);
        window.questionSet = (await response.json()).questions;
        if (!window.questionSet.length) {
            showNotification("⚠️ Keine Fragen in diesem Deck.", "warning");
            return;
        }
        console.log("✅ Fragen geladen:", window.questionSet);
        showNotification("✅ Fragen erfolgreich geladen!", "success");
    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Fragen:', error);
        showNotification(`Fehler beim Abrufen der Fragen: ${error.message}`, "error");
    }
}

// 📝 Frage anzeigen
function displayQuestion() {
    if (window.currentQuestionIndex >= window.questionSet.length) {
        endQuiz();
        return;
    }
    const currentQuestion = window.questionSet[window.currentQuestionIndex];
    document.getElementById("questionText").innerText = currentQuestion.questionText;
    document.getElementById("answerOptions").innerHTML = "";
    currentQuestion.options.forEach((option, index) => {
        const btn = document.createElement("button");
        btn.innerText = option;
        btn.onclick = () => checkAnswer(index, currentQuestion.correctOptionIndex);
        document.getElementById("answerOptions").appendChild(btn);
    });
}

// ✅ Antwort prüfen
function checkAnswer(selectedIndex, correctIndex) {
    clearTimeout(window.timer);
    if (selectedIndex === correctIndex) {
        window.score++;
        document.getElementById("scoreDisplay").innerText = `🏆 Punktestand: ${window.score}`;
    }
    window.currentQuestionIndex++;
    displayQuestion();
}

// ✅ Benutzer Logout
function logout() {
    console.log("🔴 Nutzer wird abgemeldet...");
    localStorage.removeItem('token');
    window.location.href = "/login.html";
}

//----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🟢 DOM vollständig geladen.");
    // 🏠 Elemente abrufen
    const modal = document.getElementById('editQuestionModal');
    let usernameGame = localStorage.getItem("username") || "DeinBenutzername";
    // ✅ Token-Check für Benutzer
    if (localStorage.getItem('token')) {
        fetchUserData();
    } else {
        console.warn("⚠️ Kein Token gefunden – Benutzer möglicherweise nicht eingeloggt.");
    }
    // ⛔ Escape-Taste schließt Modal
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

    

    // 🔧 Admin-Deckauswahl (falls vorhanden)
    const selectDeckAdmin = document.querySelector('#adminModal #selectDeck');
    if (selectDeckAdmin) {
        selectDeckAdmin.addEventListener('change', async (event) => {
            const deckId = event.target.value;
            if (deckId) {
                console.log(`📌 Deck im Admin-Panel gewählt: ${deckId}`);
                await loadDeckQuestionsAndDisplay(deckId);
            } else {
                console.warn("⚠️ Kein Deck ausgewählt.");
                document.getElementById('questionList').innerHTML = '<p>⚠️ Wähle ein Deck aus.</p>';
            }
        });
    }
    
    // 👤 Benutzername anzeigen
    const usernameDisplay = document.getElementById("displayUsername");
    if (usernameGame && usernameDisplay) {
        usernameDisplay.innerText = usernameGame;
        console.log(`👤 Benutzer eingeloggt: ${usernameGame}`);
    } else {
        console.warn("⚠️ Benutzername oder 'displayUsername' nicht gefunden.");
    }


        // 🌟 UI-Elemente abrufen
        const home = document.getElementById("home");
        const dashboard = document.getElementById("dashboard");
        const lobby = document.getElementById("lobby");
        const quizContainer = document.getElementById("quizContainer");
        const questionText = document.getElementById("questionText");
        const answerOptions = document.getElementById("answerOptions");
        const nextQuestionButton = document.getElementById("nextQuestionButton");
        const scoreDisplay = document.getElementById("scoreDisplay");
    
        const selectDeck = document.getElementById("selectDeck");
        const readyButton = document.getElementById("readyButton");
        const statusText = document.getElementById("status");
        const gameModeSelection = document.getElementById("gameModeSelection");
    
        const reportModal = document.getElementById("reportModal");
        const reportReasonInput = document.getElementById("reportReason");
        const submitReportButton = document.getElementById("submitReport");
    
        let countdownTimer = null;
        let countdownValue = 5;
        let currentQuestionIndex = 0;
        let questionSet = [];
        let selectedDeck = null;
        let selectedGameMode = null;
        let isReady = false;
        let timer = null;
        let score = 0;
        let currentQuestionId = null;
    

    
     
    
        // 📥 **Deck-Auswahl-Logik**
        selectDeck.addEventListener("change", function () {
            selectedDeck = this.value;
            updateReadyButtonState();
        });
    
        // 🎮 **Spielmodus auswählen**
        window.selectGameMode = function (mode) {
            selectedGameMode = mode;
            document.querySelectorAll("#gameModeSelection button").forEach(btn => btn.classList.remove("selected"));
            document.querySelector(`#gameModeSelection button[data-mode='${mode}']`).classList.add("selected");
            updateReadyButtonState();
        };
    
        // 🔄 **Status des "Bereit"-Buttons aktualisieren**
        function updateReadyButtonState() {
            if (selectedDeck && selectedGameMode) {
                readyButton.style.display = "block";
                statusText.innerText = "Klicke auf 'Bereit', um zu starten.";
            } else {
                readyButton.style.display = "none";
                statusText.innerText = "Bitte wähle ein Deck und einen Spielmodus.";
            }
        }
    
        // 🎯 **"Bereit"-Button Logik mit Countdown**
        readyButton.addEventListener("click", function () {
            if (!selectedDeck || !selectedGameMode) {
                showNotification("Bitte wähle zuerst ein Deck und einen Spielmodus!");
                return;
            }
    
            isReady = !isReady;
    
            if (isReady) {
                readyButton.innerText = "Nicht bereit";
                statusText.innerText = `Das Quiz startet in ${countdownValue} Sekunden...`;
                startCountdown();
            } else {
                readyButton.innerText = "Bereit";
                statusText.innerText = "Bitte wähle ein Deck und klicke 'Bereit'.";
                stopCountdown();
            }
        });
    
        // ⏳ **Countdown für Quizstart**
        function startCountdown() {
            let timeLeft = countdownValue;
            countdownTimer = setInterval(() => {
                timeLeft--;
                statusText.innerText = `Das Quiz startet in ${timeLeft} Sekunden...`;
    
                if (timeLeft <= 0) {
                    clearInterval(countdownTimer);
                    startQuiz();
                }
            }, 1000);
        }
    
        // 🚀 **Quiz starten**
        async function startQuiz() {
            lobby.style.display = "none";
            quizContainer.style.display = "block";
            score = 0;
            scoreDisplay.innerText = `🏆 Punktestand: ${score}`;
    
            await loadDeckQuestions(selectedDeck);
            displayQuestion();
        }
    
        // 📥 **Fragen aus der API laden**
        async function loadDeckQuestions(deckId) {
            console.log(`📥 Lade Fragen für Deck: ${deckId}`);
        
            // 🛑 Prüfen, ob der Benutzer angemeldet ist
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification("⚠️ Nicht angemeldet! Bitte melde dich an.", "warning");
                window.location.href = "/login"; // Falls nicht eingeloggt, zur Login-Seite
                return;
            }
        
            try {
                // 🟢 API-Anfrage für Fragen mit Token
                const response = await fetch(`/api/admin/questions/${deckId}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
        
                if (!response.ok) {
                    throw new Error(`❌ Fehler: ${response.status} - ${await response.text()}`);
                }
        
                const data = await response.json();
                questionSet = data.questions;
        
                if (!questionSet || questionSet.length === 0) {
                    showNotification("⚠️ Keine Fragen in diesem Deck vorhanden.", "warning");
                    return;
                }
        
                console.log("✅ Fragen erfolgreich geladen:", questionSet);
                showNotification("✅ Fragen erfolgreich geladen!", "success");
        
            } catch (error) {
                console.error('❌ Fehler beim Abrufen der Fragen:', error);
                showNotification(`Fehler beim Abrufen der Fragen: ${error.message}`, "error");
            }
        }
        
    
        // 🧠 **Frage anzeigen**
        function displayQuestion() {
            if (currentQuestionIndex >= questionSet.length) {
                endQuiz();
                return;
            }
    
            const currentQuestion = questionSet[currentQuestionIndex];
            questionText.innerText = currentQuestion.questionText;
            answerOptions.innerHTML = "";
            currentQuestionId = currentQuestion._id;
    
            currentQuestion.options.forEach((option, index) => {
                const btn = document.createElement("button");
                btn.innerText = option;
                btn.onclick = () => checkAnswer(index, currentQuestion.correctOptionIndex);
                answerOptions.appendChild(btn);
            });
    
            // **Frage melden Button**
            const reportButton = document.createElement("button");
            reportButton.innerText = "⚠️ Frage melden";
            reportButton.onclick = () => openReportModal();
            answerOptions.appendChild(reportButton);
    
            nextQuestionButton.style.display = "none";
    
            if (selectedGameMode === "timeattack") startTimeAttackTimer();
        }
    
        // ✅ **Antwort prüfen**
        function checkAnswer(selectedIndex, correctIndex) {
            clearTimeout(timer);
    
            if (selectedIndex === correctIndex) {
                score++;
                scoreDisplay.innerText = `🏆 Punktestand: ${score}`;
            }
    
            currentQuestionIndex++;
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
    
        // 🎉 **Quiz beenden mit Score**
        function endQuiz() {
            quizContainer.innerHTML = `<h2>🎉 Quiz beendet!</h2>
                <p>🏆 Dein Punktestand: ${score} von ${questionSet.length}</p>
                <button onclick="location.reload()">🔄 Neues Spiel</button>`;
        }
    
        // 🛑 **Frage melden Modal öffnen**
        function openReportModal() {
            reportModal.style.display = "block";
        }
    
        // 📝 **Frage melden an API senden**
        submitReportButton.addEventListener("click", async function () {
            const reason = reportReasonInput.value.trim();
            if (!reason) {
                showNotification("Bitte gib einen Grund für die Meldung an!");
                return;
            }
        
        
            if (!usernameGame) {
                showNotification("⚠️ Kein Benutzername gefunden! Bist du eingeloggt?");
                return;
            }
        
            console.log("📤 Sende Report mit:", {
                questionId: currentQuestionId,
                quizDeckId: selectedDeck,
                reportedBy: usernameGame,
                reason
            });
        
            try {
                const response = await fetch("/api/admin/report-question", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        questionId: currentQuestionId,
                        quizDeckId: selectedDeck,
                        reportedBy: usernameGame, // 🔥 Prüfe, ob das ein String oder ObjectId ist
                        reason
                    })
                });
        
                const data = await response.json();
                console.log("📥 Antwort vom Server:", data);
        
                if (!response.ok) {
                    showNotification(`❌ Fehler: ${data.message}`);
                    return;
                }
        
                showNotification("✅ Frage wurde gemeldet!");
                reportModal.style.display = "none";
                reportReasonInput.value = "";
            } catch (error) {
                console.error("❌ Fehler beim Melden der Frage:", error);
            }
        });
                
    

});


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
        // 🔐 Token & User-Info speichern
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", username);
        console.log("✅ Login erfolgreich! Benutzer:", username);
        // 🔄 Automatisch die Seite neuladen für saubere Initialisierung
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

async function loadDeckQuestions(deckId) {
    console.log(`📥 Lade Fragen für Deck: ${deckId}`);

    if (!deckId) {
        console.warn("⚠️ Kein Deck ausgewählt.");
        return;
    }

    try {
        const token = localStorage.getItem('token'); // Token für Authentifizierung
        const response = await fetch(`/api/admin/questions/${deckId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`❌ Fehler: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();

        if (!data.questions || data.questions.length === 0) {
            showNotification("⚠️ Keine Fragen in diesem Deck.");
            return;
        }

        console.log("✅ Fragen erfolgreich geladen:", data.questions);
        displayQuestions(data.questions);

    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Fragen:", error);
        showNotification(`Fehler beim Abrufen der Fragen: ${error.message}`);
    }
}

function displayQuestions(questions) {
    const questionList = document.getElementById("questionList");
    if (!questionList) {
        console.error("❌ Fehler: `questionList` Element nicht gefunden!");
        return;
    }

    questionList.innerHTML = ""; // Vorherige Fragen entfernen

    questions.forEach(question => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            <strong>${question.questionText}</strong>
            <button onclick="reportQuestion('${question._id}')">⚠️ Melden</button>
        `;
        questionList.appendChild(listItem);
    });

    console.log("✅ Fragen erfolgreich in UI angezeigt.");
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

  function loadDeckOptions() {
    console.log("🟢 Lade Decks aus API...");
    const token = localStorage.getItem('token');
    
    fetch('/api/admin/decks', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) throw new Error('⚠️ Fehler beim Abrufen der Decks');
        return response.json();
    })
    .then(data => {
        console.log("🟢 API-Antwort:", data);

        const selectDeckLobby = document.querySelector('#lobby #selectDeck');
        const selectDeckAdmin = document.querySelector('#adminModal #selectDeck');

        if (!selectDeckLobby || !selectDeckAdmin) {
            console.error("❌ `selectDeck` nicht gefunden!");
            return;
        }

        // Dropdowns leeren
        selectDeckLobby.innerHTML = '<option value="">-- Wähle ein Deck --</option>';
        selectDeckAdmin.innerHTML = '<option value="">-- Deck auswählen --</option>';

        if (!data.decks || data.decks.length === 0) {
            console.warn("⚠️ Keine Decks gefunden.");
            return;
        }

        // Decks hinzufügen
        data.decks.forEach(deck => {
            const optionLobby = document.createElement('option');
            optionLobby.value = deck._id;
            optionLobby.innerText = deck.name;
            selectDeckLobby.appendChild(optionLobby);

            const optionAdmin = document.createElement('option');
            optionAdmin.value = deck._id;
            optionAdmin.innerText = deck.name;
            selectDeckAdmin.appendChild(optionAdmin);
        });

        console.log("✅ Decks erfolgreich hinzugefügt.");
    })
    .catch(error => {
        console.error('❌ Fehler beim Laden der Decks:', error);
        showNotification("Fehler beim Laden der Decks!");
    });
}

// Beim Laden der Seite Decks abrufen
document.addEventListener("DOMContentLoaded", loadDeckOptions);


  // ✅ Fragen eines Decks abrufen & anzeigen
  async function loadDeckQuestions(deckId) {
    console.log(`📥 Lade Fragen für Deck: ${deckId}`);

    // 🛑 Prüfen, ob der Benutzer angemeldet ist
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification("⚠️ Nicht angemeldet! Bitte melde dich an.", "warning");
        window.location.href = "/login"; // Falls nicht eingeloggt, zur Login-Seite
        return;
    }

    try {
        // API-Anfrage für Fragen
        const response = await fetch(`/api/admin/questions/${deckId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`❌ Fehler beim Abrufen der Fragen – Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Fragen geladen:", data);

        // 📝 Fragenliste im DOM-Element aktualisieren
        const questionList = document.getElementById('questionList');
        questionList.innerHTML = '<p>⏳ Lade Fragen...</p>'; // ⏳ Ladeanzeige

        if (!data.questions || data.questions.length === 0) {
            questionList.innerHTML = '<p>⚠️ Keine Fragen in diesem Deck.</p>';
            return;
        }

        // 🚀 Effiziente DOM-Manipulation mit Fragment
        const fragment = document.createDocumentFragment();
        data.questions.forEach(question => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${question.questionText}</strong>`;
            listItem.dataset.questionId = question._id; // ID für spätere Updates

            // Falls Admin, Buttons zum Bearbeiten/Löschen anzeigen
            if (localStorage.getItem('role') === 'admin') {
                const editButton = document.createElement('button');
                editButton.innerHTML = "✏️ Bearbeiten";
                editButton.classList.add('edit-btn');
                editButton.addEventListener('click', () => 
                    openEditQuestionModal(question._id, question.questionText, question.options, question.correctOptionIndex)
                );

                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = "🗑 Löschen";
                deleteButton.classList.add('delete-btn');
                deleteButton.addEventListener('click', async () => {
                    await deleteQuestion(question._id, deckId);
                });

                listItem.appendChild(editButton);
                listItem.appendChild(deleteButton);
            }

            fragment.appendChild(listItem);
        });

        questionList.innerHTML = ''; // Vorherigen Inhalt leeren
        questionList.appendChild(fragment); // 🌟 Nur einmal DOM aktualisieren

        showNotification("✅ Fragen erfolgreich geladen!", "success");

    } catch (error) {
        console.error('❌ Fehler beim Laden der Fragen:', error);
        showNotification('Fehler beim Abrufen der Fragen!', 'error');
    }
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




  // 🃏 **Deck auswählen (nur für Host)**
  function selectDeck(deckId) {
    if (!isHost) return showNotification("Nur der Host kann ein Deck auswählen!");
  }



  // 🏠 **Warteraum anzeigen**
  function showLobby(roomId) {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    document.getElementById('roomCode').innerText = roomId;
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
