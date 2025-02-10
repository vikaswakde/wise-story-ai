"use server";

import { db } from "@/server/db";
import { GeminiService } from "@/server/services/gemini";
import { StoryContent, StoryStatus } from "@/types/story";
import { env } from "@/env";
import { Prisma } from "@prisma/client";
import { HuggingFaceService } from "@/server/services/huggingface";
import { getStorageService } from "@/server/services/storage";

const gemini = new GeminiService(env.GEMINI_API_KEY);

async function saveImageToS3(
  base64Data: string,
  contentType: string,
  index: number,
): Promise<string> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Get storage service
    const storage = await getStorageService();

    // Upload to S3 with proper folder structure and naming
    const url = await storage.uploadFile(buffer, {
      contentType,
      folder: "story-images",
      filename: `image-${index}.${contentType.split("/")[1]}`,
    });

    return url;
  } catch (error) {
    console.error("Failed to save image to S3:", error);
    throw new Error(
      `Failed to save image: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function generateStoryContent(storyId: string) {
  try {
    // Fetch the story
    const story = await db.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new Error("Story not found");
    }

    // Update status to processing content
    await db.story.update({
      where: { id: storyId },
      data: { status: "processing_content" as StoryStatus },
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
        status: "generated_content" as StoryStatus,
      },
    });

    // After content is generated, trigger asset generation
    try {
      await generateStoryAssets(storyId);
    } catch (assetError) {
      console.error("Failed to generate assets:", assetError);
      // Don't throw here, we still want to return the story with content
      // The assets can be generated later if needed
    }

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

export async function generateStoryAssets(storyId: string) {
  const story = await db.story.findUnique({
    where: { id: storyId },
  });

  if (!story) {
    throw new Error("Story not found");
  }

  const content = story.content as unknown as StoryContent;

  if (!content.imagePrompts?.length) {
    throw new Error("No image prompts found in story content");
  }

  // Update status to processing assets
  await db.story.update({
    where: { id: storyId },
    data: { status: "processing_assets" as StoryStatus },
  });

  const hf = HuggingFaceService.getInstance();
  const errors: string[] = [];
  const generatedAssets: { url: string; prompt: string; sequence: number }[] =
    [];

  try {
    // Generate images for each prompt in parallel with a concurrency limit
    const concurrencyLimit = 2; // Limit parallel requests
    const chunks: string[][] = [];

    for (let i = 0; i < content.imagePrompts.length; i += concurrencyLimit) {
      const chunk = content.imagePrompts.slice(i, i + concurrencyLimit);
      chunks.push(chunk);
    }

    for (const promptChunk of chunks) {
      const chunkPromises = promptChunk.map(async (prompt, chunkIndex) => {
        const index =
          chunks.indexOf(promptChunk) * concurrencyLimit + chunkIndex;

        try {
          const result = await hf.generateImage(prompt);

          if (!result.success || !result.data) {
            throw new Error(result.error ?? "Failed to generate image");
          }

          // Save the image to S3
          const url = await saveImageToS3(
            result.data.base64,
            result.data.contentType,
            index,
          );

          // Store for batch creation
          generatedAssets.push({
            url,
            prompt,
            sequence: index,
          });
        } catch (error) {
          const errorMessage = `Failed to generate image ${index + 1}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMessage);
          console.error(errorMessage);
        }
      });

      // Wait for current chunk to complete before processing next chunk
      await Promise.all(chunkPromises);
    }

    // Batch create all assets
    if (generatedAssets.length > 0) {
      await db.asset.createMany({
        data: generatedAssets.map((asset) => ({
          type: "image",
          url: asset.url,
          prompt: asset.prompt,
          storyId: story.id,
          sequence: asset.sequence,
        })),
      });
    }

    // Update story status based on results
    await db.story.update({
      where: { id: storyId },
      data: {
        status: errors.length === 0 ? "generated" : ("error" as StoryStatus),
      },
    });

    if (errors.length > 0) {
      throw new Error(`Some images failed to generate: ${errors.join(", ")}`);
    }

    return { success: true };
  } catch (error) {
    // Update story status to error
    await db.story.update({
      where: { id: storyId },
      data: { status: "error" as StoryStatus },
    });

    throw error;
  }
}
