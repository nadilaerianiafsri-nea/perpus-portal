import { PasswordResetService } from './password-reset.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { AuthService } from './auth.service';
import { AdminProfileService } from './admin-profile.service';
import { RecaptchaService } from './recaptcha.service';
import { authEmail, authObject } from './input-validation';

import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordReset: PasswordResetService,
    private readonly adminProfile: AdminProfileService,
    private readonly recaptcha: RecaptchaService,
  ) {}

  private setSessionCookie(
    response: Response,
    token: string,
    maxAge = 8 * 60 * 60 * 1000,
  ) {
    response.cookie('perpus_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge,
    });
  }

  @Post('login')
  async login(
    @Body()
    body: {
      email?: string;
      password?: string;
      remember?: boolean;
      captchaToken?: unknown;
    },
    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    authObject(body, ['email', 'password', 'remember', 'captchaToken']);
    if (
      !body ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string' ||
      !body.email ||
      !body.password ||
      body.email.length > 191 ||
      body.password.length > 1024
    ) {
      throw new BadRequestException('Email dan kata sandi wajib diisi.');
    }

    authEmail(body.email);
    if (body.remember !== undefined && typeof body.remember !== 'boolean')
      throw new BadRequestException('Pilihan ingat saya tidak valid.');

    await this.recaptcha.verify(body.captchaToken);
    const remember = body.remember === true;
    const result = await this.authService.login(
      body.email,
      body.password,
      remember,
    );

    this.setSessionCookie(
      response,
      result.token,
      remember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
    );

    return {
      user: result.user,
    };
  }

  @Post('register')
  async register(@Body() body: unknown) {
    return this.authService.register(body);
  }

  @Get('verify-email')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  async verifyEmail(@Query() query: unknown) {
    const input = authObject(query, ['token']);
    return this.authService.verifyEmail(input.token);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async resendVerification(@Body() body: unknown) {
    return this.authService.resendVerification(body);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async forgotPassword(@Body() body: unknown) {
    return this.passwordReset.forgot(body);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async resetPassword(@Body() body: unknown) {
    return this.passwordReset.reset(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @Header('Cache-Control', 'no-store')
  async me(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.authService.getUserById(request.user!.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin-profile')
  @Header('Cache-Control', 'no-store')
  async updateAdminProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.adminProfile.updateProfile(request.user!.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin-profile/password/request')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async requestAdminPasswordChange(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.adminProfile.requestPasswordChange(request.user!.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin-profile/password/confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async confirmAdminPasswordChange(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.adminProfile.confirmPasswordChange(request.user!.sub, body);
  }

  @Post('logout')
  logout(
    @Body() body: unknown,
    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    if (body !== undefined) authObject(body, []);
    response.clearCookie('perpus_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return {
      success: true,
    };
  }
}
