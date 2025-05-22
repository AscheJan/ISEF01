document.addEventListener("DOMContentLoaded", () => {
  // ✅ Login & App-Initialisierung
  checkAndHandleLoginStatus();
  initializeApp();

  // ✅ Deckauswahl im Admin-Modus
  const selectDeckAdmin = document.getElementById("selectDeckAdmin");
  if (selectDeckAdmin) {
    selectDeckAdmin.addEventListener("change", () => {
      if (!selectDeckAdmin.value) {
        console.warn("⚠️ Kein Deck ausgewählt!");
        return;
      }
      loadAdminQuestions();
    });
  }

  // ✅ "Bereit"-Button und Status
  const readyButton = document.getElementById("readyButton");
  const statusText = document.getElementById("status");

  if (readyButton && statusText) {
    readyButton.addEventListener("click", () => {
      gameState.isReady = !gameState.isReady;
      readyButton.innerText = gameState.isReady ? "Nicht bereit" : "Bereit";

      if (gameState.isReady) {
        statusText.innerText = `Das Quiz startet in ${gameState.countdownValue} Sekunden...`;
        startCountdown();
      } else {
        statusText.innerText = "Bitte wähle ein Deck und klicke 'Bereit'.";
        stopCountdown();
      }

      socket.emit("playerReady", { roomCode: currentRoom, playerId });

      if (isHost) {
        socket.emit("hostReadyAll", { roomCode: currentRoom });
      }
    });
  }

  // ✅ 50:50 Joker Button
  const fiftyBtn = document.getElementById("fiftyFiftyBtn");
  if (fiftyBtn) {
    fiftyBtn.addEventListener("click", () => {
      const currentQuestion = gameState.questionSet[gameState.currentQuestionIndex];
      useFiftyFiftyJoker(currentQuestion);
      fiftyBtn.disabled = true; // Nur einmal nutzbar
    });
  }


  

  // ✅ Modal: Frage löschen (Admin)
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      const { questionId, deckId } = pendingDelete;
      closeDeleteModal();
      const token = localStorage.getItem("token");
      try {
        const resp = await fetch(`/api/admin/delete-question/${questionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || resp.statusText);
        showNotification("✅ Frage erfolgreich gelöscht!");
        const listItem = document.querySelector(`[data-question-id="${questionId}"]`);
        if (listItem) listItem.remove();
        else await loadAdminQuestions();
      } catch (err) {
        showNotification("❌ Fehler beim Löschen der Frage: " + err.message);
      }
    });
  }







  
  // Optional: Sichtbarkeits-Button initial aktualisieren, wenn Deck ausgewählt wird
  document.getElementById("userDeckSelect")?.addEventListener("change", async () => {
    const deckId = document.getElementById("userDeckSelect").value;
    const button = document.getElementById("toggleDeckVisibilityBtn");
    if (!deckId || !button) return;
  
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/user/decks`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
  
      const selectedDeck = data.decks.find(deck => deck._id === deckId);
      if (!selectedDeck) return;
  
      button.innerText = selectedDeck.isGlobal
        ? "🌐 Als privat markieren"
        : "🌐 Als global markieren";
  
    } catch (err) {
      console.warn("⚠️ Sichtbarkeit konnte nicht geladen werden:", err.message);
    }
  });
  







});


// 🌍 Deck-Sichtbarkeit umschalten (global/privat)
async function toggleDeckVisibility() {
  const deckId = document.getElementById("userDeckSelect").value;
  const button = document.getElementById("toggleDeckVisibilityBtn");

  if (!deckId || deckId.length !== 24) {
    showNotification("⚠️ Kein gültiges Deck ausgewählt!");
    return;
  }

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`/api/user/decks/${deckId}/toggle-visibility`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    // 🌐 Neue Sichtbarkeit auslesen (Boolean)
    const isGlobal = data.isGlobal;
    const icon = isGlobal ? "🌍" : "🔒";
    const label = isGlobal ? "Global" : "Privat";

    showNotification(`✅ Sichtbarkeit geändert: ${icon} ${label}`);

    // 🔁 Deckliste neu laden und Auswahl beibehalten
    await loadUserDecks();
    const select = document.getElementById("userDeckSelect");
    select.value = deckId;

    // 🖼️ Optionstext (Icon) aktualisieren
    const option = [...select.options].find(opt => opt.value === deckId);
    if (option) {
      const name = option.textContent.split(" (")[0]; // Deckname extrahieren
      option.textContent = `${name} (${icon})`;
    }

    // 🔘 Button-Text aktualisieren
    button.innerText = isGlobal
      ? "🌐 Als privat markieren"
      : "🌐 Als global markieren";

  } catch (err) {
    console.error("❌ Fehler beim Umschalten:", err);
    showNotification("❌ Fehler beim Umschalten: " + err.message);
  }
}

// 🔁 Event Listener hinzufügen
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleDeckVisibilityBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleDeckVisibility);
  }
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
    selectedDeckName: null,  // Neuer Schlüssel für Deck-Name
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
    const select = event.target;
    gameState.selectedDeck = select.value;
    gameState.selectedDeckName = select.selectedOptions[0]?.text || "Unbekanntes Deck";

    if (gameState.selectedDeck) {
        loadDeckQuestions(gameState.selectedDeck);
        if (typeof socket !== "undefined" && currentRoom) {
            socket.emit("selectDeck", {
                roomCode: currentRoom,
                playerId,
                deckId: gameState.selectedDeck,
                deckName: gameState.selectedDeckName
            });
        }
    }

    updateReadyButtonState();
}

