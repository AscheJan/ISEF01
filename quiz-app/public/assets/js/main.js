// frontend/main.js - Steuerung der Benutzeroberfläche und Authentifizierung
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🟢 DOM vollständig geladen.");

  // Überprüfe, ob ein Token vorhanden ist, bevor fetchUserData() aufgerufen wird
  if (localStorage.getItem('token')) {
      fetchUserData();
  } else {
      console.warn("⚠️ Kein Token gefunden – Benutzer möglicherweise nicht eingeloggt.");
  }
  const modal = document.getElementById('editQuestionModal');

  // Schließt das Modal bei ESC-Taste
  document.addEventListener('keydown', (event) => {
      if (event.key === "Escape" && modal.style.display === "block") {
          closeEditQuestionModal();
      }
  });

  // Schließt das Modal, wenn außerhalb geklickt wird
  window.addEventListener('click', (event) => {
      if (event.target === modal) {
          closeEditQuestionModal();
      }
  });
    // Decks abrufen und Dropdowns füllen
    await loadDeckOptions();

    // Event für Deck-Auswahl im Admin-Panel
    const selectDeckAdmin = document.querySelector('#adminModal #selectDeck');
    if (selectDeckAdmin) {
        selectDeckAdmin.addEventListener('change', async (event) => {
            const deckId = event.target.value;
            const questionList = document.getElementById('questionList');

            if (deckId) {
                console.log(`📌 Deck im Admin-Panel gewählt: ${deckId}`);

                // UI während des Ladens aktualisieren
                questionList.innerHTML = '<p>⏳ Fragen werden geladen...</p>';
                
                // Fragen abrufen
                await loadDeckQuestions(deckId);
            } else {
                console.warn("⚠️ Kein Deck ausgewählt.");
                questionList.innerHTML = '<p>⚠️ Wähle ein Deck aus.</p>';
            }
        });
    }


  // Benutzername im Dashboard setzen
  const username = localStorage.getItem("username");
  const usernameDisplay = document.getElementById("displayUsername");

  if (username && usernameDisplay) {
      usernameDisplay.innerText = username;
      console.log(`👤 Benutzer eingeloggt: ${username}`);
  } else {
      console.warn("⚠️ Benutzername oder 'displayUsername' nicht gefunden.");
  }
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
      alert(`Es gibt ${data.length} gemeldete Fragen.`);
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
          alert('Registrierung erfolgreich! Bitte melde dich an.');
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
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  hideElement('dashboard');
  hideElement('lobby');
  hideElement('quiz');
  hideElement('leaderboard');
  hideElement('adminPanel');
  showElement('home');
  window.location.href = '/';
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
      alert("Fehler beim Laden der Decks!");
  });
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
      alert("Fehler beim Laden der Decks!");
  }
}


function closeAdminModal() {
  hideElement('adminModal');
}

// Deck erstellen
async function createDeck() {
  const deckNameInput = document.getElementById('deckName');
  if (!deckNameInput || !deckNameInput.value.trim()) {
      alert('❌ Bitte einen Namen für das Deck eingeben.');
      return;
  }

  const deckName = deckNameInput.value.trim();
  const token = localStorage.getItem('token');

  if (!token) {
      alert('⚠️ Authentifizierung fehlgeschlagen. Bitte erneut anmelden.');
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

      alert(`✅ Deck "${deckName}" erfolgreich erstellt!`);
      deckNameInput.value = '';
      // Decks abrufen und Dropdowns füllen
      loadDeckOptions();
      await loadDecks(); // Deck-Liste aktualisieren
  } catch (error) {
      console.error('❌ Fehler beim Erstellen des Decks:', error);
      alert(error.message);
  }
}


// Decks laden und anzeigen
async function loadDecks() {
  console.log("🔄 Lade Decks aus der API...");

  const token = localStorage.getItem('token');
  if (!token) {
      console.warn("⚠️ Kein Token gefunden – Benutzer nicht eingeloggt?");
      alert("Bitte melde dich erneut an.");
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
      alert(error.message);
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
      alert('Deck erfolgreich gelöscht!');
      // Decks abrufen und Dropdowns füllen
      loadDeckOptions();
      loadDecks();
  })
  .catch(error => {
      alert('Fehler beim Löschen des Decks: ' + error.message);
  });
}


