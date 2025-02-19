require("dotenv").config({ path: __dirname + "/../../.env" }); // Korrekt für dein Projektlayout
const mongoose = require("mongoose");
const Deck = require("../models/Deck");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ Fehler: MONGO_URI ist nicht definiert. Stelle sicher, dass die .env-Datei existiert und korrekt ist.");
    process.exit(1);
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("📌 MongoDB verbunden"))
    .catch(err => {
        console.error("❌ Fehler bei der Verbindung:", err);
        process.exit(1);
    });

    const decks = [
        {
            name: "Java Grundlagen",
            questions: [
                { 
                    question: "Was ist ein primitiver Datentyp?", 
                    options: ["String", "int", "ArrayList"], 
                    correctIndex: 1 
                },
                { 
                    question: "Welche Schleife gibt es in Java?", 
                    options: ["for", "foreach", "while"], 
                    correctIndex: 2 
                },
                { 
                    question: "Wie erstellt man eine Klasse in Java?", 
                    options: ["class MyClass {}", "new MyClass()", "MyClass = class"], 
                    correctIndex: 0 
                }
            ]
        },
        {
            name: "Python Grundlagen",
            questions: [
                { 
                    question: "Wie definiert man eine Funktion?", 
                    options: ["func", "def", "function"], 
                    correctIndex: 1 
                },
                { 
                    question: "Welches Zeichen wird für Listen-Kommentare in Python verwendet?", 
                    options: ["#", "//", "--"], 
                    correctIndex: 0 
                },
                { 
                    question: "Wie erstellt man eine Liste in Python?", 
                    options: ["list = {}", "list = []", "list = ()"], 
                    correctIndex: 1 
                }
            ]
        }
    ];
    

async function seedDatabase() {
    try {
        await Deck.deleteMany();
        await Deck.insertMany(decks);
        console.log("✅ Decks erfolgreich hinzugefügt!");
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Fehler beim Hinzufügen:", error);
        mongoose.connection.close();
    }
}

seedDatabase();
