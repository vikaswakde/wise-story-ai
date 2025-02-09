"use server";

import { db } from "@/server/db";
import { GeminiService } from "@/server/services/gemini";
import { StoryContent, StoryStatus } from "@/types/story";
import { env } from "@/env";
import { Prisma } from "@prisma/client";

const gemini = new GeminiService(env.GEMINI_API_KEY);

export async function generateStoryContent(storyId: string) {
  try {
    // Fetch the story
    const story = await db.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new Error("Story not found");
    }

    // Update status to processing
    await db.story.update({
      where: { id: storyId },
      data: { status: "processing" as StoryStatus },
    });

    // Generate content using Gemini
    const content = await gemini.generateStoryContent({
      title: story.title,
      description: story.description ?? undefined,
      ageGroup: story.ageGroup,
      language: story.language,
    });

    // Validate the content structure before saving
    if (
      !content.structure ||
      !Array.isArray(content.scenes) ||
      !Array.isArray(content.imagePrompts)
    ) {
      throw new Error("Invalid content structure received from API");
    }

    // Update the story with generated content
    const updatedStory = await db.story.update({
      where: { id: storyId },
      data: {
        content: JSON.parse(
          JSON.stringify(content),
        ) as unknown as Prisma.InputJsonObject,
        status: "generated" as StoryStatus,
      },
    });

    return updatedStory;
  } catch (error) {
    console.error("Error generating story:", error);
    // Update status to error with error message
    await db.story.update({
      where: { id: storyId },
      data: {
        status: "error" as StoryStatus,
        content: {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
          timestamp: new Date().toISOString(),
        } as unknown as Prisma.InputJsonObject,
      },
    });
    throw error;
  }
}
