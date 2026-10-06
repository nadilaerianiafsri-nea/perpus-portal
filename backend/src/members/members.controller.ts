import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { MemberRoleGuard } from './member-role.guard';
import { MembersService } from './members.service';
import { positiveId } from './member.validation';
import { MemberCacheInterceptor } from './members-cache.interceptor';

@Controller('members/me')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@UseInterceptors(MemberCacheInterceptor)
export class MembersController {
  constructor(private readonly members: MembersService) {}
  @Get('dashboard') dashboard(@Req() req: AuthenticatedRequest) {
    return this.members.dashboard(req.user!.sub);
  }
  @Get('profile') profile(@Req() req: AuthenticatedRequest) {
    return this.members.profile(req.user!.sub);
  }
  @Patch('profile') updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.members.updateProfile(req.user!.sub, body);
  }
  @Get('reservations') reservations(@Req() req: AuthenticatedRequest) {
    return this.members.reservations(req.user!.sub);
  }
  @Post('reservations') reserve(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.members.reserve(req.user!.sub, body);
  }
  @Patch('reservations/:id/cancel') cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.members.cancel(req.user!.sub, positiveId(id));
  }
  @Get('loans') loans(@Req() req: AuthenticatedRequest) {
    return this.members.loans(req.user!.sub);
  }
  @Get('loans/history') history(@Req() req: AuthenticatedRequest) {
    return this.members.loans(req.user!.sub, true);
  }
  @Post('loans/:id/extend') extend(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.members.extend(req.user!.sub, positiveId(id), body);
  }
  @Get('notifications') notifications(@Req() req: AuthenticatedRequest) {
    return this.members.notifications(req.user!.sub);
  }
  @Patch('notifications/read-all') readAll(@Req() req: AuthenticatedRequest) {
    return this.members.readAll(req.user!.sub);
  }
  @Patch('notifications/:id/read') read(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.members.read(req.user!.sub, positiveId(id));
  }
  @Get('ebooks') ebooks(@Req() req: AuthenticatedRequest) {
    return this.members.ebooks(req.user!.sub);
  }
  @Post('ebooks') addEBook(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.members.addEBook(req.user!.sub, body);
  }
  @Post('ebooks/:bookId/open') openEBook(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
  ) {
    return this.members.openEBook(req.user!.sub, positiveId(bookId));
  }
}

@Controller('members/admin')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@UseInterceptors(MemberCacheInterceptor)
@SetMetadata('memberRole', 'ADMIN')
export class MemberCirculationController {
  constructor(private readonly members: MembersService) {}
  @Post('reservations/:id/pickup') pickup(@Param('id') id: string) {
    return this.members.pickup(positiveId(id));
  }
  @Post('loans/:id/return') returnLoan(@Param('id') id: string) {
    return this.members.finishLoan(positiveId(id), false);
  }
  @Post('loans/:id/lost') lost(@Param('id') id: string) {
    return this.members.finishLoan(positiveId(id), true);
  }
}
