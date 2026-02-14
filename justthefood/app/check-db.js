const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log("--- DB DIAGNOSTIC START ---");

const dbPath = process.env.DATABASE_PATH || '/data/recipes.db';
console.log(`Target DB Path: ${dbPath}`);

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    try {
        fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
        console.error(`FAILED to create directory: ${e.message}`);
        process.exit(1);
    }
}

try {
    console.log("Attempting to load better-sqlite3...");
    const db = new Database(dbPath, { verbose: console.log });
    console.log("Database opened successfully.");

    db.exec("CREATE TABLE IF NOT EXISTS test_chk (id TEXT PRIMARY KEY, val TEXT)");
    console.log("Table created.");

    db.prepare("INSERT OR REPLACE INTO test_chk (id, val) VALUES (?, ?)").run('test', 'ok');
    console.log("Row inserted.");

    const row = db.prepare("SELECT * FROM test_chk WHERE id = ?").get('test');
    console.log("Row retrieved:", row);

    console.log("--- DB DIAGNOSTIC SUCCESS ---");
} catch (error) {
    console.error("--- DB DIAGNOSTIC FAILED ---");
    console.error(error);
    process.exit(1);
}
