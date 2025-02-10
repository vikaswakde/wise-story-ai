"use client";

import { useEffect, useState } from "react";
import { Story } from "@prisma/client";
import { useRouter } from "next/navigation";
import { generateStoryContent } from "@/server/actions/generate";
import { CheckCheckIcon, Loader2, XCircleIcon, RefreshCcw } from "lucide-react";
import { StoryContent } from "@/types/story";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface Props {
  story: Story;
}

type GenerationStep = {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
};

interface ImageProgress {
  prompt: string;
  status: "pending" | "processing" | "completed" | "error";
  url?: string;
  error?: string;
}

export default function StoryGeneration({ story }: Props) {
  const router = useRouter();
  const [steps, setSteps] = useState<GenerationStep[]>([
    {
      id: "structure",
      name: "Creating Story Structure",
      status: "pending",
    },
    {
      id: "scenes",
      name: "Generating Scene Descriptions",
      status: "pending",
    },
    {
      id: "prompts",
      name: "Creating Image Prompts",
      status: "pending",
    },
    {
      id: "images",
      name: "Generating Images",
      status: "pending",
    },
  ]);

  const [imageProgress, setImageProgress] = useState<ImageProgress[]>([]);
  const [storyContent, setStoryContent] = useState<StoryContent | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    const generateStory = async () => {
      try {
        // Step 1: Generate Story Structure
        setSteps((prev) =>
          prev.map((step) =>
            step.id === "structure" ? { ...step, status: "processing" } : step,
          ),
        );

        // Generate all content using Gemini
        const updatedStory = await generateStoryContent(story.id);

        if (updatedStory.status === "error") {
          throw new Error("Failed to generate story content");
        }

        // Parse and store story content
        const content = updatedStory.content as unknown as StoryContent;
        setStoryContent(content);

        // Update steps based on successful content generation
        setSteps((prev) =>
          prev.map((step) =>
            step.id === "structure" ||
            step.id === "scenes" ||
            step.id === "prompts"
              ? { ...step, status: "completed" }
              : step,
          ),
        );

        // Initialize image progress if we have prompts
        if (content.imagePrompts?.length) {
          setImageProgress(
            content.imagePrompts.map((prompt) => ({
              prompt,
              status: "pending",
            })),
          );

          // Update image generation step to processing
          setSteps((prev) =>
            prev.map((step) =>
              step.id === "images" ? { ...step, status: "processing" } : step,
            ),
          );

          // Start polling
          setIsPolling(true);
        }
      } catch (error) {
        console.error("Error generating story:", error);
        setSteps((prev) =>
          prev.map((step) =>
            step.status === "processing"
              ? { ...step, status: "error", message: "Generation failed" }
              : step,
          ),
        );
      }
    };

    void generateStory();
  }, [story.id]);

  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/stories/${story.id}`);
        const currentStory = await response.json();

        if (currentStory.status === "generated") {
          setIsPolling(false);
          clearInterval(pollInterval);
          setSteps((prev) =>
            prev.map((step) =>
              step.id === "images" ? { ...step, status: "completed" } : step,
            ),
          );

          // Update image progress with URLs
          if (currentStory.assets?.length) {
            setImageProgress((prev) =>
              prev.map((progress, index) => ({
                ...progress,
                status: "completed",
                url: currentStory.assets[index]?.url,
              })),
            );
          }
          router.push(`/stories/${story.id}`);
        } else if (currentStory.status === "error") {
          setIsPolling(false);
          clearInterval(pollInterval);
          throw new Error("Failed to generate images");
        }
      } catch (error) {
        console.error("Error polling story status:", error);
        setIsPolling(false);
        clearInterval(pollInterval);
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [isPolling, story.id, router]);

  const retryImage = async (prompt: string, index: number) => {
    try {
      setImageProgress((prev) =>
        prev.map((p, i) =>
          i === index ? { ...p, status: "processing", error: undefined } : p,
        ),
      );

      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, storyId: story.id, index }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate image");
      }

      const data = await response.json();
      setImageProgress((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, status: "completed", url: data.url, error: undefined }
            : p,
        ),
      );
    } catch (error) {
      setImageProgress((prev) =>
        prev.map((p, i) =>
          i === index
            ? {
                ...p,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : p,
        ),
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              {step.status === "completed" ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              ) : step.status === "processing" ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : step.status === "error" ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {step.name}
                </p>
                {step.message && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {step.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image Generation Progress */}
      {imageProgress.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Image Generation Progress</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {imageProgress.map((image, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Image {index + 1}
                      {image.status === "processing" && " - Generating..."}
                    </p>
                    {image.status === "error" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryImage(image.prompt, index)}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Retry
                      </Button>
                    )}
                  </div>
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    {image.url ? (
                      <Image
                        src={image.url}
                        alt={`Generated image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    ) : image.status === "processing" ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      </div>
                    ) : image.status === "error" ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                        <XCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {image.error || "Failed to generate image"}
                        </p>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
