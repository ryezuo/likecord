import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { avatarReadLimit, AVATAR_STORAGE_MS, AvatarPage, requireAvatarKey, requireAvatarRepresentation } from "./avatar-object";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Logger } from "@nestjs/common";
import * as crypto from "crypto";
import * as path from "path";
import type { StorageProvider } from "./storage.service";

const logger = new Logger("R2StorageProvider");

interface SdkErrorLike {
  name?: string;
  $metadata?: { httpStatusCode?: number };
}

function isNotFound(err: unknown): boolean {
  const e = err as SdkErrorLike;
  return e?.name === "NoSuchKey" || e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404;
}

export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private uploadTtl: number;
  private downloadTtl: number;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID || "PLACEHOLDER_ACCOUNT_ID";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "PLACEHOLDER_ACCESS_KEY_ID";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "PLACEHOLDER_SECRET_ACCESS_KEY";
    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    this.bucket = process.env.R2_BUCKET || "likecord-media";
    this.uploadTtl = parseInt(process.env.R2_PRESIGNED_UPLOAD_TTL || "300", 10);
    this.downloadTtl = parseInt(process.env.R2_PRESIGNED_DOWNLOAD_TTL || "600", 10);

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  generateKey(userId: string, baseName: string): string {
    const ext = path.extname(baseName);
    const safeName = path.basename(baseName, ext).replace(/[^a-zA-Z0-9._-]/g, "_") + ext;
    const uuid = crypto.randomUUID();
    return `attachments/${userId}/${uuid}/${safeName}`;
  }

  async putAvatar(key: string, buffer: Buffer): Promise<void> {
    requireAvatarKey(key);
    requireAvatarRepresentation(buffer, key.endsWith("/poster.webp"));
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer,
      ContentType: "image/webp", CacheControl: "private, no-cache", IfNoneMatch: "*" }),
    { abortSignal: AbortSignal.timeout(AVATAR_STORAGE_MS) });
  }

  async readAvatar(key: string): Promise<Buffer | null> {
    const limit = avatarReadLimit(key);
    const signal = AbortSignal.timeout(AVATAR_STORAGE_MS);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal });
      if (!result.Body) throw new Error("Missing avatar response body");
      const body = result.Body as AsyncIterable<Buffer> & { destroy?: () => void };
      const abort = () => body.destroy?.();
      signal.addEventListener("abort", abort, { once: true });
      try {
        if (result.ContentLength && result.ContentLength > limit) throw new Error("Avatar storage size exceeded");
        const chunks: Buffer[] = [];
        let length = 0;
        const prefix = Buffer.alloc(30); let prefixLength = 0;
        for await (const chunk of body) {
          signal.throwIfAborted();
          length += chunk.length;
          if (length > limit) throw new Error("Avatar storage size exceeded");
          const take = Math.min(30 - prefixLength, chunk.length);
          Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength).copy(prefix, prefixLength, 0, take); prefixLength += take;
          if (prefixLength === 30 && (length > avatarReadLimit(key, prefix) || (result.ContentLength || 0) > avatarReadLimit(key, prefix)))
            throw new Error("Avatar storage size exceeded");
          chunks.push(Buffer.from(chunk));
        }
        signal.throwIfAborted();
        const buffer = Buffer.concat(chunks);
        requireAvatarRepresentation(buffer, key.endsWith("/poster.webp"));
        return buffer;
      } finally { signal.removeEventListener("abort", abort); body.destroy?.(); }
    } catch (error) { if (isNotFound(error)) return null; throw error; }
  }

  async deleteAvatar(key: string): Promise<void> {
    requireAvatarKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      { abortSignal: AbortSignal.timeout(AVATAR_STORAGE_MS) });
  }

  async listAvatars(cursor?: string): Promise<AvatarPage> {
    const result = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket,
      Prefix: "avatars/", MaxKeys: 100, ContinuationToken: cursor }),
    { abortSignal: AbortSignal.timeout(AVATAR_STORAGE_MS) });
    if (result.IsTruncated && !result.NextContinuationToken) throw new Error("Incomplete avatar inventory");
    return { objects: (result.Contents || []).map((object) => ({ key: object.Key || "", lastModified: object.LastModified })),
      cursor: result.IsTruncated ? result.NextContinuationToken : undefined };
  }

  async put(key: string, buffer: Buffer, contentType: string): Promise<void> {
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }));
    } catch (err: unknown) {
      const e = err as SdkErrorLike;
      logger.error(`[R2] PutObject failed bucket=${this.bucket} key=${key} status=${e?.$metadata?.httpStatusCode ?? "?"} error=${e?.name ?? "UnknownError"}`);
      throw err;
    }
  }

  async get(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      if (!result.Body) return null;
      const chunks: Buffer[] = [];
      for await (const chunk of result.Body as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      return {
        buffer: Buffer.concat(chunks),
        mimeType: result.ContentType || "application/octet-stream",
      };
    } catch (err: unknown) {
      if (isNotFound(err)) {
        return null;
      }
      const e = err as SdkErrorLike;
      logger.error(`[R2] GetObject failed bucket=${this.bucket} key=${key} status=${e?.$metadata?.httpStatusCode ?? "?"} error=${e?.name ?? "UnknownError"}`);
      throw err;
    }
  }

  async getRange(key: string, start: number, end: number): Promise<Buffer | null> {
    try {
      const range = `bytes=${start}-${end}`;
      const result = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: range,
      }));
      if (!result.Body) return null;
      const chunks: Buffer[] = [];
      for await (const chunk of result.Body as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      const e = err as SdkErrorLike;
      logger.error(`[R2] GetObject range failed bucket=${this.bucket} key=${key} status=${e?.$metadata?.httpStatusCode ?? "?"} error=${e?.name ?? "UnknownError"}`);
      throw err;
    }
  }

  async getSignedUrl(_key: string): Promise<string | null> {
    return this.createPresignedDownloadUrl(_key);
  }

  async head(key: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return {
        size: result.ContentLength || 0,
        contentType: result.ContentType || "application/octet-stream",
      };
    } catch (err: unknown) {
      // Only a genuine not-found response means "object absent".
      // 403/AccessDenied, signature, network and SDK errors are storage failures and must NOT be
      // collapsed into "not uploaded" — they are logged and rethrown.
      if (isNotFound(err)) {
        return null;
      }
      const e = err as SdkErrorLike;
      logger.error(`[R2] HeadObject failed bucket=${this.bucket} key=${key} status=${e?.$metadata?.httpStatusCode ?? "?"} error=${e?.name ?? "UnknownError"}`);
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
    } catch (err: unknown) {
      const e = err as SdkErrorLike;
      logger.error(`[R2] DeleteObject failed bucket=${this.bucket} key=${key} status=${e?.$metadata?.httpStatusCode ?? "?"} error=${e?.name ?? "UnknownError"}`);
      throw err;
    }
  }

  async createPresignedUploadUrl(key: string, contentType?: string, ttlSeconds?: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: ttlSeconds || this.uploadTtl,
      signableHeaders: new Set(["content-type"]),
    });
  }

  async createPresignedDownloadUrl(key: string, ttlSeconds?: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: ttlSeconds || this.downloadTtl,
    });
  }
}
