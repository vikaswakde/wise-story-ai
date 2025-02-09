"use server";

import { z } from "zod";
import { db } from "@/server/db";

const createStorySchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  ageGroup: z.enum(["3-5", "5-8", "8-12"]),
  language: z.enum(["en", "es", "fr"]),
  userId: z.string(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;

export async function createStory(input: CreateStoryInput) {
  const validated = createStorySchema.parse(input);

  // First, ensure the user exists
  const user = await db.user.findUnique({
    where: { id: validated.userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Create the story
  const story = await db.story.create({
    data: {
      title: validated.title,
      description: validated.description,
      ageGroup: validated.ageGroup,
      language: validated.language,
      userId: validated.userId,
      content: { structure: null, scenes: [], imagePrompts: [] }, // Initialize with empty content
      status: "draft",
    },
  });

  return story;
}
