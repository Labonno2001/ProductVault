
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Vercel's application directory is read-only.
// Use temporary storage on Vercel and the local data folder on your PC.
const isVercel = process.env.VERCEL === "1";

const dataDirectory = isVercel
  ? path.join("/tmp", "productvault-data")
  : path.join(__dirname, "data");

const dbPath = path.join(dataDirectory, "productvault.db");

// Create the database directory if it does not exist.
fs.mkdirSync(dataDirectory, { recursive: true });

// Connect to SQLite.
const db = new Database(dbPath);

// Enable foreign key support.
db.pragma("foreign_keys = ON");

// Create database tables.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL CHECK (price >= 0),
    image_path TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log(
  `SQLite database connected successfully. Environment: ${
    isVercel ? "Vercel temporary storage" : "Local storage"
  }`
);

module.exports = db;
