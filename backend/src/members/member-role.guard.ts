import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemberRoleGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const requiredRole =
      this.reflector.getAllAndOverride<string>('memberRole', [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'PENGUNJUNG';

    const user = await this.prisma.user.findUnique({
      where: {
        id: request.user!.sub,
      },
      select: {
        role: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user || user.role !== requiredRole) {
      throw new ForbiddenException('Anda tidak memiliki akses ke area ini.');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Verifikasi email Anda terlebih dahulu.');
    }

    if (requiredRole === 'PENGUNJUNG' && !user.isActive) {
      throw new ForbiddenException(
        'Akun anggota sedang dinonaktifkan. Hubungi petugas perpustakaan.',
      );
    }

    return true;
  }
}
