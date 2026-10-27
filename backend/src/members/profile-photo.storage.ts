import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  isSafeCoverFilename,
  type CoverExtension,
} from '../admin-uploads/cover-file';

export function avatarFilename(reference: string | null): string | null {
  const prefix = '/uploads/avatars/';
  if (!reference?.startsWith(prefix)) return null;
  const filename = reference.slice(prefix.length);
  return isSafeCoverFilename(filename) ? filename : null;
}

@Injectable()
export class ProfilePhotoStorage {
  private readonly directory: string;

  constructor(
    @Optional() @Inject('PROFILE_PHOTO_STORAGE_ROOT') directory?: string,
  ) {
    this.directory = directory ?? resolve(process.cwd(), 'storage', 'avatars');
  }

  async save(buffer: Buffer, extension: CoverExtension): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    const path = resolve(this.directory, filename);
    // Open exclusively so failed writes can only clean up a file we created.
    const file = await open(path, 'wx', 0o600);
    try {
      await file.writeFile(buffer);
      await file.close();
    } catch (error) {
      await file.close().catch(() => undefined);
      await unlink(path).catch(() => undefined);
      throw error;
    }
    return `/uploads/avatars/${filename}`;
  }

  async read(filename: string): Promise<Buffer> {
    if (!isSafeCoverFilename(filename))
      throw new Error('Invalid avatar filename');
    return readFile(resolve(this.directory, filename));
  }

  async remove(reference: string): Promise<void> {
    const filename = avatarFilename(reference);
    if (!filename) return;
    try {
      await unlink(resolve(this.directory, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
