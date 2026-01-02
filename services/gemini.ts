import { GoogleGenAI } from "@google/genai";
import { DailyPerformance } from "../types";

const API_KEY = process.env.API_KEY;

export const getAIInsight = async (history: DailyPerformance[]): Promise<string> => {
  if (!API_KEY) {
    return "API Key not configured. Unable to generate insights.";
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Prepare data summary for the prompt
  const recentHistory = history.slice(-7); // Last 7 days
  const averageRate = Math.round(recentHistory.reduce((acc, curr) => acc + curr.completionRate, 0) / recentHistory.length);
  const jsonSummary = JSON.stringify(recentHistory.map(h => ({ date: h.date, rate: h.completionRate })));

  const prompt = `
    You are a productivity coach. Here is the task completion performance data for the last 7 days:
    ${jsonSummary}
    
    The average completion rate is ${averageRate}%.
    
    Provide a concise, motivating, and specific 2-sentence insight about this trend. 
    If the trend is going up, praise consistency. If down, suggest a small win.
    Keep it friendly and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Keep pushing forward! Consistency is key.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not retrieve insights at this time.";
  }
};
