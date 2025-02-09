"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createStory } from "@/server/actions/story";
import { useState } from "react";
import { toast } from "sonner";

const storySetupSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  ageGroup: z.enum(["3-5", "5-8", "8-12"], {
    required_error: "Please select an age group",
  }),
  language: z.enum(["en", "es", "fr"], {
    required_error: "Please select a language",
  }),
});

type StorySetupForm = z.infer<typeof storySetupSchema>;

export default function StorySetupForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StorySetupForm>({
    resolver: zodResolver(storySetupSchema),
  });

  const onSubmit = async (data: StorySetupForm) => {
    try {
      setIsSubmitting(true);
      const story = await createStory({
        ...data,
        userId,
      });

      toast.success("Story created successfully!");
      router.push(`/create/generate/${story.id}`);
    } catch (error) {
      console.error("Error creating story:", error);
      toast.error("Failed to create story. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Story Title
        </label>
        <input
          type="text"
          id="title"
          {...register("title")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Description (Optional)
        </label>
        <textarea
          id="description"
          rows={3}
          {...register("description")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Age Group */}
      <div>
        <label
          htmlFor="ageGroup"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Age Group
        </label>
        <select
          id="ageGroup"
          {...register("ageGroup")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
        >
          <option value="">Select an age group</option>
          <option value="3-5">3-5 years</option>
          <option value="5-8">5-8 years</option>
          <option value="8-12">8-12 years</option>
        </select>
        {errors.ageGroup && (
          <p className="mt-1 text-sm text-red-600">{errors.ageGroup.message}</p>
        )}
      </div>

      {/* Language */}
      <div>
        <label
          htmlFor="language"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Language
        </label>
        <select
          id="language"
          {...register("language")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
        >
          <option value="">Select a language</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
        {errors.language && (
          <p className="mt-1 text-sm text-red-600">{errors.language.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Story"}
        </button>
      </div>
    </form>
  );
}
