const express = require('express');
const mongoose = require('mongoose');
const ReportedQuestion = require('../models/ReportedQuestion');
const Question = require('../models/Question');
const QuizDeck = require('../models/QuizDeck');
const User = require('../models/User');
const router = express.Router();


// Neues Deck erstellen (nur Admins)
router.post('/create-deck', async (req, res) => { 
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Deck-Name erforderlich' });
        }

        const newDeck = new QuizDeck({ name, questions: [] });
        await newDeck.save();
        res.json({ message: '✅ Deck erfolgreich erstellt', deck: newDeck });
    } catch (error) {
        console.error('❌ Fehler beim Erstellen des Decks:', error);
        res.status(500).json({ message: 'Fehler beim Erstellen des Decks' });
    }
});



// Alle Decks abrufen
router.get('/decks', async (req, res) => {
    try {
        const decks = await QuizDeck.find();
        res.json({ decks });
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Abrufen der Decks' });
    }
});

// Deck löschen (nur Admins)
router.delete('/delete-deck/:deckId', async (req, res) => {
    try {
        const { deckId } = req.params; // Hole die deckId aus der URL
        if (!deckId) {
            return res.status(400).json({ message: 'Deck-ID erforderlich' });
        }
        await Question.deleteMany({ quizDeckId: deckId });
        await QuizDeck.findByIdAndDelete(deckId);
        res.json({ message: 'Deck erfolgreich gelöscht' });
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Löschen des Decks' });
    }
});



// ✅ Frage zu einem Deck hinzufügen (mit Logging & Fehlerbehandlung)
router.post('/add-question', async (req, res) => {
    try {
        const { quizDeckId, questionText, options, correctOptionIndex } = req.body;

        // 🔍 Validierungsprüfung
        if (!quizDeckId || !questionText || !Array.isArray(options) || options.length !== 4 || correctOptionIndex === undefined) {
            return res.status(400).json({ message: '⚠️ Alle Felder müssen ausgefüllt werden (inklusive genau 4 Antwortmöglichkeiten).' });
        }

        // 🔍 Prüfen, ob das Deck existiert
        const deck = await QuizDeck.findById(quizDeckId);
        if (!deck) {
            return res.status(404).json({ message: '❌ Deck nicht gefunden.' });
        }

        // 📝 Neue Frage speichern
        const question = new Question({ quizDeckId, questionText, options, correctOptionIndex });
        await question.save();

        // 🏗 Frage im Deck speichern
        deck.questions.push(question._id);
        await deck.save();

        res.status(201).json({ message: '✅ Frage erfolgreich hinzugefügt!', question });
    } catch (error) {
        console.error('❌ Fehler beim Hinzufügen der Frage:', error);
        res.status(500).json({ message: 'Fehler beim Hinzufügen der Frage' });
    }
});


// 📥 Fragen eines Decks abrufen
router.get('/questions/:deckId', async (req, res) => {
    try {
        const { deckId } = req.params;

        // Überprüfe, ob das Deck existiert
        const deckExists = await QuizDeck.exists({ _id: deckId });
        if (!deckExists) {
            return res.status(404).json({ message: 'Deck nicht gefunden' });
        }

        // Fragen abrufen
        const questions = await Question.find({ quizDeckId: deckId });
        res.status(200).json({ questions });
    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Fragen:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Fragen' });
    }
});


// **Frage bearbeiten (Admin-Only)**
router.put('/edit-question/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;
        let { questionText, options, correctOptionIndex } = req.body;

        // ✅ Validierung: Alle Felder müssen ausgefüllt sein
        if (!questionText || !Array.isArray(options) || options.length !== 4 || correctOptionIndex === undefined) {
            return res.status(400).json({ 
                message: '⚠️ Alle Felder müssen ausgefüllt werden (inklusive genau 4 Antwortmöglichkeiten).' 
            });
        }

        // ✅ Entferne unnötige Leerzeichen
        questionText = questionText.trim();
        options = options.map(opt => opt.trim());

        // ✅ Validierung: Ist correctOptionIndex eine Zahl zwischen 0-3?
        if (isNaN(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
            return res.status(400).json({ 
                message: '⚠️ Der korrekte Antwortindex muss eine Zahl zwischen 0 und 3 sein.' 
            });
        }

        // ✅ Existiert die Frage?
        const existingQuestion = await Question.findById(questionId);
        if (!existingQuestion) {
            return res.status(404).json({ message: '❌ Frage nicht gefunden.' });
        }

        // ✅ Frage aktualisieren (beste Methode)
        existingQuestion.questionText = questionText;
        existingQuestion.options = options;
        existingQuestion.correctOptionIndex = correctOptionIndex;
        await existingQuestion.save();

        res.status(200).json({
            message: '✅ Frage erfolgreich bearbeitet!',
            updatedQuestion: existingQuestion
        });

    } catch (error) {
        console.error('❌ Fehler beim Bearbeiten der Frage:', error);

        res.status(500).json({ 
            message: '❌ Fehler beim Bearbeiten der Frage. Bitte später erneut versuchen.', 
            error: error.message 
        });
    }
});


// **Frage löschen (Admin-Only)**
router.delete('/delete-question/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;

        // Frage existiert?
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: '❌ Frage nicht gefunden.' });
        }

        // Frage aus dem zugehörigen Deck entfernen
        await QuizDeck.findByIdAndUpdate(question.quizDeckId, {
            $pull: { questions: questionId }
        });

        // Frage löschen
        await Question.findByIdAndDelete(questionId);

        res.status(200).json({ message: '✅ Frage erfolgreich gelöscht!' });
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Frage:', error);
        res.status(500).json({ message: 'Fehler beim Löschen der Frage' });
    }
});