// ✅ Fragen eines Decks abrufen & anzeigen
async function loadDeckQuestions(deckId) {
  try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/questions/${deckId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
      });

      // Prüfen, ob die Antwort erfolgreich ist
      if (!response.ok) {
          throw new Error(`❌ Fehler: ${response.status} - ${response.statusText}`);
      }

      // JSON-Daten sicher abrufen
      let data;
      try {
          data = await response.json();
      } catch (jsonError) {
          throw new Error("❌ Ungültiges JSON-Format der Serverantwort.");
      }

      console.log("🔄 Fragen geladen:", data);

      const questionList = document.getElementById('questionList');
      questionList.innerHTML = ''; // Vorherige Inhalte entfernen

      // ❗ Falls keine Fragen vorhanden sind
      if (!data.questions || data.questions.length === 0) {
          questionList.innerHTML = '<p>⚠️ Keine Fragen in diesem Deck.</p>';
          return;
      }

      // 🚀 Effiziente DOM-Manipulation mit Fragment
      const fragment = document.createDocumentFragment();

      data.questions.forEach(question => {
          const listItem = document.createElement('li');
          listItem.innerText = question.questionText;
          listItem.dataset.questionId = question._id; // ID für einfaches UI-Update

          // ✏️ Bearbeiten-Button
          const editButton = document.createElement('button');
          editButton.innerHTML = "✏️ Bearbeiten";
          editButton.classList.add('edit-btn');
          editButton.addEventListener('click', () => 
              openEditQuestionModal(question._id, question.questionText, question.options, question.correctOptionIndex)
          );

          // 🗑 Löschen-Button
          const deleteButton = document.createElement('button');
          deleteButton.innerHTML = "🗑 Löschen";
          deleteButton.classList.add('delete-btn');
          deleteButton.addEventListener('click', async () => {
              await deleteQuestion(question._id, deckId);
          });

          // Buttons zu Listeneintrag hinzufügen
          listItem.appendChild(editButton);
          listItem.appendChild(deleteButton);
          fragment.appendChild(listItem);
      });

      questionList.appendChild(fragment); // Nur einmal DOM-Update durchführen

      console.log("✅ Fragen erfolgreich geladen & angezeigt.");
  } catch (error) {
      console.error('❌ Fehler beim Laden der Fragen:', error.message);
      
  }
}




// Frage zu einem Deck hinzufügen
async function addQuestion() {
  const selectDeck = document.querySelector('#adminModal #selectDeck');

  if (!selectDeck) {
      console.error("❌ Fehler: `selectDeck` nicht gefunden!");
      alert("⚠️ Fehler: Das Deck-Auswahlfeld existiert nicht.");
      return;
  }

  const quizDeckId = selectDeck.options[selectDeck.selectedIndex]?.value.trim(); // Sichere Auswahl

  if (!quizDeckId || quizDeckId === "") {
      alert('⚠️ Bitte wähle ein Deck aus.');
      selectDeck.style.border = "2px solid red";
      return;
  } else {
      selectDeck.style.border = "";
  }

  const questionText = document.getElementById('questionText').value.trim();
  const options = [
      document.getElementById('option1').value.trim(),
      document.getElementById('option2').value.trim(),
      document.getElementById('option3').value.trim(),
      document.getElementById('option4').value.trim()
  ];
  const correctOptionIndex = parseInt(document.getElementById('correctOption').value, 10);
  const token = localStorage.getItem('token');

  // ✅ Validierung
  if (!questionText || options.some(opt => !opt)) {
      alert('⚠️ Bitte fülle alle Felder aus.');
      return;
  }

  if (isNaN(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
      alert('⚠️ Bitte gib eine gültige korrekte Antwortnummer (0-3) an.');
      return;
  }

  try {
      const response = await fetch('/api/admin/add-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ quizDeckId, questionText, options, correctOptionIndex })
      });

      if (!response.ok) {
          throw new Error('❌ Fehler beim Hinzufügen der Frage.');
      }

      alert('✅ Frage erfolgreich hinzugefügt!');
      loadDeckQuestions(quizDeckId);
  } catch (error) {
      alert('❌ Fehler beim Hinzufügen der Frage: ' + error.message);
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
      alert('⚠️ Bitte fülle alle Felder aus.');
      return;
  }

  // ✅ 2. Überprüfung, ob die korrekte Antwort eine gültige Zahl zwischen 0-3 ist
  const newCorrectOption = parseInt(correctOptionInput, 10);
  if (isNaN(newCorrectOption) || newCorrectOption < 0 || newCorrectOption > 3) {
      alert('⚠️ Bitte gib eine gültige korrekte Antwortnummer zwischen 0 und 3 an.');
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

      alert('✅ Frage erfolgreich bearbeitet!');
      closeEditQuestionModal();
      window.location.reload();
  } catch (error) {
      alert('❌ Fehler beim Bearbeiten der Frage: ' + error.message);
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

      alert('✅ Frage erfolgreich gelöscht!');

      // 🔄 UI sofort aktualisieren, ohne gesamte Liste neu zu laden
      const questionListItem = document.querySelector(`[data-question-id="${questionId}"]`);
      if (questionListItem) {
          questionListItem.remove();
      } else {
          await loadDeckQuestions(deckId); // Falls UI nicht aktualisiert wurde, gesamte Liste neu laden
      }

  } catch (error) {
      alert('❌ Fehler beim Löschen der Frage: ' + error.message);
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

      alert('✅ Frage erfolgreich gelöscht!');
      await loadDeckQuestions(deckId); // Nach dem Löschen Liste neu laden
  } catch (error) {
      alert('❌ Fehler beim Löschen der Frage: ' + error.message);
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
      alert('Nicht autorisiert. Bitte erneut anmelden.');
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

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Löschen';
          deleteButton.onclick = () => validateQuestion(report._id, 'delete');

          listItem.append(deckName, questionText, reportedBy, reason, editButton, deleteButton);
          fragment.appendChild(listItem);
      });

      reportedQuestionsList.appendChild(fragment);
  } catch (error) {
      console.error('❌ Fehler beim Laden der gemeldeten Fragen:', error);
      alert('Fehler beim Laden der gemeldeten Fragen.');
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
      alert('Frage wurde validiert!');
      loadReportedQuestions();
  })
  .catch(error => {
      alert('Fehler beim Validieren der Frage: ' + error.message);
  });
}







