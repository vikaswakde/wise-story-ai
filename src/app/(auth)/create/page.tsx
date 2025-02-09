import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import StorySetupForm from "@/components/story/StorySetupForm";

export default async function CreatePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          Story Setup
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Let&apos;s start by setting up some basic information about your
          story.
        </p>
        <StorySetupForm userId={user.id} />
      </div>
    </div>
  );
}