// **1. Frage melden**
let reportedQuestions = new Set(); // Speichert bereits gemeldete Fragen

router.post('/report-question', async (req, res) => {
    try {
        let { questionId, quizDeckId, reportedBy, reason } = req.body;

        console.log("🔍 Anfrage erhalten mit Daten:", req.body);

        if (!questionId || !quizDeckId || !reportedBy || !reason) {
            console.log("❌ Fehlende Daten:", { questionId, quizDeckId, reportedBy, reason });
            return res.status(400).json({ message: 'Alle Felder sind erforderlich' });
        }

        // Überprüfen, ob die Frage bereits gemeldet wurde
        const existingReport = await ReportedQuestion.findOne({ questionId });
        if (existingReport) {
            console.log("⚠️ Diese Frage wurde bereits gemeldet.");
            return res.status(400).json({ message: 'Diese Frage wurde bereits gemeldet.' });
        }

        // ✅ Falls `reportedBy` ein Benutzername ist, suche die User-ID
        const user = await User.findOne({ username: reportedBy });
        if (!user) {
            console.log("❌ Benutzer nicht gefunden:", reportedBy);
            return res.status(400).json({ message: 'Benutzer nicht gefunden' });
        }

        // ✅ Speichere das Report-Objekt mit der echten User-ID
        const report = new ReportedQuestion({
            questionId: new mongoose.Types.ObjectId(questionId),
            quizDeckId: new mongoose.Types.ObjectId(quizDeckId),
            reportedBy: user._id,
            reason
        });

        await report.save();
        console.log("✅ Frage erfolgreich gemeldet!");
        res.json({ message: '✅ Frage wurde erfolgreich gemeldet!' });
    } catch (error) {
        console.error('❌ Fehler beim Melden der Frage:', error);
        res.status(500).json({ message: 'Serverfehler beim Melden der Frage' });
    }
});




// **2. Alle gemeldeten Fragen abrufen**
router.get('/reported-questions', async (req, res) => {
    try {
        const reports = await ReportedQuestion.find({ status: 'pending' })
            .populate({
                path: 'questionId',
                select: 'questionText options correctOptionIndex'
            })
            .populate({
                path: 'quizDeckId',
                select: 'name'
            })
            .populate({
                path: 'reportedBy',
                model: 'User', // Sicherstellen, dass es aus dem User-Modell kommt
                select: 'username'
            });

        console.log("🔍 Reports geladen:", JSON.stringify(reports, null, 2));

        res.json(reports.length ? reports : []); 
    } catch (error) {
        console.error('❌ Fehler beim Abrufen der gemeldeten Fragen:', error);
        res.status(500).json({ message: 'Serverfehler beim Abrufen der gemeldeten Fragen' });
    }
});




// **3. Gemeldete Frage bearbeiten oder löschen**
router.post('/validate-question', async (req, res) => {
    try {
        const { reportId, action, updatedQuestion, updatedOptions, updatedCorrectOption } = req.body;

        if (!reportId || !action) {
            return res.status(400).json({ message: '⚠️ Report ID und Aktion erforderlich.' });
        }

        const report = await ReportedQuestion.findById(reportId);
        if (!report) {
            return res.status(404).json({ message: '❌ Meldung nicht gefunden.' });
        }

        // ✅ 1️⃣ Falls Admin die Meldung ohne Änderungen schließt
        if (action === 'resolve') {
            await ReportedQuestion.findByIdAndDelete(reportId);
            return res.json({ message: '✅ Meldung als erledigt entfernt.' });
        }

        // ✅ 2️⃣ Falls die Frage **bearbeitet** wird
        if (action === 'update' && updatedQuestion && Array.isArray(updatedOptions) && updatedOptions.length === 4) {
            const question = await Question.findById(report.questionId);
            if (!question) {
                return res.status(404).json({ message: '❌ Frage nicht gefunden.' });
            }

            // Aktualisierung der Frage mit allen Details
            question.questionText = updatedQuestion;
            question.options = updatedOptions;
            question.correctOptionIndex = updatedCorrectOption;
            await question.save();

            // Meldung entfernen
            await ReportedQuestion.findByIdAndDelete(reportId);

            return res.json({ message: '✅ Frage erfolgreich aktualisiert und Meldung entfernt.', updatedQuestion: question });
        }

        res.status(400).json({ message: '⚠️ Ungültige Aktion oder fehlende Daten.' });
    } catch (error) {
        console.error('❌ Fehler beim Verarbeiten der Meldung:', error);
        res.status(500).json({ message: '❌ Serverfehler beim Verarbeiten der Meldung.' });
    }
});


// **4. Gemeldete Fragen löschen (Admin-Option)**
router.delete('/delete-reported-question/:id', async (req, res) => {
    try {
        const report = await ReportedQuestion.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: '❌ Meldung nicht gefunden' });
        }

        await ReportedQuestion.findByIdAndDelete(req.params.id);
        res.json({ message: '✅ Meldung erfolgreich gelöscht. Die Frage bleibt erhalten.' });
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Meldung:', error);
        res.status(500).json({ message: '❌ Fehler beim Löschen der Meldung.' });
    }
});


module.exports = router;
