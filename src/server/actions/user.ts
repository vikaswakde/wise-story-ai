"use server";

import { db } from "@/server/db";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function syncUser(formData: FormData) {
  try {
    // First verify authentication
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get the current user with full details
    const user = await currentUser();
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user exists in our database
    const dbUser = await db.user.findUnique({
      where: { id: userId },
    });

    // If user doesn't exist, create them
    if (!dbUser) {
      await db.user.create({
        data: {
          id: userId,
          email: user.emailAddresses[0]?.emailAddress ?? "",
          name: user.firstName
            ? `${user.firstName} ${user.lastName ?? ""}`
            : undefined,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing user:", error);
    return { success: false, error: "Failed to sync user" };
  }
}
