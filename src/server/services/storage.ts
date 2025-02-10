import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/env";
import crypto from "crypto";

// Interface for our storage service
export interface StorageService {
  uploadFile(data: Buffer, options: UploadOptions): Promise<string>;
  deleteFile(key: string): Promise<void>;
  verifyConnection(): Promise<void>;
}

export interface UploadOptions {
  contentType: string;
  folder?: string;
  filename?: string;
}

export class S3StorageService implements StorageService {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private baseUrl: string;
  private isInitialized: boolean = false;

  constructor() {
    if (!env.AWS_S3_BUCKET || !env.AWS_REGION) {
      throw new Error("Missing required AWS configuration");
    }

    this.region = env.AWS_REGION;
    this.bucket = env.AWS_S3_BUCKET;

    try {
      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      this.baseUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    } catch (error) {
      throw new Error(
        `Failed to initialize S3 client: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public async verifyConnection(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.isInitialized = true;
    } catch (error) {
      if (error.name === "NoSuchBucket") {
        throw new Error(`S3 bucket '${this.bucket}' does not exist`);
      }
      throw new Error(
        `Failed to connect to S3: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private generateKey(folder: string, extension: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `${folder}/${timestamp}-${random}.${extension}`;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    return mimeToExt[mimeType] || "jpg";
  }

  async uploadFile(data: Buffer, options: UploadOptions): Promise<string> {
    if (!this.isInitialized) {
      await this.verifyConnection();
    }

    try {
      const folder = options.folder ?? "uploads";
      const extension = this.getExtensionFromMimeType(options.contentType);
      const key = options.filename ?? this.generateKey(folder, extension);

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: data,
          ContentType: options.contentType,
          CacheControl: "max-age=31536000", // 1 year cache
        }),
      );

      return `${this.baseUrl}/${key}`;
    } catch (error: unknown) {
      console.error("Failed to upload file to S3:", error);
      // Check for specific S3 errors
      if (error && typeof error === "object" && "name" in error) {
        const s3Error = error as { name: string; message?: string };
        if (s3Error.name === "NoSuchBucket") {
          throw new Error(`S3 bucket '${this.bucket}' does not exist`);
        }
        // Add specific error handling for other S3 errors
        if (s3Error.message) {
          throw new Error(`S3 upload failed: ${s3Error.message}`);
        }
      }
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.isInitialized) {
      await this.verifyConnection();
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      console.error("Failed to delete file from S3:", error);
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

// Singleton instance with verification
let storageService: StorageService;

export async function getStorageService(): Promise<StorageService> {
  if (!storageService) {
    storageService = new S3StorageService();
    // Verify connection when first creating the service
    await storageService.verifyConnection();
  }
  return storageService;
}
