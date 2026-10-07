import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isSafeCoverFilename } from '../admin-uploads/cover-file';

const coverMime: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

@Controller('uploads')
export class UploadsController {
  @Get('covers/:filename')
  async cover(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!isSafeCoverFilename(filename)) {
      throw new NotFoundException('Cover tidak ditemukan.');
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(
        resolve(process.cwd(), 'storage', 'covers', filename),
      );
    } catch {
      throw new NotFoundException('Cover tidak ditemukan.');
    }

    const extension = filename.slice(filename.lastIndexOf('.') + 1);
    response.setHeader('Content-Type', coverMime[extension]);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(buffer);
  }
}
