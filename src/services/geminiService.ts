import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getFinancialInsights(transactions: Transaction[]) {
  const prompt = `
    Analyze the following financial transactions and provide:
    1. A concise monthly summary of spending behavior.
    2. 3 actionable predictive budgeting suggestions based on trends.
    3. A financial health score (0-100) with a brief justification.
    
    Transactions:
    ${JSON.stringify(transactions, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["warning", "suggestion", "praise"] },
                  message: { type: Type.STRING },
                  actionable: { type: Type.STRING }
                },
                required: ["type", "message"]
              }
            },
            healthScore: { type: Type.NUMBER },
            healthJustification: { type: Type.STRING }
          },
          required: ["summary", "suggestions", "healthScore", "healthJustification"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    return null;
  }
}