function handleReadyButton() {
    if (!gameState.selectedDeck || !gameState.selectedGameMode) {
        showNotification("⚠️ Bitte wähle ein Deck und einen Spielmodus!");
        return;
    }

    gameState.isReady = !gameState.isReady;
    const statusText = document.getElementById("status");

    if (gameState.isReady) {
        statusText.innerText = "🟢 Quiz startet...";
        startQuiz();
    } else {
        statusText.innerText = "Bitte wähle ein Deck und einen Spielmodus.";
    }
}




// ✅ **Zentrale Event-Listener**
function setupEventListeners() {
    document.getElementById("selectDeck")?.addEventListener("change", handleDeckChange);

    document.querySelectorAll("#gameModeSelection button").forEach(button =>
        button.addEventListener("click", () => selectGameMode(button.getAttribute("data-mode")))
    );


    document.addEventListener("keydown", handleEscapeKey);
    window.addEventListener("click", event => {
        const modal = document.getElementById('editQuestionModal');
        if (event.target === modal) closeEditQuestionModal();
    });
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
    document.getElementById("displayUsername").innerText =
        localStorage.getItem("username") || "DeinBenutzername";
    setupModals();
    setupEventListeners();
    fetchUserDataIfAuthenticated();
    loadDeckOptions();
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

// ✅ Admin- und Lobby-Decks laden mit Sichtbarkeits-Symbol
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

    // 🔄 Alle <select>-Elemente befüllen
    selectElements.forEach(select => {
      select.innerHTML = '<option value="">-- Deck auswählen --</option>';

      data.decks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck._id;
        const icon = deck.isGlobal ? "🌍" : "🔒";
        option.innerText = `${icon} ${deck.name}`;
        select.appendChild(option);
      });
    });

    // 🏆 Deckauswahl-Listener für Lobby
    if (selectDeckLobby) {
      selectDeckLobby.addEventListener("change", function () {
        const selectedDeckId = this.value;
        const selectedDeck = data.decks.find(deck => deck._id === selectedDeckId);
        const selectedDeckName = selectedDeck ? selectedDeck.name : "Unbekanntes Deck";

        if (selectedDeckId) {
          loadDeckQuestions(selectedDeckId);

          // 📡 Multiplayer: Auswahl synchronisieren
          if (typeof socket !== "undefined" && currentRoom) {
            socket.emit("selectDeck", {
              roomCode: currentRoom,
              playerId,
              deckId: selectedDeckId,
              deckName: selectedDeckName
            });
          }

          // Speichere auch lokal
          gameState.selectedDeck = selectedDeckId;
          gameState.selectedDeckName = selectedDeckName;
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
    const MIN_REASON_LENGTH = 10;
  
    const questionId = document.getElementById("reportQuestionId").value.trim();
    const quizDeckId = document.getElementById("reportQuizDeckId").value.trim();
    const reason = document.getElementById("reportReason").value.trim();
    const reportedBy = localStorage.getItem("username") || "Anonym";
  
    // Pflichtfelder?
    if (!questionId || !quizDeckId) {
      showNotification("⚠️ Bitte die Frage und das Deck auswählen!", "warning");
      return;
    }
  
    // Mindestlänge prüfen
    if (reason.length < MIN_REASON_LENGTH) {
        showNotification(
        `⚠️ Du brauchst mindestens ${MIN_REASON_LENGTH} Zeichen! (aktuell ${reason.length})`,
        "warning"
        );
        return;
    }
    
  
    // Auth-Token vorhanden?
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
    document.querySelectorAll("#gameModeSelection button").forEach(btn =>
        btn.classList.toggle("selected", btn.getAttribute("data-mode") === mode)
    );
    updateReadyButtonState();
}



// ✅ **"Bereit"-Button Status aktualisieren**
function updateReadyButtonState() {
    const statusText = document.getElementById("status");
    const statusDeck = document.getElementById("statusDeck");
    const statusGameMode = document.getElementById("statusGameMode");

    // Deck-Status anzeigen
    if (gameState.selectedDeck) {
        statusDeck.innerText = `📖 Gewähltes Deck: ${gameState.selectedDeckName}`;
    } else {
        statusDeck.innerText = "📖 Gewähltes Deck: Noch nicht gewählt";
    }

    // Spielmodus-Status anzeigen
    if (gameState.selectedGameMode) {
        statusGameMode.innerText = `🎮 Spielmodus: ${gameState.selectedGameMode}`;
    } else {
        statusGameMode.innerText = "🎮 Spielmodus: Noch nicht gewählt";
    }

    // Button ein- oder ausblenden
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

  // UI umschalten: Lobby aus, Quiz an
  document.getElementById("lobby").style.display = "none";
  document.getElementById("quizContainer").style.display = "block";

  // Den 50:50-Button zunächst immer ausblenden und deaktivieren
  const fiftyBtn = document.getElementById("fiftyFiftyBtn");
  if (fiftyBtn) {
    fiftyBtn.style.display = "none";
    fiftyBtn.disabled = false;
  }

  // Fragen für das gewählte Deck laden
  loadDeckQuestions(gameState.selectedDeck).then(() => {
    // Falls Shuffle-Modus → Fragen mischen
    if (gameState.selectedGameMode === "shuffle") {
      shuffleQuestions();
    }

    // Immer erste Frage anzeigen
    displayQuestion();

    // ✅ Spielmodus-spezifische Initialisierungen
    switch (gameState.selectedGameMode) {
      case "timeattack":
        startTimeAttackMode(); // Einzel-Timer pro Frage
        break;
      case "speed":
        startSpeedMode(); // 60 Sekunden Gesamtzeit
        break;
      case "survival":
        console.log("🛡️ Überlebensmodus aktiv!");
        break;
      case "endless":
        console.log("🔄 Endlosmodus aktiv!");
        break;
      case "risk":
        console.log("🎲 Risikomodus aktiv!");
        break;
      case "fiftyfifty":
        gameState.jokerUsed = false; // Joker zurücksetzen
        if (fiftyBtn) fiftyBtn.style.display = "inline-block"; // Joker-Button einblenden
        break;
    }
  }).catch(err => {
    console.error("❌ Fehler beim Start des Quiz:", err);
    showNotification("❌ Fehler beim Start des Quiz. Bitte versuche es erneut.");
  });
}


function useFiftyFiftyJoker(currentQuestion) {
  const fiftyBtn = document.getElementById("fiftyFiftyBtn");

  // ✅ Joker wurde bereits verwendet
  if (gameState.jokerUsed) {
    showNotification("⚠️ Du hast den 50:50 Joker bereits verwendet!", "warning");
    if (fiftyBtn) fiftyBtn.disabled = true;
    return;
  }

  // ✅ Joker aktivieren
  gameState.jokerUsed = true;

  const wrongAnswers = currentQuestion.options
    .map((option, index) => index !== currentQuestion.correctOptionIndex ? index : null)
    .filter(index => index !== null);

  const removedIndexes = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, 2);

  document.querySelectorAll("#answerOptions button").forEach((btn, index) => {
    if (removedIndexes.includes(index)) {
      btn.style.display = "none";
    }
  });

  if (fiftyBtn) fiftyBtn.disabled = true;

  showNotification("🎭 50:50 Joker verwendet – zwei falsche Antworten wurden entfernt.", "success");
}






// ✅ **Report-Modal schließen**
function closeReportModal() {
    document.getElementById("reportModal").style.display = "none";
}

// Speichert den Highscore ins Backend
async function saveHighscore(deckId, score) {
    // hole zuerst beides
    const userId   = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
  
    if ((!userId && !username) || !deckId || score == null) {
      console.error('❌ Fehlende Daten für Highscore:', { userId, username, deckId, score });
      return;
    }
  
    try {
      const response = await fetch('/api/scores/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          // Entweder userId (wenn vorhanden) ODER username
          userId:   userId || undefined,
          username: username,  
          deckId,
          score
        })
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Status ${response.status} – ${err}`);
      }
      console.debug('🏆 Highscore gespeichert:', { userId, username, deckId, score });
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Highscores:', error);
    }
  }
  
  async function endQuiz() {
    stopAllTimers();
  
    // 🧠 Endless-Modus: Kein Ende, sondern Neustart
    if (gameState.selectedGameMode === "endless") {
      gameState.currentQuestionIndex = 0;
      shuffleQuestions();
      displayQuestion();
      return;
    }
  
    const userId = localStorage.getItem("userId") || localStorage.getItem("username");
    const deckId = gameState.selectedDeck;
    const score = gameState.score;
  
    if (!userId || !deckId || score == null) {
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
  
    // 🧹 UI umschalten
    quizContainer.style.display = "none"; 
    finalScreen.style.display = "block"; 
    finalScore.innerText = `🏆 Dein Score: ${score}`;
  
    // 🧽 Joker-Button zurücksetzen/verstecken
    const fiftyBtn = document.getElementById("fiftyFiftyBtn");
    if (fiftyBtn) {
      fiftyBtn.style.display = "none";
      fiftyBtn.disabled = false;
      gameState.jokerUsed = false;
    }
  
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

async function checkAnswer(selectedIndex, correctIndex) {
    clearInterval(gameState.timer);
    const answerButtons = document.querySelectorAll("#answerOptions button");
    if (!answerButtons.length) {
      console.error("Antwort-Buttons nicht gefunden!");
      return;
    }
  
    // Buttons deaktivieren
    answerButtons.forEach(btn => btn.disabled = true);
  
    // Klassen statt Inline-Styles benutzen
    answerButtons.forEach((btn, idx) => {
        if (idx === correctIndex) {
          btn.classList.add("correct");
        }
        if (idx === selectedIndex && idx !== correctIndex) {
          btn.classList.add("incorrect");
        }
      });
      
  
    // Punkte vergeben / Spiel beenden bei Survival
    if (selectedIndex === correctIndex) {
      gameState.score++;
    } else if (gameState.selectedGameMode === "survival") {
      stopAllTimers();
      return endQuiz();
    } else if (gameState.selectedGameMode === "risk") {
      gameState.score = Math.max(0, gameState.score - 1);
    }
  
    // Score im UI aktualisieren
    const scoreDisplay = document.getElementById("scoreDisplay");
    if (scoreDisplay) {
      scoreDisplay.innerText = `🏆 Punktestand: ${gameState.score}`;
    }
  
    // Score speichern
    try {
      await saveHighscore(gameState.selectedDeck, gameState.score);
    } catch (e) {
      console.warn("Live-Highscore-Save fehlgeschlagen:", e);
    }
  
    // Nach 3 Sekunden zur nächsten Frage (bzw. Ende)
    setTimeout(() => {
      answerButtons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove("correct", "incorrect");
      });
  
      gameState.currentQuestionIndex++;
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
  // 1) laufenden Frage-Timer stoppen
  clearInterval(gameState.timer);

  // 2) Container holen
  const questionContainer = document.getElementById("question-container");
  if (!questionContainer) {
    console.error("❌ Fehler: question-container nicht gefunden!");
    return;
  }

  // 3) Quiz beenden, falls alle Fragen durch
  if (gameState.currentQuestionIndex >= gameState.questionSet.length) {
    endQuiz();
    return;
  }

  const currentQuestion = gameState.questionSet[gameState.currentQuestionIndex];
  if (!currentQuestion?.questionText || !Array.isArray(currentQuestion.options)) {
    console.error("⚠️ Fehler: Ungültige Frage-Daten!", currentQuestion);
    return;
  }

  // 4) Container leeren und Grundstruktur einfügen
  questionContainer.innerHTML = `
    <h2>${currentQuestion.questionText}</h2>
    <div id="answerOptions"></div>
    ${gameState.selectedGameMode === "timeattack"
      ? `<p id="timeLeft" class="timer">⏳ Zeit: ${gameState.countdownValue}s</p>`
      : ""
    }
    <button id="reportBtn" class="report-button">⚠️ Frage melden</button>
  `;

  // 5) Antwort-Buttons hinzufügen
  const answerOptionsContainer = document.getElementById("answerOptions");
  if (!answerOptionsContainer) {
    console.error("❌ Fehler: answerOptions-Container fehlt!");
    return;
  }

  currentQuestion.options.forEach((optionText, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("answer-btn");
    btn.innerText = optionText;
    btn.addEventListener("click", () =>
      checkAnswer(idx, currentQuestion.correctOptionIndex)
    );
    answerOptionsContainer.appendChild(btn);
  });

  // 6) Timer starten, falls Zeitangriff-Modus
  if (gameState.selectedGameMode === "timeattack") {
    startQuestionTimer();
  }

  // 7) Report-Button binden
  const reportBtn = document.getElementById("reportBtn");
  reportBtn?.addEventListener("click", () =>
    openReportModal(currentQuestion._id, gameState.selectedDeck)
  );

  // 8) 🎭 50:50 Joker-Button behandeln
  const fiftyBtn = document.getElementById("fiftyFiftyBtn");
  if (fiftyBtn) {
    if (gameState.selectedGameMode === "fiftyfifty") {
      fiftyBtn.style.display = "inline-block";
      fiftyBtn.disabled = gameState.jokerUsed;
    } else {
      fiftyBtn.style.display = "none";
    }
  }
}

  




    
// 🔧 Leaderboard Rendering: zeigt und aktualisiert live (guard für fehlenden Container)
function renderLeaderboard(entries) {
    const container = document.getElementById("leaderboard");
    if (!container) return; // Element nicht vorhanden: nichts tun
    if (!entries || entries.length === 0) {
        container.innerHTML = "<p>❌ Noch keine Highscores für dieses Deck.</p>";
        return;
    }
    let html = "<h3>🏆 Leaderboard</h3><ul>";
    entries.forEach((entry, idx) => {
        html += `<li>${idx + 1}. ${entry.username}: ${entry.score} Punkte</li>`;
    });
    html += "</ul>";
    container.innerHTML = html;
}

// 📊 Initiales Laden und Live-Updates abonnieren
async function loadLeaderboard(deckId) {
    try {
      // 1) Einmalig per HTTP laden
      const resp = await fetch(`/api/scores/leaderboard/${deckId}`);
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const initial = await resp.json();
      renderLeaderboard(initial);
  
      // 2) Nur noch in den passenden Socket-Room joinen
      socket.emit('joinLeaderboardRoom', deckId);
  
    } catch (err) {
      console.error("Fehler beim Laden des Leaderboards:", err);
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
    const identifier = document.getElementById("username").value.trim(); 
    const password   = document.getElementById("password").value.trim();
  
    if (!identifier || !password) {
      return showError("⚠️ Bitte Benutzername/E-Mail und Passwort eingeben.");
    }
  
    try {
      // 1) Login und Token holen
      const loginResp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, email: identifier, password })
      });
      const loginText = await loginResp.text();
      let loginData;
      try {
        loginData = JSON.parse(loginText);
      } catch {
        throw new Error("Ungültige Antwort vom Server. Bitte später erneut versuchen.");
      }
      if (!loginResp.ok) {
        throw new Error(loginData.message || "Login fehlgeschlagen.");
      }
  
      // 2) Token & Basisinfos speichern
      localStorage.setItem("token",    loginData.token);
      localStorage.setItem("username", loginData.username);
      localStorage.setItem("email",    loginData.email);
  
      // 3) Jetzt die vollständigen User-Daten abfragen (inkl. userId)
      const meResp = await fetch("/api/auth/me", {
        method: "GET",
        headers: { 
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${loginData.token}`
        }
      });
      if (!meResp.ok) {
        console.warn("⚠️ Konnte userId nicht holen:", await meResp.text());
      } else {
        const meData = await meResp.json();
        // Hier musst du prüfen, ob dein Backend die ID in _id oder id zurückgibt
        const uid = meData._id || meData.id;
        if (uid) {
          localStorage.setItem("userId", uid);
        } else {
          console.warn("⚠️ userId nicht im /me-Response gefunden:", meData);
        }
      }
  
      // 4) Seite neu laden
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
      loadDeckOptions();
      await loadDecks();
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Decks:', error);
      showNotification(error.message);
    }
  }
  





  // Deck löschen
  let pendingDeckId = null;

  // 1) Öffnet das Modal
  function deleteDeck(deckId, deckName = '') {
    pendingDeckId = deckId;
    // Optional: Text anpassen, wenn du den Deck-Namen kennst:
    document.getElementById('deleteDeckText').innerText =
      deckName
        ? `Möchtest du das Deck "${deckName}" wirklich löschen?`
        : 'Möchtest du dieses Deck wirklich löschen?';
    document.getElementById('deleteDeckModal').style.display = 'flex';
  }
  
  // 2) Modal schließen ohne Aktion
  function closeDeleteDeckModal() {
    pendingDeckId = null;
    document.getElementById('deleteDeckModal').style.display = 'none';
  }
  
  // 3) Lösch-Anfrage bestätigen
  async function confirmDeleteDeck() {
    if (!pendingDeckId) return closeDeleteDeckModal();
  
    const token = localStorage.getItem('token');
    try {
      const resp = await fetch(`/api/admin/delete-deck/${pendingDeckId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || resp.statusText);
  
      showNotification('✅ Deck erfolgreich gelöscht!');
      // Dropdowns und Listen neu laden
      loadDeckOptions();
      loadDecks();
    } catch (err) {
      showNotification('❌ Fehler beim Löschen des Decks: ' + err.message);
    } finally {
      closeDeleteDeckModal();
    }
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
                deleteQuestion(question._id, deckId);
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
                deleteQuestion(question._id, selectedDeck);
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
  
    const selectDeckAdmin = document.getElementById("selectDeckAdmin");
    if (!selectDeckAdmin) {
      console.error("❌ Fehler: `selectDeckAdmin` nicht gefunden!");
      showNotification("❌ Fehler: Das Deck-Auswahlfeld fehlt!", "error");
      return;
    }
  
    const quizDeckId = selectDeckAdmin.value.trim();
    if (!quizDeckId) {
      showNotification("⚠️ Bitte wähle ein Deck aus, bevor du eine Frage hinzufügst.", "warning");
      return;
    }
  
    // Eingabefelder
    const questionTextEl = adminModal.querySelector('#questionText');
    const opts = [
      adminModal.querySelector('#option1'),
      adminModal.querySelector('#option2'),
      adminModal.querySelector('#option3'),
      adminModal.querySelector('#option4')
    ];
    const correctEl = adminModal.querySelector('#correctOption');
  
    if (!questionTextEl || opts.some(el => !el) || !correctEl) {
      console.error("❌ Fehler: Mindestens ein Eingabefeld fehlt!");
      showNotification("❌ Fehler: Ein erforderliches Eingabefeld fehlt!", "error");
      return;
    }
  
    const questionText = questionTextEl.value.trim();
    const options = opts.map(el => el.value.trim());
    const input = parseInt(correctEl.value, 10);      // erwartete Eingabe 1–4
    const correctOptionIndex = input - 1;              // intern 0–3
  
    // Validierung
    if (!questionText || options.some(opt => opt === '')) {
      showNotification('⚠️ Bitte fülle alle Felder aus.', "warning");
      return;
    }
    if (isNaN(input) || correctOptionIndex < 0 || correctOptionIndex > options.length - 1) {
      showNotification('⚠️ Bitte gib eine gültige korrekte Antwortnummer (1–4) an.', "warning");
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
        const errText = await response.text();
        throw new Error(`Status ${response.status} – ${errText}`);
      }
  
      showNotification('✅ Frage erfolgreich hinzugefügt!', "success");
      await loadAdminQuestions();   // Liste neu laden
  
      // Felder zurücksetzen
      questionTextEl.value = "";
      opts.forEach(el => el.value = "");
      correctEl.value = "";
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
  
    // Hidden field for ID
    document.getElementById('editQuestionId').value = questionId;
  
    // Fragetext vorbefüllen
    document.getElementById('editQuestionText').value = questionText;
  
    // Antwortoptionen vorbefüllen
    document.getElementById('editOption1').value = options[0] || '';
    document.getElementById('editOption2').value = options[1] || '';
    document.getElementById('editOption3').value = options[2] || '';
    document.getElementById('editOption4').value = options[3] || '';
  
    // Korrekte Antwortnummer (Frontend arbeitet mit 1–4)
    document.getElementById('editCorrectOption').value = (correctIndex + 1).toString();
  
    // Modal anzeigen und Fokus setzen
    modal.style.display = "block";
    setTimeout(() => {
      document.getElementById('editQuestionText').focus();
    }, 100);
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
  
    // 1) Validierung: alle Felder gefüllt?
    if (!questionId || !newText || newOptions.some(opt => opt === '')) {
      showNotification('⚠️ Bitte fülle alle Felder aus.', 'warning');
      return;
    }
  
    // Eingabe 1–4 → intern 0–3
    const input = parseInt(correctOptionInput, 10);
    const newCorrectOption = input - 1;
    if (isNaN(input) || newCorrectOption < 0 || newCorrectOption > 3) {
      showNotification('⚠️ Bitte gib eine gültige korrekte Antwortnummer (1–4) an.', 'warning');
      return;
    }
  
    // Auth-Check
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification('⚠️ Nicht angemeldet! Bitte melde dich an.', 'warning');
      window.location.href = '/login';
      return;
    }
  
    try {
      const response = await fetch(`/api/admin/edit-question/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          questionText: newText,
          options: newOptions,
          correctOptionIndex: newCorrectOption
        })
      });
  
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Status ${response.status} – ${errText}`);
      }
  
      showNotification('✅ Frage erfolgreich bearbeitet!', 'success');
      closeEditQuestionModal();
  
      // Liste aktualisieren
      await loadAdminQuestions();
    } catch (error) {
      console.error('❌ Fehler beim Bearbeiten der Frage:', error);
      showNotification('❌ Fehler beim Bearbeiten der Frage: ' + error.message, 'error');
    }
  }
  
  
  
  
  // 🗑 Frage löschen – Modal statt confirm
    function deleteQuestion(questionId, deckId, questionText = '') {
        // Speichere aktuelle Löschdaten
        pendingDelete = { questionId, deckId };
        document.getElementById('deleteModalText').innerText = `❓ "${questionText}"`;
        document.getElementById('deleteModal').style.display = 'flex';
    }

    let pendingDelete = { questionId: null, deckId: null };

    function closeDeleteModal() {
        document.getElementById('deleteModal').style.display = 'none';
    }
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        const { questionId, deckId } = pendingDelete;
        closeDeleteModal();
        const token = localStorage.getItem('token');
      
        try {
          const response = await fetch(`/api/admin/delete-question/${questionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Fehler beim Löschen der Frage.');
      
          showNotification('✅ Frage erfolgreich gelöscht!');
      
          // UI sofort aktualisieren
          const questionListItem = document.querySelector(`[data-question-id="${questionId}"]`);
          if (questionListItem) {
            questionListItem.remove();
          } else {
            // Fallback: kompletten Fragen-Reload
            await loadAdminQuestions();
          }
        } catch (error) {
          showNotification('❌ Fehler beim Löschen der Frage: ' + error.message);
        }
      });


