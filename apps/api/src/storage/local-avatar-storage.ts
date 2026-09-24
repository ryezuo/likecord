import * as fs from "fs/promises";
import * as path from "path";
import { constants } from "fs";
import { avatarReadLimit, AVATAR_STORAGE_MS, AvatarPage, AvatarStorage, requireAvatarKey, requireAvatarRepresentation } from "./avatar-object";

const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

/** The upload directory is service-owned. Never follow a link, including ancestors of UPLOAD_DIR. */
export class LocalAvatarStorage implements AvatarStorage {
  constructor(private readonly baseDir: string) {}

  private deadline() {
    const end = Date.now() + AVATAR_STORAGE_MS;
    return () => { if (Date.now() >= end) throw new Error("Avatar storage deadline"); };
  }

  private async safeDirectory(directory: string, create: boolean, check: () => void): Promise<void> {
    const absolute = path.resolve(directory);
    const root = path.parse(absolute).root;
    let current = root;
    for (const segment of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
      check();
      current = path.join(current, segment);
      if (create) {
        try { await fs.mkdir(current); } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        }
      }
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Unsafe avatar directory");
    }
  }

  private fullPath(key: string): string {
    requireAvatarKey(key);
    return path.resolve(this.baseDir, ...key.split("/"));
  }

  async putAvatar(key: string, buffer: Buffer): Promise<void> {
    requireAvatarRepresentation(buffer, key.endsWith("/poster.webp"));
    const full = this.fullPath(key);
    const check = this.deadline();
    await this.safeDirectory(path.dirname(full), true, check);
    const handle = await fs.open(full, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0), 0o600);
    try { await handle.writeFile(buffer); check(); } finally { await handle.close(); }
  }

  async readAvatar(key: string): Promise<Buffer | null> {
    const limit = avatarReadLimit(key);
    const full = this.fullPath(key);
    const check = this.deadline();
    try {
      await this.safeDirectory(path.dirname(full), false, check);
      const stat = await fs.lstat(full);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.size > limit) throw new Error("Unsafe avatar object");
      const handle = await fs.open(full, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      try {
        const opened = await handle.stat();
        if (!opened.isFile() || opened.ino !== stat.ino || opened.size > limit) throw new Error("Avatar changed during read");
        const prefix = Buffer.alloc(Math.min(30, opened.size));
        const header = await handle.read(prefix, 0, prefix.length, 0);
        if (header.bytesRead !== prefix.length || opened.size > avatarReadLimit(key, prefix)) throw new Error("Avatar storage size exceeded");
        const buffer = Buffer.alloc(opened.size);
        let offset = 0;
        while (offset < buffer.length) {
          check();
          const read = await handle.read(buffer, offset, buffer.length - offset, offset);
          if (!read.bytesRead) throw new Error("Incomplete avatar object");
          offset += read.bytesRead;
        }
        check();
        requireAvatarRepresentation(buffer, key.endsWith("/poster.webp"));
        return buffer;
      } finally { await handle.close(); }
    } catch (error) { if (missing(error)) return null; throw error; }
  }

  async deleteAvatar(key: string): Promise<void> {
    const full = this.fullPath(key);
    const check = this.deadline();
    try {
      await this.safeDirectory(path.dirname(full), false, check);
      const stat = await fs.lstat(full);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("Unsafe avatar object");
      check();
      await fs.unlink(full);
      check();
    } catch (error) { if (!missing(error)) throw error; }
  }

  async listAvatars(cursor?: string): Promise<AvatarPage> {
    if (cursor && (!cursor.startsWith("avatars/") || cursor.length > 1024)) throw new Error("Invalid avatar cursor");
    const root = path.resolve(this.baseDir, "avatars");
    const check = this.deadline();
    const objects: AvatarPage["objects"] = [];
    // Lexical continuation survives deletions. Scan with bounded memory (101 entries),
    // bounded depth and a 15s budget; directory contents are never loaded as an array.
    const add = (key: string, lastModified?: Date) => {
      if (cursor && key <= cursor) return;
      objects.push({ key, lastModified });
      objects.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
      if (objects.length > 101) objects.pop();
    };
    const walk = async (directory: string, prefix: string, depth: number): Promise<void> => {
      await this.safeDirectory(directory, false, check);
      const dir = await fs.opendir(directory);
      for await (const entry of dir) {
        check();
        const key = `${prefix}/${entry.name}`;
        const stat = await fs.lstat(path.join(directory, entry.name));
        if (stat.isSymbolicLink()) { add(key); continue; }
        if (stat.isDirectory() && depth < 2) await walk(path.join(directory, entry.name), key, depth + 1);
        else add(key, stat.isFile() ? stat.mtime : undefined);
      }
    };
    try { await walk(root, "avatars", 0); } catch (error) {
      if (missing(error)) {
        // Only an absent inventory root means an empty inventory; mid-scan races retain/retry.
        try { await fs.lstat(root); } catch (rootError) { if (missing(rootError)) return { objects: [] }; }
      }
      throw error;
    }
    check();
    return { objects: objects.slice(0, 100), cursor: objects.length > 100 ? objects[99].key : undefined };
  }
}
