import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const refineReviewText = async (text: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key not found. Returning original text.");
    return text;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful copy editor. Please refine the following solar installation review to be more professional, clear, and concise, while retaining the original sentiment and key details. Do not make it sound fake or overly enthusiastic if the original wasn't. Just polish the grammar and flow.
      
      Original Text:
      "${text}"`,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error refining text with Gemini:", error);
    return text; // Fallback to original
  }
};