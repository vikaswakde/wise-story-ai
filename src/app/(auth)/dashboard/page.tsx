import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/server/db";

export default async function Dashboard() {
  const user = await currentUser();

  // Protect the page
  if (!user) {
    redirect("/");
  }

  // Fetch user's stories
  const stories = await db.story.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              WiseStory AI
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Welcome, {user.firstName ?? user.username ?? "User"}!
            </p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Create Story Button */}
        <div className="mb-8">
          <Link
            href="/create"
            className="inline-flex items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create New Story
          </Link>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                No stories yet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click &quot;Create New Story&quot; to get started!
              </p>
            </div>
          ) : (
            stories.map((story) => (
              <Link
                key={story.id}
                href={`/stories/${story.id}`}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-indigo-500"
              >
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  {story.title}
                </h3>
                {story.description && (
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {story.description}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {story.status}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(story.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
