import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  isSafeCoverFilename,
  validateCoverFile,
} from '../admin-uploads/cover-file';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MembersService } from './members.service';
import { avatarFilename, ProfilePhotoStorage } from './profile-photo.storage';

export type ProfilePhotoUpload = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class ProfilePhotoService {
  private readonly logger = new Logger(ProfilePhotoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
    private readonly storage: ProfilePhotoStorage,
  ) {}

  async replace(userId: number, file?: ProfilePhotoUpload) {
    if (!file?.buffer?.length)
      throw new BadRequestException('File foto profil wajib dipilih.');
    let extension: ReturnType<typeof validateCoverFile>;
    try {
      extension = validateCoverFile(
        file.buffer,
        file.mimetype,
        file.originalname,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message.replaceAll('cover', 'foto profil')
          : 'File foto profil tidak valid.',
      );
    }

    let reference: string;
    try {
      reference = await this.storage.save(file.buffer, extension);
    } catch {
      throw new InternalServerErrorException('Foto profil gagal disimpan.');
    }
    try {
      return await this.change(userId, reference);
    } catch (error) {
      await this.cleanup(reference);
      throw error;
    }
  }

  async remove(userId: number) {
    return this.change(userId, null);
  }

  private async change(userId: number, profileImageUrl: string | null) {
    const { previous, result } = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            profileImageUrl: true,
            role: true,
            isActive: true,
            emailVerified: true,
          },
        });
        if (!user) throw new NotFoundException('Anggota tidak ditemukan.');
        if (
          user.role !== 'PENGUNJUNG' ||
          !user.isActive ||
          !user.emailVerified
        ) {
          throw new ForbiddenException('Akses anggota tidak aktif.');
        }
        await tx.user.update({
          where: { id: userId },
          data: { profileImageUrl },
        });
        return {
          previous: user.profileImageUrl,
          result: await this.members.profile(userId, tx),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 15000,
      },
    );

    // Only clean old local files after commit. Unique names mean a later mutation
    // can never make an older file current again, including across app instances.
    await this.cleanup(previous);
    return result;
  }

  private async cleanup(reference: string | null) {
    if (!avatarFilename(reference)) return;
    try {
      await this.storage.remove(reference!);
    } catch {
      this.logger.warn('Pembersihan berkas foto profil tertunda.');
    }
  }

  async read(userId: number, filename: string) {
    if (!isSafeCoverFilename(filename))
      throw new NotFoundException('Foto profil tidak ditemukan.');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true },
    });
    if (user?.profileImageUrl !== `/uploads/avatars/${filename}`)
      throw new NotFoundException('Foto profil tidak ditemukan.');
    const extension = filename.split('.').pop();
    const mimetype = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    try {
      const buffer = await this.storage.read(filename);
      validateCoverFile(buffer, mimetype, filename);
      return { buffer, mimetype };
    } catch {
      throw new NotFoundException('Foto profil tidak ditemukan.');
    }
  }
}
