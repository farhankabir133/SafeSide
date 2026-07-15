import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

export async function generateContent(req: Request, res: Response) {
  try {
    const { prompt } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    res.json({ text: result.text });
  } catch (err: any) {
    console.error("[SafeSide AI Generate Proxy] error during inference:", err);
    res.status(422).json({ error: "Oracle connection link failure.", message: err.message });
  }
}

export async function chatWithAssistant(req: Request, res: Response) {
  const { message, history } = req.body;
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    let sdkHistory: any[] = [];
    if (Array.isArray(history)) {
      sdkHistory = history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.parts?.[0]?.text || h.content || h.message || "" }],
      }));
    }

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: sdkHistory,
      config: {
        systemInstruction: `You are the SafeSide Football Intelligence Assistant. You provide tactical analysis grounded exclusively in real telemetry, prediction engine outputs, and verified match data. Never hallucinate statistics, probabilities, or match events. When explaining predictions, always reference specific model outputs (Poisson, Dixon-Coles, Elo, market calibration). When discussing confidence, always reference calibrated confidence intervals and volatility indices. If data is unavailable, explicitly state that data is unavailable rather than fabricating information.`
      },
    });

    const result = await chat.sendMessage({ message });
    res.json({ text: result.text });
  } catch (err: any) {
    res.status(422).json({ error: err.message || "Oracle link failure" });
  }
}
