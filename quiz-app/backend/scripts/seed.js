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
                    question: "Was ist ein primitiver Datentyp in Java?", 
                    options: ["String", "int", "ArrayList"], 
                    correctIndex: 1 
                },
                { 
                    question: "Welche der folgenden Schleifenarten existiert in Java?", 
                    options: ["for", "foreach", "do-while"], 
                    correctIndex: 0 
                },                
                { 
                    question: "Wie erstellt man eine Klasse in Java?", 
                    options: ["class MyClass {}", "new MyClass()", "MyClass = class"], 
                    correctIndex: 0 
                },
                { 
                    question: "Was ist der Zweck des 'public' Zugriffsmodifikators in Java?", 
                    options: ["Erlaubt den Zugriff nur innerhalb der Klasse", "Erlaubt den Zugriff von überall", "Schränkt den Zugriff auf private Methoden ein"], 
                    correctIndex: 1 
                }
            ]
        },
        {
            name: "Python Grundlagen",
            questions: [
                { 
                    question: "Wie definiert man eine Funktion in Python?", 
                    options: ["func", "def", "function"], 
                    correctIndex: 1 
                },
                { 
                    question: "Welches Zeichen wird für einzeilige Kommentare in Python verwendet?", 
                    options: ["#", "//", "--"], 
                    correctIndex: 0 
                },
                { 
                    question: "Wie erstellt man eine Liste in Python?", 
                    options: ["list = {}", "list = []", "list = ()"], 
                    correctIndex: 1 
                },
                { 
                    question: "Was ist der Unterschied zwischen einer Liste und einem Tupel in Python?", 
                    options: ["Tupel sind unveränderlich, Listen sind veränderlich", "Listen sind unveränderlich, Tupel sind veränderlich", "Es gibt keinen Unterschied"], 
                    correctIndex: 0 
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
