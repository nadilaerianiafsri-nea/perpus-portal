import {
  BadRequestException,
  Controller,
  InternalServerErrorException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../admin-books/admin-role.guard';
import { MAX_COVER_BYTES, validateCoverFile } from './cover-file';

type UploadedCover = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminUploadsController {
  @Post('cover')
  @UseInterceptors(
    FileInterceptor('cover', {
      limits: { fileSize: 6 * 1024 * 1024, files: 1 },
    }),
  )
  async cover(@UploadedFile() file?: UploadedCover) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File cover wajib dipilih.');
    }

    let extension: 'jpg' | 'png' | 'webp';
    try {
      extension = validateCoverFile(file.buffer, file.mimetype);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'File cover tidak valid.',
      );
    }

    const storage = resolve(process.cwd(), 'storage', 'covers');
    const filename = `${randomUUID()}.${extension}`;

    try {
      await mkdir(storage, { recursive: true });
      await writeFile(resolve(storage, filename), file.buffer, { flag: 'wx' });
    } catch {
      throw new InternalServerErrorException('Cover gagal disimpan.');
    }

    return { coverUrl: `/uploads/covers/${filename}` };
  }
}
