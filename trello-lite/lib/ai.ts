import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedBreakdown {
  subtasks: { title: string }[];
  suggestedLabels: { name: string; color: string }[];
}

// Ultra cost-efficient Flash-Lite models prioritized first for lowest API cost & fast response
const COST_EFFICIENT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];

export async function generateTaskBreakdown(
  title: string,
  description?: string | null
): Promise<GeneratedBreakdown> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Break down the following task card into 3-6 actionable subtasks and suggest 1-3 relevant labels/tags.
Task Title: "${title}"
${description ? `Task Description: "${description}"` : ""}

Provide concise, high-value subtask titles and matching label names with hex colors (e.g., #EF4444 for Urgent/Bug, #3B82F6 for Feature/Tech, #10B981 for Design/Docs, #F59E0B for In Review).`;

  let lastError: unknown;

  for (const modelName of COST_EFFICIENT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                  },
                  required: ["title"],
                },
              },
              suggestedLabels: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    color: { type: Type.STRING },
                  },
                  required: ["name", "color"],
                },
              },
            },
            required: ["subtasks", "suggestedLabels"],
          },
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as GeneratedBreakdown;
      }
    } catch (err) {
      lastError = err;
      // Fail fast to next model silently
    }
  }

  throw lastError || new Error("Unable to generate AI breakdown. Please check your Gemini API key.");
}
