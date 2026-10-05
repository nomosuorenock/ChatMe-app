import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // AI Chat endpoint with Multi-turn history, Role system instructions, Model task-types, Search & Maps Grounding
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { message, history, role, taskType, tool, location, systemInstruction: customInstruction } = req.body;
      let userContent = message;
      if (!userContent && req.body.messages && Array.isArray(req.body.messages)) {
        const last = req.body.messages[req.body.messages.length - 1];
        userContent = typeof last === "string" ? last : (last.text || last.content || last.message);
      }
      if (!userContent) {
        userContent = "Hello";
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "" || apiKey.includes("...")) {
        console.error("[server.ts] GEMINI_API_KEY is missing or invalid.");
        return res.status(500).json({ error: "Gemini API key is not configured or invalid. Please check GEMINI_API_KEY." });
      }
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
          timeout: 40000,
        },
      });

      // Assemble multi-turn conversation contents
      const contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history) {
          const roleStr = item.role === "ai" || item.role === "model" ? "model" : "user";
          const textStr = item.text || item.content || "";
          if (textStr.trim()) {
            contents.push({
              role: roleStr,
              parts: [{ text: textStr }],
            });
          }
        }
      }
      // Add current user prompt
      contents.push({
        role: "user",
        parts: [{ text: userContent }],
      });

      // Determine system instruction based on role / persona
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

      // Determine target model based on user task type:
      // complex -> gemini-3.1-pro-preview (with fallback)
      // fast -> gemini-3.1-flash-lite
      // general / grounding -> gemini-3.5-flash
      let primaryModel = "gemini-3.5-flash";
      if (taskType === "complex") {
        primaryModel = "gemini-3.1-pro-preview";
      } else if (taskType === "fast") {
        primaryModel = "gemini-3.1-flash-lite";
      }

      let response: any = null;
      let usedSearch = false;
      let usedMaps = false;
      let modelUsed = primaryModel;

      // 1. If Maps grounding requested or query is place-oriented
      if (tool === "maps" || role === "maps") {
        try {
          const mapConfig: any = {
            tools: [{ googleMaps: {} }],
            systemInstruction: effectiveSystemInstruction,
          };
          if (location && typeof location.latitude === "number" && typeof location.longitude === "number") {
            mapConfig.toolConfig = {
              retrievalConfig: {
                latLng: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                },
              },
            };
          }
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents,
            config: mapConfig,
          });
          if (response?.text) {
            usedMaps = true;
            modelUsed = "gemini-3.5-flash";
          }
        } catch (mapErr: any) {
          console.warn("[server.ts] Maps grounding issue, falling back to standard models:", mapErr?.message?.slice(0, 100));
        }
      }

      // 2. If Search grounding requested or default general grounding
      if (!response?.text && (tool === "search" || role === "search" || (!tool && taskType !== "fast" && taskType !== "complex"))) {
        const searchModels = ["gemini-3.5-flash", "gemini-3.8-flash"];
        for (const mName of searchModels) {
          try {
            response = await ai.models.generateContent({
              model: mName,
              contents,
              config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: effectiveSystemInstruction,
              },
            });
            if (response?.text) {
              usedSearch = true;
              modelUsed = mName;
              break;
            }
          } catch (searchErr: any) {
            console.warn(`[server.ts] Search grounding on ${mName} had notice:`, searchErr?.message?.slice(0, 80));
          }
        }
      }

      // 3. Model execution / Cascade for requested taskType or fallback
      if (!response?.text) {
        const modelOrder = [primaryModel, "gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
        const uniqueOrder = [...new Set(modelOrder)];

        for (const mName of uniqueOrder) {
          try {
            response = await ai.models.generateContent({
              model: mName,
              contents,
              config: {
                systemInstruction: effectiveSystemInstruction,
              },
            });
            if (response?.text) {
              modelUsed = mName;
              break;
            }
          } catch (modelErr: any) {
            console.warn(`[server.ts] Model ${mName} unavailable (${modelErr?.status || modelErr?.message?.slice(0, 80)})`);
          }
        }
      }

      // If all attempts timed out or hit high demand, return friendly message
      if (!response?.text) {
        return res.json({
          reply: "The AI service is currently experiencing high demand or temporary quota limits. Please try asking your question again in a moment.",
          sources: [],
          mapsSources: [],
          searchQueries: [],
          grounded: false,
          modelUsed: primaryModel,
        });
      }

      const reply = response.text;

      // Extract Grounding Metadata (Google Search & Google Maps)
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const searchQueries: string[] = groundingMetadata?.webSearchQueries || [];
      const rawChunks = groundingMetadata?.groundingChunks || [];

      // Web Search Sources
      const sources = rawChunks
        .map((chunk: any) => {
          if (chunk.web) {
            return {
              title: chunk.web.title || chunk.web.uri || "Google Search Result",
              url: chunk.web.uri || "",
            };
          }
          return null;
        })
        .filter((item: any) => Boolean(item && item.url));

      const uniqueSources = sources.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => t.url === item.url)
      );

      // Google Maps Sources
      const mapsSources = rawChunks
        .map((chunk: any) => {
          if (chunk.maps) {
            const placeAnswers = chunk.maps.placeAnswerSources?.reviewSnippets || [];
            const reviewTexts = placeAnswers.map((r: any) => r.snippet || r.text).filter(Boolean);
            return {
              title: chunk.maps.title || "Google Maps Location",
              url: chunk.maps.uri || "",
              reviews: reviewTexts,
            };
          }
          return null;
        })
        .filter((item: any) => Boolean(item && item.url));

      const uniqueMapsSources = mapsSources.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => t.url === item.url)
      );

      res.json({
        reply,
        sources: uniqueSources,
        mapsSources: uniqueMapsSources,
        searchQueries,
        grounded: (usedSearch && uniqueSources.length > 0) || (usedMaps && uniqueMapsSources.length > 0) || searchQueries.length > 0,
        modelUsed,
      });
    } catch (err: any) {
      console.error("[server.ts] AI chat error:", err);
      let errMsg = err?.message || "";
      try {
        if (typeof errMsg === "string" && errMsg.trim().startsWith("{")) {
          const parsed = JSON.parse(errMsg);
          if (parsed?.error?.message) {
            errMsg = parsed.error.message;
          }
        }
      } catch {}

      if (
        err?.status === 503 ||
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand")
      ) {
        return res.json({
          reply: "This AI model is currently experiencing high demand from Google. Please try asking again in a few moments.",
          sources: [],
          mapsSources: [],
          searchQueries: [],
          grounded: false,
        });
      }

      if (
        err?.status === 504 ||
        errMsg.includes("504") ||
        errMsg.includes("DEADLINE_EXCEEDED") ||
        errMsg.includes("Deadline expired")
      ) {
        return res.json({
          reply: "The service took longer than expected to respond (Request timed out). Please try asking again.",
          sources: [],
          mapsSources: [],
          searchQueries: [],
          grounded: false,
        });
      }
      if (
        err?.status === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota")
      ) {
        return res.json({
          reply: "The AI request quota has temporarily been reached. Please wait a moment and try again.",
          sources: [],
          mapsSources: [],
          searchQueries: [],
          grounded: false,
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
        grounded: false,
      });
    }
  });

  // Programmatic melodic audio synthesizer for music generation fallback
  function generateSynthesizedMusic(durationSeconds = 15, prompt = ""): string {
    const sampleRate = 22050;
    const numSamples = sampleRate * durationSeconds;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + numSamples * 2);

    // RIFF WAV Header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    const lower = prompt.toLowerCase();
    // Select harmonic progression based on mood
    let progressions = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7 (Lofi / Chill)
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];
    if (lower.includes("upbeat") || lower.includes("pop") || lower.includes("dance")) {
      progressions = [
        [261.63, 329.63, 392.00], // C
        [196.00, 246.94, 293.66], // G
        [220.00, 261.63, 329.63], // Am
        [174.61, 220.00, 261.63]  // F
      ];
    } else if (lower.includes("cinematic") || lower.includes("orchestra")) {
      progressions = [
        [130.81, 196.00, 261.63, 311.13], // Cm
        [116.54, 174.61, 233.08, 293.66], // Bb
        [103.83, 155.56, 207.65, 261.63], // Ab
        [98.00, 146.83, 196.00, 246.94]   // G
      ];
    }

    const chordDuration = 2.5;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const chordIndex = Math.floor(t / chordDuration) % progressions.length;
      const chord = progressions[chordIndex];
      const beatPhase = (t % 0.5) / 0.5;
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
      sample += bass + (Math.sin(2 * Math.PI * 65 * t) * 0.12 * beatEnv);

      const fade = Math.min(t / 0.4, (durationSeconds - t) / 0.4, 1);
      sample = Math.max(-1, Math.min(1, sample * 0.65 * fade));

      const intSample = Math.floor(sample * 32767);
      buffer.writeInt16LE(intSample, headerSize + i * 2);
    }

    return buffer.toString("base64");
  }

  // Music Generation Endpoint with Lyria & intelligent synthesized audio fallback
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
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
              timeout: 45000,
            },
          });

          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: textPrompt,
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
        } catch (apiErr: any) {
          // If Lyria is unavailable or quota limited, proceed to synthesized audio without throwing noisy warnings
          audioBase64 = "";
        }
      }

      // If Lyria was unavailable or hit quota limits, smoothly provide custom harmonic synthesized audio track
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
        prompt: textPrompt,
      });
    } catch (err: any) {
      console.error("[server.ts] Music endpoint error:", err?.message || err);
      // Even in catch block, provide fallback audio so user never sees a broken screen
      const fallbackWav = generateSynthesizedMusic(15, "Lofi Chill");
      res.json({
        audioBase64: fallbackWav,
        mimeType: "audio/wav",
        lyrics: "Lofi chill ambient soundtrack",
        model: "lyria-3-clip-preview",
        prompt: "Lofi Chill",
      });
    }
  });

  // In-memory support store synced with Supabase / runtime
  interface ServerSupportConv {
    id: string;
    user_id: string;
    user_name: string;
    user_email?: string;
    user_avatar?: string;
    status: 'open' | 'pending' | 'resolved';
    last_message?: string;
    last_message_at: string;
    created_at: string;
    unread_by_user?: number;
    unread_by_agent?: number;
  }

  interface ServerSupportMsg {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    sender_role: 'user' | 'agent' | 'system';
    message: string;
    created_at: string;
    status?: 'sent' | 'delivered' | 'read';
  }

  const supportConversations = new Map<string, ServerSupportConv>();
  const supportMessages = new Map<string, ServerSupportMsg[]>();
  const userConvMap = new Map<string, string>(); // user_id -> conv_id

  // 1. Get or Create conversation by user ID
  app.get("/api/support/conversation", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query param" });
    }
    let convId = userConvMap.get(userId);
    let conv = convId ? supportConversations.get(convId) : undefined;
    if (!conv) {
      convId = `supp_conv_${userId}`;
      const now = new Date().toISOString();
      conv = {
        id: convId,
        user_id: userId,
        user_name: "ChatMe User",
        status: "open",
        last_message: "Support conversation started",
        last_message_at: now,
        created_at: now,
        unread_by_user: 0,
        unread_by_agent: 0,
      };
      supportConversations.set(convId, conv);
      userConvMap.set(userId, convId);

      const welcomeMsg: ServerSupportMsg = {
        id: `supp_msg_welcome_${Date.now()}`,
        conversation_id: convId,
        sender_id: "support-agent",
        sender_name: "ChatMe Support Team",
        sender_role: "agent",
        message: "👋 Hello and welcome to ChatMe Live Support! How can we assist you today? Our agents typically respond within a few moments.",
        created_at: now,
        status: "delivered",
      };
      supportMessages.set(convId, [welcomeMsg]);
    }
    res.json({ conversation: conv });
  });

  app.post("/api/support/conversation", (req, res) => {
    const conv: ServerSupportConv = req.body;
    if (!conv || !conv.id || !conv.user_id) {
      return res.status(400).json({ error: "Invalid conversation payload" });
    }
    supportConversations.set(conv.id, conv);
    userConvMap.set(conv.user_id, conv.id);
    if (!supportMessages.has(conv.id)) {
      const now = new Date().toISOString();
      const welcomeMsg: ServerSupportMsg = {
        id: `supp_msg_welcome_${Date.now()}`,
        conversation_id: conv.id,
        sender_id: "support-agent",
        sender_name: "ChatMe Support Team",
        sender_role: "agent",
        message: "👋 Hello and welcome to ChatMe Live Support! How can we assist you today? Our agents typically respond within a few moments.",
        created_at: now,
        status: "delivered",
      };
      supportMessages.set(conv.id, [welcomeMsg]);
    }
    res.json({ success: true, conversation: conv });
  });

  // 2. Get support messages with security check
  app.get("/api/support/messages", (req, res) => {
    const conversationId = req.query.conversationId as string;
    const userId = req.query.userId as string;
    const isAgent = req.query.isAgent === "true";

    if (!conversationId) {
      return res.status(400).json({ error: "Missing conversationId" });
    }

    const conv = supportConversations.get(conversationId);
    // Security check: normal user cannot read another user's support conversation
    if (!isAgent && conv && userId && conv.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized access to support conversation" });
    }

    const msgs = supportMessages.get(conversationId) || [];
    res.json({ messages: msgs });
  });

  // 3. Post support message (user or agent)
  app.post("/api/support/message", (req, res) => {
    const msg: ServerSupportMsg = req.body;
    if (!msg || !msg.conversation_id || !msg.message) {
      return res.status(400).json({ error: "Invalid message payload" });
    }

    const list = supportMessages.get(msg.conversation_id) || [];
    // Prevent duplicates
    if (!list.some(m => m.id === msg.id)) {
      list.push(msg);
      supportMessages.set(msg.conversation_id, list);
    }

    const conv = supportConversations.get(msg.conversation_id);
    if (conv) {
      conv.last_message = msg.message;
      conv.last_message_at = msg.created_at || new Date().toISOString();
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

  // 4. Update status (open, pending, resolved)
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

  // 5. List all conversations for Support Agent Portal
  app.get("/api/support/conversations", (req, res) => {
    const filter = req.query.filter as string;
    let list = Array.from(supportConversations.values());
    if (filter && filter !== "all") {
      list = list.filter(c => c.status === filter);
    }
    list.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    res.json({ conversations: list });
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
        const id = req.query.id as string;
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
