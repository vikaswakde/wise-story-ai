import { db } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  try {
    const resolvedParams = await params;
    const story = await db.story.findUnique({
      where: { id: resolvedParams.storyId },
      include: {
        assets: {
          orderBy: {
            sequence: "asc",
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error("Failed to fetch story:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
