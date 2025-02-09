import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import type { StoryContent } from "@/types/story";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  // Await the params promise to get the storyId
  const { storyId } = await params;

  // Fetch the story
  const story = await db.story.findUnique({
    where: {
      id: storyId,
      userId: user.id,
    },
  });

  if (!story) {
    redirect("/dashboard");
  }

  const content = story.content as unknown as StoryContent;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {story.title}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Introduction */}
          <div className="prose prose-lg dark:prose-invert">
            <p className="lead">{content.structure?.introduction}</p>
          </div>

          {/* Chapters */}
          <div className="space-y-12">
            {content.structure?.chapters.map((chapter, index) => (
              <div key={index} className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {chapter.title}
                </h2>
                <div className="prose prose-lg dark:prose-invert">
                  <p>{chapter.content}</p>
                </div>
                {/* Scene Image - TODO: Add once image generation is implemented */}
                <div className="aspect-video w-full rounded-lg bg-gray-100 dark:bg-gray-800">
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Image will be generated here
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Conclusion */}
          <div className="prose prose-lg dark:prose-invert">
            <p>{content.structure?.conclusion}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
