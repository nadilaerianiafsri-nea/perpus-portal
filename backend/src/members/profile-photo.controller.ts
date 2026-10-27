import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MAX_COVER_BYTES } from '../admin-uploads/cover-file';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../auth/jwt-auth.guard';
import { emptyInput, memberQuery } from './member.validation';
import { MemberRoleGuard } from './member-role.guard';
import { MemberCacheInterceptor } from './members-cache.interceptor';
import {
  ProfilePhotoService,
  type ProfilePhotoUpload,
} from './profile-photo.service';

@Controller('members/me/profile/photo')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@UseInterceptors(MemberCacheInterceptor)
export class ProfilePhotoController {
  constructor(private readonly photos: ProfilePhotoService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      preservePath: true,
      limits: { fileSize: MAX_COVER_BYTES, files: 1, fields: 0, parts: 1 },
    }),
  )
  replace(
    @Req() req: AuthenticatedRequest,
    @Query() query: unknown,
    @Body() body: unknown,
    @UploadedFile() file?: ProfilePhotoUpload,
  ) {
    memberQuery(query, []);
    emptyInput(body);
    return this.photos.replace(req.user!.sub, file);
  }

  @Delete()
  remove(
    @Req() req: AuthenticatedRequest,
    @Query() query: unknown,
    @Body() body: unknown,
  ) {
    memberQuery(query, []);
    if (req.headers['content-type'] && !req.is('application/json')) {
      throw new BadRequestException(
        'Endpoint ini hanya menerima data JSON kosong.',
      );
    }
    emptyInput(body);
    return this.photos.remove(req.user!.sub);
  }

  @Get(':filename')
  async read(
    @Req() req: AuthenticatedRequest,
    @Param('filename') filename: string,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    memberQuery(query, []);
    const { buffer, mimetype } = await this.photos.read(
      req.user!.sub,
      filename,
    );
    response.setHeader('Content-Type', mimetype);
    response.setHeader('Content-Length', String(buffer.length));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; sandbox",
    );
    return new StreamableFile(buffer);
  }
}
