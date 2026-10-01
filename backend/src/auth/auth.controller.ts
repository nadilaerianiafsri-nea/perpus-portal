import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email dan kata sandi wajib diisi.');
    }

    const result = await this.authService.login(body.email, body.password);

    response.cookie('perpus_session', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return { user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    return this.authService.getUserById(request.user!.sub);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('perpus_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return { success: true };
  }
}