// 🗑 Frage löschen (Admin)
async function deleteAdminQuestion(questionId) {
  const token = localStorage.getItem("token");
  if (!questionId) return showModalMessage("❌ Keine gültige Frage-ID.");

  const confirm = window.confirm("❓ Diese Frage wirklich löschen?");
  if (!confirm) return;

  try {
    const res = await fetch(`/api/admin/delete-question/${questionId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    await loadUserDeckQuestions();
  } catch (err) {
    showModalMessage("❌ Fehler beim Löschen der Frage: " + err.message);
  }
}

// ✏️ Frage bearbeiten (Admin)
function openEditAdminQuestionModal(question) {
  const modal = document.getElementById("editQuestionModal");
  if (!modal) return showModalMessage("❌ Bearbeitungsmodal nicht gefunden.");

  document.getElementById("editQuestionId").value = question._id;
  document.getElementById("editQuestionText").value = question.questionText;
  document.getElementById("editOption1").value = question.options[0] || "";
  document.getElementById("editOption2").value = question.options[1] || "";
  document.getElementById("editOption3").value = question.options[2] || "";
  document.getElementById("editOption4").value = question.options[3] || "";
  document.getElementById("editCorrectOption").value = (question.correctOptionIndex + 1).toString();

  modal.style.display = "block";
}








// 🔐 Globale Variablen
let userCurrentDeckId = null;
let pendingDeleteQuestionId = null;
let pendingDeleteDeckId = null;

// 📦 Deck erstellen
async function createUserDeck() {
  const name = document.getElementById("userDeckName").value.trim();
  if (!name) return showModalMessage("❌ Bitte gib einen Decknamen ein!");

  const token = localStorage.getItem("token");

  try {
    const res = await fetch("/api/user/create-deck", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    document.getElementById("userDeckName").value = "";
    showModalMessage("✅ Deck erstellt!");
    await loadUserDecks();

    setTimeout(() => {
      const select = document.getElementById("userDeckSelect");
      select.value = data.deck._id;
      loadUserDeckQuestions();
    }, 100);
  } catch (err) {
    showModalMessage("❌ Fehler beim Erstellen: " + err.message);
  }
}

// 🗑 Deck löschen vorbereiten
function showDeleteDeckConfirmation() {
  const deckId = document.getElementById("userDeckSelect").value;
  console.log("🧪 Aktuell ausgewähltes Deck:", deckId);
  if (!deckId || deckId.length !== 24) {
    showModalMessage("❌ Kein gültiges Deck ausgewählt.");
    return;
  }
  pendingDeleteDeckId = deckId;
  console.log("✅ Deck-ID zum Löschen gespeichert:", pendingDeleteDeckId);
  document.getElementById("confirmDeleteDeckModal").style.display = "block";
}


function closeDeleteDeckConfirmation() {
  document.getElementById("confirmDeleteDeckModal").style.display = "none";
  pendingDeleteDeckId = null;
}

async function deleteUserDeckConfirmed() {
  const token = localStorage.getItem("token");

  const deckId = pendingDeleteDeckId; // zuerst speichern
  pendingDeleteDeckId = null; // sofort leeren
  closeDeleteDeckConfirmation(); // dann Modal schließen

  if (!deckId) return;

  try {
    const res = await fetch(`/api/user/delete-deck/${deckId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    await loadUserDecks();
    document.getElementById("userQuestionList").innerHTML = "";
  } catch (err) {
    showModalMessage("❌ Fehler beim Löschen des Decks: " + err.message);
  }
}


// 📚 Decks laden
async function loadUserDecks() {
  const token = localStorage.getItem("token");
  const select = document.getElementById("userDeckSelect");

  if (!token || !select) {
    console.warn("⚠️ Token oder Select-Feld fehlt.");
    return;
  }

  try {
    const res = await fetch("/api/user/decks", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    select.innerHTML = `<option value="">-- Wähle ein Deck --</option>`;

    data.decks.forEach(deck => {
      const opt = document.createElement("option");
      opt.value = deck._id;
      opt.textContent = `${deck.name} (${deck.isGlobal ? "🌍" : "🔒"})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("❌ Fehler beim Laden der Decks:", err);
    showNotification("❌ Fehler beim Laden deiner Decks: " + err.message);
  }
}


// ❓ Fragen laden
async function loadUserDeckQuestions() {
  userCurrentDeckId = document.getElementById("userDeckSelect").value;
  if (!userCurrentDeckId) return;

  const token = localStorage.getItem("token");
  const list = document.getElementById("userQuestionList");
  list.innerHTML = "<p>⏳ Lade Fragen...</p>";

  try {
    const res = await fetch(`/api/user/questions/${userCurrentDeckId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    list.innerHTML = "";
    if (!data.questions || data.questions.length === 0) {
      list.innerHTML = "<p>⚠️ Keine Fragen im Deck.</p>";
      return;
    }

    data.questions.forEach(q => {
      const id = String(q._id);
      if (!id || id.length !== 24) {
        console.warn("⚠️ Ungültige Frage-ID:", q);
        return;
      }

      const li = document.createElement("li");
      li.innerHTML = `<strong>${q.questionText}</strong>`;

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.onclick = () => openEditUserQuestionModal(q);

      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑";
      delBtn.onclick = () => {
        console.log("🧪 Löschen vorbereiten mit ID:", id);
        showDeleteConfirmation(id);
      };

      li.appendChild(editBtn);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  } catch (err) {
    showModalMessage("❌ Fehler beim Laden der Fragen: " + err.message);
  }
}


function openAddUserQuestionModal() {
  document.getElementById("questionModalTitle").textContent = "Frage erstellen";
  document.getElementById("userEditingQuestionId").value = "";
  ["userQuestionText", "userOption1", "userOption2", "userOption3", "userOption4", "userCorrectOption"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("userQuestionModal").style.display = "block";
}

function openEditUserQuestionModal(q) {
  document.getElementById("questionModalTitle").textContent = "Frage bearbeiten";
  document.getElementById("userEditingQuestionId").value = q._id;
  document.getElementById("userQuestionText").value = q.questionText;
  document.getElementById("userOption1").value = q.options[0] || "";
  document.getElementById("userOption2").value = q.options[1] || "";
  document.getElementById("userOption3").value = q.options[2] || "";
  document.getElementById("userOption4").value = q.options[3] || "";
  document.getElementById("userCorrectOption").value = (q.correctOptionIndex + 1).toString();
  document.getElementById("userQuestionModal").style.display = "block";
}

function closeUserQuestionModal() {
  document.getElementById("userQuestionModal").style.display = "none";
}

async function saveUserQuestion() {
  const token = localStorage.getItem("token");
  const id = document.getElementById("userEditingQuestionId").value;
  const questionText = document.getElementById("userQuestionText").value.trim();
  const options = [
    document.getElementById("userOption1").value.trim(),
    document.getElementById("userOption2").value.trim(),
    document.getElementById("userOption3").value.trim(),
    document.getElementById("userOption4").value.trim()
  ];
  const correctOption = parseInt(document.getElementById("userCorrectOption").value, 10) - 1;

  if (!questionText || options.some(o => !o) || correctOption < 0 || correctOption > 3) {
    return showModalMessage("⚠️ Bitte fülle alle Felder korrekt aus.");
  }

  const payload = {
    questionText,
    options,
    correctOptionIndex: correctOption,
    deckId: userCurrentDeckId
  };

  const url = id ? `/api/user/edit-question/${id}` : `/api/user/add-question`;
  const method = id ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    closeUserQuestionModal();
    await loadUserDeckQuestions();
  } catch (err) {
    showModalMessage("❌ Fehler beim Speichern: " + err.message);
  }
}

function showDeleteConfirmation(questionId) {
  const id = String(questionId).trim();
  if (!id || id === "null" || id.length !== 24) {
    console.warn("⚠️ Ungültige Frage-ID zum Löschen:", id);
    showModalMessage("❌ Es wurde keine gültige Frage-ID übergeben.");
    return;
  }

  pendingDeleteQuestionId = id;
  console.log("✅ Frage-ID zum Löschen gespeichert:", id);
  document.getElementById("confirmDeleteModal").style.display = "block";
}

function closeDeleteConfirmation() {
  document.getElementById("confirmDeleteModal").style.display = "none";
  pendingDeleteQuestionId = null;
}

async function deleteUserQuestionConfirmed() {
  const token = localStorage.getItem("token");

  if (!pendingDeleteQuestionId || pendingDeleteQuestionId === "null") {
    showModalMessage("❌ Keine gültige Frage ausgewählt zum Löschen.");
    return;
  }

  try {
    const res = await fetch(`/api/user/delete-question/${pendingDeleteQuestionId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    await loadUserDeckQuestions();
  } catch (err) {
    showModalMessage("❌ Fehler beim Löschen: " + err.message);
  } finally {
    closeDeleteConfirmation();
  }
}


function openUserQuizManager() {
  const el = document.getElementById("userQuizManager");
  const isOpen = el.style.display === "block";
  el.style.display = isOpen ? "none" : "block";
  if (!isOpen) loadUserDecks();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("userDeckSelect")) {
    loadUserDecks();
  }
});

function showModalMessage(message) {
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `<div class="modal-content"><p>${message}</p><button onclick="this.parentElement.parentElement.remove()">OK</button></div>`;
  document.body.appendChild(modal);
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

    if (!response.ok) throw new Error(`Fehler beim Laden der Decks: ${response.status}`);
    const data = await response.json();

    const deckList = document.getElementById('deckList');
    const selectDeck = document.getElementById('selectDeck');

    if (!deckList || !selectDeck) {
      console.error("❌ `deckList` oder `selectDeck` nicht gefunden.");
      return;
    }

    deckList.innerHTML = '';
    selectDeck.innerHTML = '<option value="">-- Deck auswählen --</option>';

    data.decks.forEach(deck => {
      const nameSuffix = deck.isGlobal ? "🌍 Global" : "🔒 Privat";

      // 🔘 Liste
      const li = document.createElement('li');
      li.textContent = `${deck.name} (${nameSuffix})`;
      li.addEventListener('click', () => loadDeckQuestions(deck._id));

      const delBtn = document.createElement('button');
      delBtn.innerText = "🗑";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        await deleteDeck(deck._id, deck.name);
      };

      li.appendChild(delBtn);
      deckList.appendChild(li);

      // 🔽 Dropdown
      const opt = document.createElement('option');
      opt.value = deck._id;
      opt.textContent = `${deck.name} (${deck.isGlobal ? "🌍" : "🔒"})`;
      selectDeck.appendChild(opt);
    });

  } catch (err) {
    console.error("❌ Fehler beim Laden der Decks:", err);
    showNotification(err.message);
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
socket.on('newHost', newHostId => {  
  if (socket.id === newHostId) isHost = true;  
});

// Einmaliger, globaler Listener für alle Leaderboard-Updates
socket.on('leaderboardUpdated', top10 => {
    renderLeaderboard(top10);
  });
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
        socket.emit("selectDeck", {
            roomCode: currentRoom,
            deckId: gameState.selectedDeck,
            deckName: gameState.selectedDeckName   // <-- Name hinzufügen
          });
          
    }
});

socket.on("updateDeckSelection", ({ deckId, deckName }) => {
    gameState.selectedDeck     = deckId;
    gameState.selectedDeckName = deckName;
    updateReadyButtonState();
  });
  

// 🎮 Spielmodus synchronisieren
document.querySelectorAll("#gameModeSelection button").forEach(button => {
    button.addEventListener("click", function () {
        const mode = this.getAttribute("data-mode");
        gameState.selectedGameMode = mode;
        socket.emit("selectGameMode", { roomCode: currentRoom, gameMode: mode });
    });
});

// 📡 Alle Auswahlen gemacht: Deck-Name und Modus anzeigen
socket.on("allSelectionsMade", ({ deckId, deckName, mode }) => {
    gameState.selectedDeck = deckId;
    gameState.selectedDeckName = deckName;
    gameState.selectedGameMode = mode;
    updateReadyButtonState();
});
  


  
  // 🎮 Spielmodus synchronisieren via Socket.IO
  socket.on("updateGameModeSelection", (mode) => {
      gameState.selectedGameMode = mode;
      updateReadyButtonState();
  });




function setReady() {
    if (!currentRoom) return;
    socket.emit("playerReady", { roomCode: currentRoom, playerId });
}




socket.on("updateReadyStatus", (players) => {
    const readyStatusList = document.getElementById("readyStatus");
    if (!readyStatusList) {
      // Liste nicht vorhanden (z.B. im Quiz- oder Login-Screen) – nichts tun
      return;
    }
    // Bestehende Einträge löschen
    readyStatusList.innerHTML = "";
  
    // Neue Liste aufbauen
    players.forEach(player => {
      const li = document.createElement("li");
      li.innerText = `${player.username}: ${player.isReady ? "✅ Bereit" : "⏳ Warten..."}`;
      readyStatusList.appendChild(li);
    });
  });
  


// Event: Spiel kann starten
socket.on("gameCanStart", () => {
    const startBtn = document.getElementById("startGameBtn");
    if (startBtn) startBtn.style.display = "block";
  });

  socket.on("gameStarted", () => {
    const lobby = document.getElementById("lobby");
    const quiz = document.getElementById("quizContainer");
    if (lobby) lobby.style.display = "none";
    if (quiz)  quiz.style.display = "block";
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



async function joinGame() {
    const roomCode = document.getElementById("roomCodeInput")?.value.trim();
    const username = localStorage.getItem("username") || prompt("Bitte gib deinen Namen ein:");
  
    if (!roomCode || !username) {
      showNotification("❌ Bitte Raumcode und Namen eingeben!");
      return;
    }
  
    // Modal schließen
    const joinModal = document.getElementById("joinGameModal");
    if (joinModal) joinModal.style.display = "none";
  
    // Username speichern & Raum beitreten
    localStorage.setItem("username", username);
    socket.emit("joinRoom", { roomCode, username });
  }
  



// Event: Erfolgreicher Beitritt
socket.on("roomJoined", (data) => {
    currentRoom = data.roomCode;
  
    // 1) Modal sicher schließen
    const joinModal = document.getElementById("joinGameModal");
    if (joinModal) joinModal.style.display = "none";
  
    // 2) Dashboard/Lobby umschalten
    const dash = document.getElementById("dashboard");
    if (dash) dash.style.display = "none";
    const lobby = document.getElementById("lobby");
    if (lobby) lobby.style.display = "block";
  
    // 3) Status-Text updaten
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.innerText = data.isSingleplayer
        ? "🕹️ Einzelspieler-Modus aktiviert!"
        : `👥 Spieler im Raum: ${data.players.length}`;
    }
  
    // 4) Raumcode anzeigen
    const rc = document.getElementById("roomCode");
    if (rc) rc.innerText = `Raumcode: ${currentRoom}`;
  
    // 5) Spielerliste rendern (nur im Multiplayer)
    if (!data.isSingleplayer && Array.isArray(data.players)) {
      updatePlayers(data.players);
    }
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

// Spiel kann nicht mehr starten, wir gehen zurück in die Lobby:
socket.on("returnToLobby", () => {
  const quiz = document.getElementById("quizContainer");
  const lobby = document.getElementById("lobby");
  const readyBtn = document.getElementById("readyButton");
  const readyList = document.getElementById("readyStatus");
  const statusDeck = document.getElementById("statusDeck");
  const statusGameMode = document.getElementById("statusGameMode");
  const statusText = document.getElementById("status");

  if (quiz) quiz.style.display = "none";
  if (lobby) lobby.style.display = "block";
  if (readyBtn) {
    readyBtn.innerText = "Bereit";
    // readyBtn.style.display = "none";
  }
  if (readyList)   readyList.innerHTML = "";
  if (statusDeck)  statusDeck.innerText = "📖 Gewähltes Deck: Noch nicht gewählt";
  if (statusGameMode) statusGameMode.innerText = "🎮 Spielmodus: Noch nicht gewählt";
  if (statusText) statusText.innerText = "Bitte wähle ein Deck und klicke 'Bereit'.";
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
    const scoreDisplay = document.getElementById("scoreDisplay");
    if (!scoreDisplay) return;    // <<< Guard: existiert das Element?
    
    // erst hier mit innerHTML arbeiten
    scoreDisplay.innerHTML = "🏆 Punktestand:<br>";
    for (let user in scores) {
      scoreDisplay.innerHTML += `${user}: ${scores[user]} Punkte<br>`;
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