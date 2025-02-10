import { env } from "@/env";
import { HfInference } from "@huggingface/inference";

// Types for model configuration and responses
export interface ModelConfig {
  modelId: string;
  backupModelId: string;
  task: "text-to-image" | "text-to-speech";
  parameters?: {
    num_inference_steps?: number;
    guidance_scale?: number;
    negative_prompt?: string;
  };
}

interface ModelResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ImageGenerationResponse {
  base64: string;
  contentType: string;
}

export class HuggingFaceService {
  private static instance: HuggingFaceService;
  private readonly client: HfInference;
  private readonly models: {
    imageGeneration: ModelConfig[];
    speechSynthesis: ModelConfig[];
  };

  private constructor() {
    try {
      this.client = new HfInference(env.HUGGING_FACE_API_KEY);
    } catch (error) {
      throw new Error("Failed to initialize HuggingFace client");
    }

    // Initialize with our preferred models and their fallbacks
    this.models = {
      imageGeneration: [
        {
          modelId: "stabilityai/stable-diffusion-xl-base-1.0",
          backupModelId: "runwayml/stable-diffusion-v1-5",
          task: "text-to-image",
          parameters: {
            num_inference_steps: 20,
            guidance_scale: 7.5,
          },
        },
      ],
      speechSynthesis: [
        {
          modelId: "microsoft/speecht5_tts",
          backupModelId: "facebook/mms-tts",
          task: "text-to-speech",
        },
      ],
    };
  }

  // Singleton pattern to ensure we only have one instance
  public static getInstance(): HuggingFaceService {
    if (!HuggingFaceService.instance) {
      HuggingFaceService.instance = new HuggingFaceService();
    }
    return HuggingFaceService.instance;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  }

  private async generateImageWithModel(
    prompt: string,
    modelConfig: ModelConfig,
  ): Promise<ImageGenerationResponse> {
    if (!this.client) {
      throw new Error("HuggingFace client not initialized");
    }

    try {
      const image = await this.client.textToImage({
        model: modelConfig.modelId,
        inputs: prompt,
        parameters: modelConfig.parameters,
      });

      if (!(image instanceof Blob)) {
        throw new Error("Invalid response from image generation");
      }

      // Convert blob to base64
      const base64 = await this.blobToBase64(image);

      return {
        base64,
        contentType: image.type || "image/jpeg", // Default to JPEG if type is not available
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(
        `Failed to generate image with model ${modelConfig.modelId}:`,
        errorMessage,
      );
      throw new Error(`Image generation failed: ${errorMessage}`);
    }
  }

  public async generateImage(
    prompt: string,
  ): Promise<ModelResponse<ImageGenerationResponse>> {
    const primaryModel = this.models.imageGeneration[0];
    if (!primaryModel) {
      return {
        success: false,
        error: "No image generation model configured",
      };
    }

    try {
      // Try with primary model
      try {
        const result = await this.generateImageWithModel(prompt, primaryModel);
        return { success: true, data: result };
      } catch (primaryError) {
        console.error(
          "Primary model failed, trying backup model:",
          primaryError instanceof Error ? primaryError.message : primaryError,
        );

        // Try with backup model
        const backupModel: ModelConfig = {
          ...primaryModel,
          modelId: primaryModel.backupModelId,
        };

        const result = await this.generateImageWithModel(prompt, backupModel);
        return { success: true, data: result };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // More methods to be implemented...
}
