import { NextResponse } from "next/server";
import { HuggingFaceService } from "@/server/services/huggingface";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request: " + result.error.message },
        { status: 400 },
      );
    }

    const { prompt } = result.data;
    const hf = HuggingFaceService.getInstance();
    const response = await hf.generateImage(prompt);

    if (!response.success || !response.data) {
      return NextResponse.json(
        { error: response.error ?? "Failed to generate image" },
        { status: 500 },
      );
    }

    // Return the base64 data with content type
    return NextResponse.json({
      success: true,
      data: {
        dataUrl: `data:${response.data.contentType};base64,${response.data.base64}`,
      },
    });
  } catch (error) {
    console.error("Failed to generate image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
