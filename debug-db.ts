import Database from "better-sqlite3";
const db = new Database("submissions.db");
const rows = db.prepare("SELECT * FROM submissions").all();
console.log("DATABASE_CONTENT:", JSON.stringify(rows));
