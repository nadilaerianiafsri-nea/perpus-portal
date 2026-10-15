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
import {
  MAX_EBOOK_BYTES,
  privateEBookReference,
  validateEBookFile,
} from './ebook-file';

type UploadedFileData = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminUploadsController {
  @Post('cover')
  @UseInterceptors(
    FileInterceptor('cover', {
      limits: { fileSize: MAX_COVER_BYTES, files: 1, fields: 0, parts: 1 },
    }),
  )
  async cover(@UploadedFile() file?: UploadedFileData) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File cover wajib dipilih.');
    }

    let extension: 'jpg' | 'png' | 'webp';
    try {
      extension = validateCoverFile(
        file.buffer,
        file.mimetype,
        file.originalname,
      );
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

  @Post('ebook')
  @UseInterceptors(
    FileInterceptor('ebook', {
      limits: { fileSize: MAX_EBOOK_BYTES, files: 1, fields: 0, parts: 1 },
    }),
  )
  async ebook(@UploadedFile() file?: UploadedFileData) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File E-Book wajib dipilih.');
    }

    try {
      validateEBookFile(file.buffer, file.mimetype, file.originalname);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'File E-Book tidak valid.',
      );
    }

    const storage = resolve(process.cwd(), 'storage', 'ebooks');
    const filename = `${randomUUID()}.pdf`;

    try {
      await mkdir(storage, { recursive: true });
      await writeFile(resolve(storage, filename), file.buffer, { flag: 'wx' });
    } catch {
      throw new InternalServerErrorException('File E-Book gagal disimpan.');
    }

    return { ebookUrl: privateEBookReference(filename) };
  }
}
