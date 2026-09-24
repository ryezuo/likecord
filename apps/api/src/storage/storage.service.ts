import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { R2StorageProvider } from "./r2-storage.provider";
import { AvatarStorage } from "./avatar-object";
import { LocalAvatarStorage } from "./local-avatar-storage";

export interface StorageProvider extends AvatarStorage {
  generateKey(userId: string, baseName: string): string;
  put(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  getRange(key: string, start: number, end: number): Promise<Buffer | null>;
  head(key: string): Promise<{ size: number; contentType: string } | null>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string): Promise<string | null>;
  createPresignedUploadUrl(key: string, contentType?: string, ttlSeconds?: number): Promise<string | null>;
  createPresignedDownloadUrl(key: string, ttlSeconds?: number): Promise<string | null>;
}

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private readonly avatars: LocalAvatarStorage;

  constructor() {
    this.baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    this.avatars = new LocalAvatarStorage(this.baseDir);
  }

  putAvatar(key: string, buffer: Buffer) { return this.avatars.putAvatar(key, buffer); }
  readAvatar(key: string) { return this.avatars.readAvatar(key); }
  deleteAvatar(key: string) { return this.avatars.deleteAvatar(key); }
  listAvatars(cursor?: string) { return this.avatars.listAvatars(cursor); }

  generateKey(userId: string, fileName: string): string {
    const ext = path.extname(fileName);
    const safe = crypto.randomBytes(16).toString("hex");
    return `${userId}/${safe}${ext}`;
  }

  private getFullPath(key: string): string {
    return path.join(this.baseDir, key);
  }

  async put(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
  }

  async get(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const fullPath = this.getFullPath(key);
      const buffer = await fs.readFile(fullPath);
      const mimeType = this.guessMime(key);
      return { buffer, mimeType };
    } catch {
      return null;
    }
  }

  async getRange(key: string, start: number, end: number): Promise<Buffer | null> {
    try {
      const fullPath = this.getFullPath(key);
      const fh = await fs.open(fullPath, "r");
      const length = end - start + 1;
      const buf = Buffer.alloc(length);
      await fh.read(buf, 0, length, start);
      await fh.close();
      return buf;
    } catch {
      return null;
    }
  }

  async head(key: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const fullPath = this.getFullPath(key);
      const stat = await fs.stat(fullPath);
      return { size: stat.size, contentType: this.guessMime(key) };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getFullPath(key));
    } catch { /* ignore */ }
  }

  async getSignedUrl(_key: string): Promise<string | null> {
    return null;
  }

  async createPresignedUploadUrl(_key: string, _contentType?: string, _ttlSeconds?: number): Promise<null> {
    return null;
  }

  async createPresignedDownloadUrl(_key: string, _ttlSeconds?: number): Promise<null> {
    return null;
  }

  private guessMime(_key: string): string {
    return "application/octet-stream";
  }
}

const logger = new Logger("StorageService");

function validateR2Config(): boolean {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
}

@Injectable()
export class StorageService {
  private provider: StorageProvider;
  private driverName: "r2" | "local";

  constructor() {
    const driver = process.env.STORAGE_DRIVER || "local";
    if (driver === "r2" && validateR2Config()) {
      this.provider = new R2StorageProvider();
      this.driverName = "r2";
      logger.log("Storage driver: R2 (Cloudflare)");
    } else {
      this.provider = new LocalStorageProvider();
      this.driverName = "local";
      if (driver === "r2") {
        logger.warn("STORAGE_DRIVER=r2 but R2 config is incomplete, falling back to local storage");
      } else {
        logger.log("Storage driver: local");
      }
    }
  }

  getProvider(): "r2" | "local" {
    return this.driverName;
  }

  putAvatar(key: string, buffer: Buffer) { return this.provider.putAvatar(key, buffer); }
  readAvatar(key: string) { return this.provider.readAvatar(key); }
  deleteAvatar(key: string) { return this.provider.deleteAvatar(key); }
  listAvatars(cursor?: string) { return this.provider.listAvatars(cursor); }

  generateKey(userId: string, fileName: string): string {
    return this.provider.generateKey(userId, fileName);
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.provider.put(key, buffer, mimeType);
  }

  async download(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    return this.provider.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.provider.delete(key);
  }

  async getDownloadUrl(key: string): Promise<string | null> {
    return this.provider.getSignedUrl(key);
  }

  async headObject(key: string): Promise<{ size: number; contentType: string } | null> {
    return this.provider.head(key);
  }

  async downloadRange(key: string, start: number, end: number): Promise<Buffer | null> {
    return this.provider.getRange(key, start, end);
  }

  async createPresignedUploadUrl(key: string, contentType?: string, ttlSeconds?: number): Promise<string | null> {
    return this.provider.createPresignedUploadUrl(key, contentType, ttlSeconds);
  }

  async createPresignedDownloadUrl(key: string, ttlSeconds?: number): Promise<string | null> {
    return this.provider.createPresignedDownloadUrl(key, ttlSeconds);
  }
}
