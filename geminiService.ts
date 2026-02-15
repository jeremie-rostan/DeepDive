import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Gemini 3 Pro as requested
const MODEL_NAME = 'gemini-3-pro-preview';

export const callGemini = async (prompt: string, systemContext?: string): Promise<string> => {
  if (!ai) {
    console.error("API Key not found in environment variables.");
    return "Error: API Key is missing. Please configure process.env.API_KEY.";
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: systemContext || "You are an expert root cause analysis assistant. Provide objective, concise, and practical analysis.",
      }
    });

    return response.text || "Could not generate response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI assistant. Please try again.";
  }
};