// Spiel-Logik
const socket = io('http://localhost:5000');

let currentRoom = null;
let currentUser = null;
let isHost = false; // Speichert, ob der Benutzer der Host ist

// 🛠 **Benutzernamen aus MongoDB abrufen**
async function fetchUsername() {
  try {
      const response = await fetch('/api/auth/user', {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}` // Falls JWT verwendet wird
          },
          credentials: 'include' // Falls Session-Auth verwendet wird
      });

      if (!response.ok) {
          if (response.status === 401) {
              alert("Bitte melde dich zuerst an!");
              window.location.href = "/login"; // Falls Login-Seite existiert
              return null;
          }
          throw new Error(`Server-Fehler: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.username) {
          currentUser = data.username;
          localStorage.setItem('username', currentUser);
          if (data.userId) {
              localStorage.setItem('userId', data.userId);
          }
          return currentUser; // Benutzername erfolgreich geladen
      } else {
          throw new Error("Benutzername nicht gefunden.");
      }
  } catch (error) {
      console.error("Fehler beim Abrufen des Benutzernamens:", error);
      alert("Fehler beim Laden des Benutzernamens.");
      return null;
  }
}

// 🎮 **Neues Spiel erstellen (Host)**
async function createGame() {
  const username = await fetchUsername();
  if (!username) return alert("Bitte melde dich zuerst an!");

  socket.emit('createRoom');
}

// 🏠 **Raum wurde erstellt (Host)**
socket.on('roomCreated', (roomId) => {
  currentRoom = roomId;
  isHost = true;
  showLobby(roomId);
});

// 🚪 **Raum beitreten (Spieler)**
async function joinRoom() {
  const roomCode = document.getElementById("joinRoomId").value;
  const username = await fetchUsername();

  if (!roomCode) return alert("Bitte gib einen gültigen Raumcode ein!");
  if (!username) return alert("Bitte melde dich zuerst an!");

  currentRoom = roomCode;
  socket.emit("joinRoom", { username, roomCode });
}

// 🔄 **Spieler-Liste aktualisieren & Warteraum anzeigen**
socket.on("updatePlayers", (players) => {
  updatePlayerList(players);
  showLobby(currentRoom);  // Warteraum anzeigen, wenn ein Spieler beitritt
});

// ✅ **"Bereit"-Status umschalten**
function toggleReady() {
  if (!currentRoom) return alert("Kein Raum vorhanden.");
  socket.emit("toggleReady", { roomCode: currentRoom });
}

// 🃏 **Deck-Auswahl (nur für Host)**
function selectDeck(deckId) {
  if (!isHost) return alert("Nur der Host kann ein Deck auswählen!");
  socket.emit("selectDeck", { roomCode: currentRoom, deckId });
}

// 🛠 **Raum-Update empfangen (Deck & Spieler)**
socket.on("updateRoom", ({ players, selectedDeck }) => {
  updatePlayerList(players);

  document.getElementById("status").innerText = selectedDeck
      ? `Deck gewählt: ${selectedDeck}`
      : "Warte auf Deck-Auswahl durch den Host...";
});

// ✅ **"Bereit"-Status aktualisieren**
socket.on("readyStatus", (players) => {
  updatePlayerList(players);
});

// 🕒 **Countdown anzeigen**
socket.on("gameStarting", ({ countdown }) => {
  document.getElementById("status").innerText = `Spiel startet in ${countdown} Sekunden...`;
});

// 🚀 **Spiel starten**
socket.on("gameStarted", ({ deckId }) => {
  document.getElementById("status").innerText = "Spiel läuft!";
  startQuiz(deckId);
});

// 🏁 **Quiz starten**
function startQuiz(deckId) {
  console.log(`Quiz gestartet mit Deck: ${deckId}`);
}

// 🏠 **Warteraum anzeigen**
function showLobby(roomId) {
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('lobby').style.display = 'block';
  document.getElementById('roomCode').innerText = roomId;
}

// 👥 **Spielerliste aktualisieren**
function updatePlayerList(players) {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = "";

  players.forEach(player => {
      const li = document.createElement("li");
      li.innerText = `${player.username} - ${player.ready ? "Bereit ✅" : "Nicht bereit ❌"}`;
      playerList.appendChild(li);
  });
}

// 🛠 **Fehlermeldungen anzeigen**
socket.on("error", (message) => {
  alert(message);
});