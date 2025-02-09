import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import StoryGeneration from "@/components/story/StoryGeneration";

export default async function GenerateStoryPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const user = await currentUser();
  const resolvedParams = await params;

  if (!user) {
    redirect("/");
  }

  // Fetch the story
  const story = await db.story.findUnique({
    where: {
      id: resolvedParams.storyId,
      userId: user.id,
    },
  });

  if (!story) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          Generating Your Story
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          We&apos;re using AI to create an engaging story based on your
          preferences.
        </p>
        <StoryGeneration story={story} />
      </div>
    </div>
  );
}
