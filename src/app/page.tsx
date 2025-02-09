import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await currentUser();

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
          WiseStory AI
        </h1>
        <p className="mb-8 text-lg leading-8 text-gray-600 dark:text-gray-300">
          Create engaging stories with the power of AI. Perfect for
          children&apos;s education and entertainment.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <SignUpButton mode="modal">
            <button className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              Get Started
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}
