import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // AI Chat endpoint using Gemini API
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "" || apiKey.includes("...")) {
        console.error("[server.ts] GEMINI_API_KEY is missing or invalid.");
        return res.status(500).json({ error: "Gemini API key is not configured or invalid. Please check GEMINI_API_KEY." });
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: message,
      });
      const reply = response.text || "I'm here to help!";
      res.json({ reply });
    } catch (err: any) {
      console.error("[server.ts] AI chat error:", err);
      if (err.message && (err.message.includes("API key") || err.message.includes("API_KEY") || err.message.includes("invalid"))) {
        return res.status(500).json({ error: "Gemini API key is invalid or unauthorized. Please verify your GEMINI_API_KEY." });
      }
      res.status(500).json({ error: err.message || "Failed to generate AI response" });
    }
  });

  // Supabase proxy route
  app.use("/api/supabase", async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Supabase credentials not configured" });
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const apiPath = req.path.replace(/^\//, "");
      const { data, error } = await supabase.from(apiPath).select("*");
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Proxy error" });
    }
  });

  // Vite middleware for development vs static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
