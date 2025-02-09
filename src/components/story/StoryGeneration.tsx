"use client";

import { useEffect, useState } from "react";
import { Story } from "@prisma/client";
import { useRouter } from "next/navigation";
import { generateStoryContent } from "@/server/actions/generate";

interface Props {
  story: Story;
}

type GenerationStep = {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
};

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

        // Update steps based on successful generation
        setSteps((prev) =>
          prev.map((step) =>
            step.id === "structure" ||
            step.id === "scenes" ||
            step.id === "prompts"
              ? { ...step, status: "completed" }
              : step,
          ),
        );

        // Step 4: Generate Images (TODO: Implement image generation)
        setSteps((prev) =>
          prev.map((step) =>
            step.id === "images" ? { ...step, status: "processing" } : step,
          ),
        );
        // TODO: Call Hugging Face API to generate images
        // For now, we'll skip image generation and mark it as completed
        setSteps((prev) =>
          prev.map((step) =>
            step.id === "images" ? { ...step, status: "completed" } : step,
          ),
        );

        // Redirect to the story view page
        router.push(`/stories/${story.id}`);
      } catch (error) {
        console.error("Error generating story:", error);
        // Update the current step to show error
        setSteps((prev) =>
          prev.map((step) =>
            step.status === "processing"
              ? { ...step, status: "error", message: "Generation failed" }
              : step,
          ),
        );
      }
    };

    generateStory();
  }, [story.id, router]);

  return (
    <div className="space-y-4">
      {steps.map((step) => (
        <div
          key={step.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            {step.status === "completed" ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            ) : step.status === "processing" ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <SpinnerIcon className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : step.status === "error" ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
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
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
