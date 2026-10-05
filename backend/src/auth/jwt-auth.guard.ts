import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { SessionPayload } from './auth.service';

export type AuthenticatedRequest = Request & {
  user?: SessionPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = request.cookies?.perpus_session as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Silakan login terlebih dahulu.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<SessionPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      if (!Number.isSafeInteger(payload.sub) || payload.sub < 1)
        throw new Error('Invalid subject');
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { passwordHash: true },
      });
      const version =
        user &&
        createHmac(
          'sha256',
          this.configService.getOrThrow<string>('JWT_SECRET'),
        )
          .update(user.passwordHash)
          .digest('hex');
      if (!version || version !== payload.credentialVersion)
        throw new Error('Credentials changed');
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Sesi login tidak valid atau sudah berakhir.',
      );
    }
  }
}
