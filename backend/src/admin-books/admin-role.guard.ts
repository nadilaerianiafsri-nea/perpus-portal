import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke area ini.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, emailVerified: true },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Anda tidak memiliki akses ke area ini.');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Verifikasi email Anda terlebih dahulu.');
    }

    return true;
  }
}
