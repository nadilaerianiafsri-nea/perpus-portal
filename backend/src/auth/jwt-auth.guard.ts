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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const token = request.cookies?.perpus_session as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Silakan login terlebih dahulu.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<SessionPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Sesi login tidak valid atau sudah berakhir.');
    }
  }
}
