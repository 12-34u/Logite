const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "logisim_db",
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL database");
    }
});

// Signup API
app.post("/signup", (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.query(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, hashedPassword],
        (err, result) => {
            if (err) {
                console.error("Signup error:", err);
                return res.status(500).json({ message: "Signup failed. Try again!" });
            }
            res.json({ message: "User registered successfully!" });
        }
    );
});

// Login API
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(401).json({ message: "User not found" });

        const user = results[0];
        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        res.json({ message: "Login successful!" });
    });
});

// Save circuit
app.post("/save-circuit", (req, res) => {
    const { email, name, data } = req.body;
    if (!email || !name || !data) return res.status(400).json({ message: "Invalid input." });

    const query = `
        INSERT INTO circuits (user_email, name, data)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data = VALUES(data)
    `;

    db.query(query, [email, name, JSON.stringify(data)], (err) => {
        if (err) {
            console.error("Error saving circuit:", err);
            return res.status(500).json({ message: "Error saving circuit." });
        }
        res.json({ message: "Circuit saved!" });
    });
});

// Get list of circuit names
app.get("/load-circuits", (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Missing email." });

    db.query("SELECT name FROM circuits WHERE user_email = ?", [email], (err, results) => {
        if (err) {
            console.error("Error fetching circuits:", err);
            return res.status(500).json({ message: "Error fetching circuits." });
        }

        const circuits = results.map(row => row.name);
        res.json({ circuits });
    });
});

// Load specific circuit
app.get("/load-circuit", (req, res) => {
    const { email, name } = req.query;
    if (!email || !name) return res.status(400).json({ message: "Missing data." });

    db.query(
        "SELECT data FROM circuits WHERE user_email = ? AND name = ?",
        [email, name],
        (err, results) => {
            if (err) {
                console.error("Error loading circuit:", err);
                return res.status(500).json({ message: "Error loading circuit." });
            }
            if (results.length === 0) return res.json({ message: "No circuit found." });

            res.json({ data: JSON.parse(results[0].data) });
        }
    );
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
