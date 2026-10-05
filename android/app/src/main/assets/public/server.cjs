var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_supabase_js = require("@supabase/supabase-js");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  app.use(import_express.default.json());
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { message, history, role, taskType, tool, location, systemInstruction: customInstruction } = req.body;
      let userContent = message;
      if (!userContent && req.body.messages && Array.isArray(req.body.messages)) {
        const last = req.body.messages[req.body.messages.length - 1];
        userContent = typeof last === "string" ? last : last.text || last.content || last.message;
      }
      if (!userContent) {
        userContent = "Hello";
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "" || apiKey.includes("...")) {
        console.error("[server.ts] GEMINI_API_KEY is missing or invalid.");
        return res.status(500).json({ error: "Gemini API key is not configured or invalid. Please check GEMINI_API_KEY." });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          },
          timeout: 4e4
        }
      });
      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history) {
          const roleStr = item.role === "ai" || item.role === "model" ? "model" : "user";
          const textStr = item.text || item.content || "";
          if (textStr.trim()) {
            contents.push({
              role: roleStr,
              parts: [{ text: textStr }]
            });
          }
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: userContent }]
      });
      let effectiveSystemInstruction = customInstruction || "You are ChatMe Assistant, an intelligent, empathetic, and knowledgeable AI companion built into the ChatMe messaging app.";
      if (role === "expert" || taskType === "complex") {
        effectiveSystemInstruction = "You are ChatMe Deep Reasoning Expert. Provide rigorous, in-depth analysis, comprehensive explanations, step-by-step logic, and clean code or mathematical derivations.";
      } else if (role === "fast" || taskType === "fast") {
        effectiveSystemInstruction = "You are ChatMe Fast Responder. Answer questions with maximum speed, conciseness, and precision without unnecessary filler words.";
      } else if (role === "maps" || tool === "maps") {
        effectiveSystemInstruction = "You are ChatMe Local Guide & Navigator. Help users discover restaurants, cafes, local attractions, directions, and places using Google Maps data. Always highlight key details and recommendations.";
      } else if (role === "search" || tool === "search") {
        effectiveSystemInstruction = "You are ChatMe Research Assistant. Use real-time Google Search information to answer with the latest facts, live scores, news, and verifiable sources.";
      }
      let primaryModel = "gemini-3.5-flash";
      if (taskType === "complex") {
        primaryModel = "gemini-3.1-pro-preview";
      } else if (taskType === "fast") {
        primaryModel = "gemini-3.1-flash-lite";
      }
      let response = null;
      let usedSearch = false;
      let usedMaps = false;
      let modelUsed = primaryModel;
      if (tool === "maps" || role === "maps") {
        try {
          const mapConfig = {
            tools: [{ googleMaps: {} }],
            systemInstruction: effectiveSystemInstruction
          };
          if (location && typeof location.latitude === "number" && typeof location.longitude === "number") {
            mapConfig.toolConfig = {
              retrievalConfig: {
                latLng: {
                  latitude: location.latitude,
                  longitude: location.longitude
                }
              }
            };
          }
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents,
            config: mapConfig
          });
          if (response?.text) {
            usedMaps = true;
            modelUsed = "gemini-3.5-flash";
          }
        } catch (mapErr) {
          console.warn("[server.ts] Maps grounding issue, falling back to standard models:", mapErr?.message?.slice(0, 100));
        }
      }
      if (!response?.text && (tool === "search" || role === "search" || !tool && taskType !== "fast" && taskType !== "complex")) {
        const searchModels = ["gemini-3.5-flash", "gemini-3.8-flash"];
        for (const mName of searchModels) {
          try {
            response = await ai.models.generateContent({
              model: mName,
              contents,
              config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: effectiveSystemInstruction
              }
            });
            if (response?.text) {
              usedSearch = true;
              modelUsed = mName;
              break;
            }
          } catch (searchErr) {
            console.warn(`[server.ts] Search grounding on ${mName} had notice:`, searchErr?.message?.slice(0, 80));
          }
        }
      }
      if (!response?.text) {
        const modelOrder = [primaryModel, "gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
        const uniqueOrder = [...new Set(modelOrder)];
        for (const mName of uniqueOrder) {
          try {
            response = await ai.models.generateContent({
              model: mName,
              contents,
              config: {
                systemInstruction: effectiveSystemInstruction
              }
            });
            if (response?.text) {
              modelUsed = mName;
              break;
            }
          } catch (modelErr) {
            console.warn(`[server.ts] Model ${mName} unavailable (${modelErr?.status || modelErr?.message?.slice(0, 80)})`);
          }
        }
      }
      if (!response?.text) {
        return res.json({
          reply: "The AI service is currently experiencing high demand or temporary quota limits. Please try asking your question again in a moment.",
          sources: [],
          mapsSources: [],
          searchQueries: [],
          grounded: false,
          modelUsed: primaryModel
        });
      }
      const reply = response.text;
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const searchQueries = groundingMetadata?.webSearchQueries || [];
      const rawChunks = groundingMetadata?.groundingChunks || [];
      const sources = rawChunks.map((chunk) => {
        if (chunk.web) {
          return {
            title: chunk.web.title || chunk.web.uri || "Google Search Result",
            url: chunk.web.uri || ""
          };
        }
        return null;
      }).filter((item) => Boolean(item && item.url));
      const uniqueSources = sources.filter(
        (item, index, self) => index === self.findIndex((t) => t.url === item.url)
      );
      const mapsSources = rawChunks.map((chunk) => {
        if (chunk.maps) {
          const placeAnswers = chunk.maps.placeAnswerSources?.reviewSnippets || [];
          const reviewTexts = placeAnswers.map((r) => r.snippet || r.text).filter(Boolean);
          return {
            title: chunk.maps.title || "Google Maps Location",
            url: chunk.maps.uri || "",
            reviews: reviewTexts
          };
        }
        return null;
      }).filter((item) => Boolean(item && item.url));
      const uniqueMapsSources = mapsSources.filter(
        (item, index, self) => index === self.findIndex((t) => t.url === item.url)
      );
      res.json({
        reply,
        sources: uniqueSources,
        mapsSources: uniqueMapsSources,
        searchQueries,
        grounded: usedSearch && uniqueSources.length > 0 || usedMaps && uniqueMapsSources.length > 0 || searchQueries.length > 0,
        modelUsed
      });
    } catch (err) {
      console.error("[server.ts] AI chat error:", err);
      let errMsg = err?.message || "";
      try {
        if (typeof errMsg === "string" && errMsg.trim().startsWith("{")) {
          const parsed = JSON.parse(errMsg);
          if (parsed?.error?.message) {
            errMsg = parsed.error.message;
          }
        }
      } catch {
      }
      if (err?.status === 503 || errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand")) {
        return res.json({
          reply: "This AI model is currently experiencing high demand from Google. Please try asking again in a few moments.",
          sources: [],
          mapsSources: [],
          searchQueries: [],
          grounded: false
        });
      }
      if (err?.status === 504 || errMsg.includes("504") || errMsg.includes("DEADLINE_EXCEEDED") || errMsg.includes("Deadline expired")) {
        return res.json({
          reply: "The service took longer than expected to respond (Request timed out). Please try asking again.",
          sources: [],
          mapsSources: [],
          searchQueries: [],
          grounded: false
        });
      }
      if (err?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        return res.json({
          reply: "The AI request quota has temporarily been reached. Please wait a moment and try again.",
          sources: [],
          mapsSources: [],
          searchQueries: [],
          grounded: false
        });
      }
      if (errMsg.includes("API key") || errMsg.includes("API_KEY") || errMsg.includes("invalid")) {
        return res.status(500).json({ error: "Gemini API key is invalid or unauthorized. Please verify your GEMINI_API_KEY." });
      }
      res.json({
        reply: "I am momentarily unavailable to answer. Please try asking again.",
        sources: [],
        mapsSources: [],
        searchQueries: [],
        grounded: false
      });
    }
  });
  function generateSynthesizedMusic(durationSeconds = 15, prompt = "") {
    const sampleRate = 22050;
    const numSamples = sampleRate * durationSeconds;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + numSamples * 2);
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(numSamples * 2, 40);
    const lower = prompt.toLowerCase();
    let progressions = [
      [261.63, 329.63, 392, 493.88],
      // Cmaj7 (Lofi / Chill)
      [220, 261.63, 329.63, 392],
      // Am7
      [174.61, 220, 261.63, 329.63],
      // Fmaj7
      [196, 246.94, 293.66, 349.23]
      // G7
    ];
    if (lower.includes("upbeat") || lower.includes("pop") || lower.includes("dance")) {
      progressions = [
        [261.63, 329.63, 392],
        // C
        [196, 246.94, 293.66],
        // G
        [220, 261.63, 329.63],
        // Am
        [174.61, 220, 261.63]
        // F
      ];
    } else if (lower.includes("cinematic") || lower.includes("orchestra")) {
      progressions = [
        [130.81, 196, 261.63, 311.13],
        // Cm
        [116.54, 174.61, 233.08, 293.66],
        // Bb
        [103.83, 155.56, 207.65, 261.63],
        // Ab
        [98, 146.83, 196, 246.94]
        // G
      ];
    }
    const chordDuration = 2.5;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const chordIndex = Math.floor(t / chordDuration) % progressions.length;
      const chord = progressions[chordIndex];
      const beatPhase = t % 0.5 / 0.5;
      const beatEnv = Math.exp(-beatPhase * 4);
      let sample = 0;
      for (let c = 0; c < chord.length; c++) {
        const freq = chord[c];
        const tone = Math.sin(2 * Math.PI * freq * t) * 0.14;
        const sub = Math.sin(2 * Math.PI * (freq / 2) * t) * 0.08;
        sample += tone + sub;
      }
      const bassFreq = chord[0] / 2;
      const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.18 * Math.exp(-(t % 1) * 2);
      sample += bass + Math.sin(2 * Math.PI * 65 * t) * 0.12 * beatEnv;
      const fade = Math.min(t / 0.4, (durationSeconds - t) / 0.4, 1);
      sample = Math.max(-1, Math.min(1, sample * 0.65 * fade));
      const intSample = Math.floor(sample * 32767);
      buffer.writeInt16LE(intSample, headerSize + i * 2);
    }
    return buffer.toString("base64");
  }
  app.post("/api/generate-music", async (req, res) => {
    try {
      const { prompt, mode } = req.body;
      const textPrompt = (prompt || "Upbeat rhythmic lofi chill track with warm acoustic tones").trim();
      const isClip = mode !== "full";
      const modelName = isClip ? "lyria-3-clip-preview" : "lyria-3-pro-preview";
      const apiKey = process.env.GEMINI_API_KEY;
      let audioBase64 = "";
      let lyrics = "";
      let mimeType = "audio/wav";
      if (apiKey && apiKey.trim() !== "" && !apiKey.includes("...")) {
        try {
          const ai = new import_genai.GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build"
              },
              timeout: 45e3
            }
          });
          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: textPrompt
          });
          for await (const chunk of responseStream) {
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (!parts) continue;
            for (const part of parts) {
              if (part.inlineData?.data) {
                if (!audioBase64 && part.inlineData.mimeType) {
                  mimeType = part.inlineData.mimeType;
                }
                audioBase64 += part.inlineData.data;
              }
              if (part.text && !lyrics) {
                lyrics = part.text;
              }
            }
          }
        } catch (apiErr) {
          audioBase64 = "";
        }
      }
      if (!audioBase64) {
        const trackDuration = isClip ? 15 : 25;
        audioBase64 = generateSynthesizedMusic(trackDuration, textPrompt);
        lyrics = `Harmonic acoustic melody composed for "${textPrompt.slice(0, 40)}"`;
      }
      res.json({
        audioBase64,
        mimeType,
        lyrics,
        model: modelName,
        prompt: textPrompt
      });
    } catch (err) {
      console.error("[server.ts] Music endpoint error:", err?.message || err);
      const fallbackWav = generateSynthesizedMusic(15, "Lofi Chill");
      res.json({
        audioBase64: fallbackWav,
        mimeType: "audio/wav",
        lyrics: "Lofi chill ambient soundtrack",
        model: "lyria-3-clip-preview",
        prompt: "Lofi Chill"
      });
    }
  });
  const supportConversations = /* @__PURE__ */ new Map();
  const supportMessages = /* @__PURE__ */ new Map();
  const userConvMap = /* @__PURE__ */ new Map();
  app.get("/api/support/conversation", (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query param" });
    }
    let convId = userConvMap.get(userId);
    let conv = convId ? supportConversations.get(convId) : void 0;
    if (!conv) {
      convId = `supp_conv_${userId}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      conv = {
        id: convId,
        user_id: userId,
        user_name: "ChatMe User",
        status: "open",
        last_message: "Support conversation started",
        last_message_at: now,
        created_at: now,
        unread_by_user: 0,
        unread_by_agent: 0
      };
      supportConversations.set(convId, conv);
      userConvMap.set(userId, convId);
      const welcomeMsg = {
        id: `supp_msg_welcome_${Date.now()}`,
        conversation_id: convId,
        sender_id: "support-agent",
        sender_name: "ChatMe Support Team",
        sender_role: "agent",
        message: "\u{1F44B} Hello and welcome to ChatMe Live Support! How can we assist you today? Our agents typically respond within a few moments.",
        created_at: now,
        status: "delivered"
      };
      supportMessages.set(convId, [welcomeMsg]);
    }
    res.json({ conversation: conv });
  });
  app.post("/api/support/conversation", (req, res) => {
    const conv = req.body;
    if (!conv || !conv.id || !conv.user_id) {
      return res.status(400).json({ error: "Invalid conversation payload" });
    }
    supportConversations.set(conv.id, conv);
    userConvMap.set(conv.user_id, conv.id);
    if (!supportMessages.has(conv.id)) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const welcomeMsg = {
        id: `supp_msg_welcome_${Date.now()}`,
        conversation_id: conv.id,
        sender_id: "support-agent",
        sender_name: "ChatMe Support Team",
        sender_role: "agent",
        message: "\u{1F44B} Hello and welcome to ChatMe Live Support! How can we assist you today? Our agents typically respond within a few moments.",
        created_at: now,
        status: "delivered"
      };
      supportMessages.set(conv.id, [welcomeMsg]);
    }
    res.json({ success: true, conversation: conv });
  });
  app.get("/api/support/messages", (req, res) => {
    const conversationId = req.query.conversationId;
    const userId = req.query.userId;
    const isAgent = req.query.isAgent === "true";
    if (!conversationId) {
      return res.status(400).json({ error: "Missing conversationId" });
    }
    const conv = supportConversations.get(conversationId);
    if (!isAgent && conv && userId && conv.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized access to support conversation" });
    }
    const msgs = supportMessages.get(conversationId) || [];
    res.json({ messages: msgs });
  });
  app.post("/api/support/message", (req, res) => {
    const msg = req.body;
    if (!msg || !msg.conversation_id || !msg.message) {
      return res.status(400).json({ error: "Invalid message payload" });
    }
    const list = supportMessages.get(msg.conversation_id) || [];
    if (!list.some((m) => m.id === msg.id)) {
      list.push(msg);
      supportMessages.set(msg.conversation_id, list);
    }
    const conv = supportConversations.get(msg.conversation_id);
    if (conv) {
      conv.last_message = msg.message;
      conv.last_message_at = msg.created_at || (/* @__PURE__ */ new Date()).toISOString();
      if (msg.sender_role === "user") {
        conv.status = "open";
        conv.unread_by_agent = (conv.unread_by_agent || 0) + 1;
      } else {
        conv.unread_by_user = (conv.unread_by_user || 0) + 1;
      }
      supportConversations.set(msg.conversation_id, conv);
    }
    res.json({ success: true, message: msg });
  });
  app.post("/api/support/status", (req, res) => {
    const { conversationId, status } = req.body;
    if (!conversationId || !status) {
      return res.status(400).json({ error: "Missing conversationId or status" });
    }
    const conv = supportConversations.get(conversationId);
    if (conv) {
      conv.status = status;
      supportConversations.set(conversationId, conv);
      return res.json({ success: true, conversation: conv });
    }
    res.status(404).json({ error: "Conversation not found" });
  });
  app.get("/api/support/conversations", (req, res) => {
    const filter = req.query.filter;
    let list = Array.from(supportConversations.values());
    if (filter && filter !== "all") {
      list = list.filter((c) => c.status === filter);
    }
    list.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    res.json({ conversations: list });
  });
  app.use("/api/supabase", async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Supabase credentials not configured" });
    }
    try {
      const supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
      const apiPath = req.path.replace(/^\//, "");
      if (req.method === "GET") {
        const { data, error } = await supabase.from(apiPath).select("*");
        if (error) return res.status(400).json({ error: error.message });
        return res.json(data);
      } else if (req.method === "POST") {
        const { data, error } = await supabase.from(apiPath).insert(req.body).select();
        if (error) return res.status(400).json({ error: error.message });
        return res.json(data);
      } else if (req.method === "PUT" || req.method === "PATCH") {
        const { data, error } = await supabase.from(apiPath).upsert(req.body).select();
        if (error) return res.status(400).json({ error: error.message });
        return res.json(data);
      } else if (req.method === "DELETE") {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "Missing ID for deletion" });
        const { data, error } = await supabase.from(apiPath).delete().eq("id", id);
        if (error) return res.status(400).json({ error: error.message });
        return res.json(data);
      } else {
        return res.status(405).json({ error: "Method not allowed" });
      }
    } catch (err) {
      res.status(500).json({ error: "Proxy error" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.use((req, res, next) => {
      if (req.method === "GET" && !req.path.startsWith("/api")) {
        return res.sendFile(import_path.default.join(distPath, "index.html"));
      }
      next();
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
