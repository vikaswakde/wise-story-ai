import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  SceneDescription,
  StoryContent,
  StoryStructure,
} from "@/types/story";

interface StoryContext {
  title: string;
  description?: string;
  ageGroup: string;
  language: string;
}

export class GeminiService {
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  private cleanJsonResponse(response: string): string {
    try {
      // First try to parse as is
      JSON.parse(response);
      return response;
    } catch {
      // If that fails, try to find JSON content
      const jsonMatch = /\{[\s\S]*\}/.exec(response);
      if (jsonMatch) {
        const potentialJson = jsonMatch[0];
        try {
          JSON.parse(potentialJson);
          return potentialJson;
        } catch {
          // If that fails, try additional cleaning
          const cleaned = potentialJson
            .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
            .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes
            .replace(/\n\s*\n/g, "\n") // Remove multiple newlines
            .trim();

          JSON.parse(cleaned); // Validate
          console.log("this is cleaned", cleaned);
          return cleaned;
        }
      }
      throw new Error("No valid JSON found in response");
    }
  }

  private async safeGenerateContent(prompt: string) {
    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  prompt +
                  "\n\nIMPORTANT: Respond ONLY with the JSON object. Do not add any additional text, explanations, or formatting.",
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
        },
      });

      const response = result.response.text();
      return this.cleanJsonResponse(response);
    } catch (error) {
      console.error("API call failed:", error);
      throw new Error("Failed to generate content");
    }
  }

  async generateStoryContent(context: StoryContext): Promise<StoryContent> {
    try {
      const prompt = `You are a JSON-only story generation API. Generate a children's story with these parameters:
- Age: ${context.ageGroup}
- Title: "${context.title}"
${context.description ? `- Description: "${context.description}"` : ""}
- Language: ${context.language}

Return ONLY a JSON object with this structure (no other text):
{
  "structure": {
    "introduction": "string",
    "chapters": [
      {
        "title": "string",
        "content": "string",
        "mood": "string"
      }
    ],
    "conclusion": "string"
  },
  "scenes": [
    {
      "chapter": number,
      "setting": "string",
      "characters": ["string"],
      "action": "string",
      "mood": "string",
      "visualDetails": "string"
    }
  ],
  "imagePrompts": ["string"]
}`;

      const response = await this.safeGenerateContent(prompt);
      const parsed = JSON.parse(response) as StoryContent;

      // Additional validation
      if (
        !parsed.structure ||
        !Array.isArray(parsed.scenes) ||
        !Array.isArray(parsed.imagePrompts)
      ) {
        throw new Error("Generated content missing required fields");
      }

      console.log("this is parsed", parsed);
      return parsed;
    } catch (error) {
      console.error("Failed to generate story content:", error);
      throw error;
    }
  }
}
