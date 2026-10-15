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
import { ActiveBookGuard } from './active-book.guard';
import { EBookCirculationService } from './ebook-circulation.service';
import { MemberRoleGuard } from './member-role.guard';
import { MembersService } from './members.service';
import { bookInput, emptyInput, positiveId } from './member.validation';
import { MemberCacheInterceptor } from './members-cache.interceptor';

@Controller('members/me')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@UseInterceptors(MemberCacheInterceptor)
export class MembersController {
  constructor(
    private readonly members: MembersService,
    private readonly ebookCirculation: EBookCirculationService,
  ) {}

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
  @Get('books/:bookId/borrowing-status')
  @UseGuards(ActiveBookGuard)
  borrowingStatus(@Param('bookId') bookId: string) {
    positiveId(bookId);
    return { available: true };
  }
  @Get('reservations') reservations(@Req() req: AuthenticatedRequest) {
    return this.members.reservations(req.user!.sub);
  }
  @Post('reservations')
  @UseGuards(ActiveBookGuard)
  reserve(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.members.reserve(req.user!.sub, body);
  }
  @Patch('reservations/:id/cancel') cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    emptyInput(body);
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
  @Patch('notifications/read-all') readAll(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    emptyInput(body);
    return this.members.readAll(req.user!.sub);
  }
  @Patch('notifications/:id/read') read(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    emptyInput(body);
    return this.members.read(req.user!.sub, positiveId(id));
  }

  @Get('ebooks') ebooks(@Req() req: AuthenticatedRequest) {
    return this.ebookCirculation.listMine(req.user!.sub);
  }

  // Compatibility endpoint: the old "save" action now means borrowing.
  @Post('ebooks')
  borrowEBookLegacy(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.ebookCirculation.borrow(req.user!.sub, bookInput(body));
  }

  @Get('ebooks/:bookId/status')
  eBookStatus(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
  ) {
    return this.ebookCirculation.getStatus(req.user!.sub, positiveId(bookId));
  }

  @Post('ebooks/:bookId/borrow')
  borrowEBook(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
    @Body() body: unknown,
  ) {
    emptyInput(body);
    return this.ebookCirculation.borrow(req.user!.sub, positiveId(bookId));
  }

  @Post('ebooks/:bookId/return')
  returnEBook(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
    @Body() body: unknown,
  ) {
    emptyInput(body);
    return this.ebookCirculation.returnBook(
      req.user!.sub,
      positiveId(bookId),
    );
  }

  @Post('ebooks/:bookId/queue')
  joinEBookQueue(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
    @Body() body: unknown,
  ) {
    emptyInput(body);
    return this.ebookCirculation.joinQueue(
      req.user!.sub,
      positiveId(bookId),
    );
  }

  @Post('ebooks/:bookId/queue/cancel')
  cancelEBookQueue(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
    @Body() body: unknown,
  ) {
    emptyInput(body);
    return this.ebookCirculation.cancelQueue(
      req.user!.sub,
      positiveId(bookId),
    );
  }

  @Post('ebooks/:bookId/open')
  openEBook(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
    @Body() body: unknown,
  ) {
    emptyInput(body);
    return this.ebookCirculation.open(req.user!.sub, positiveId(bookId));
  }

  @Patch('ebooks/:bookId/progress')
  updateEBookProgress(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
    @Body() body: unknown,
  ) {
    return this.ebookCirculation.updateProgress(
      req.user!.sub,
      positiveId(bookId),
      body,
    );
  }
}

@Controller('members/admin')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@UseInterceptors(MemberCacheInterceptor)
@SetMetadata('memberRole', 'ADMIN')
export class MemberCirculationController {
  constructor(private readonly members: MembersService) {}
  @Post('reservations/:id/pickup')
  pickup(@Param('id') id: string, @Body() body: unknown) {
    emptyInput(body);
    return this.members.pickup(positiveId(id));
  }
  @Post('loans/:id/return')
  returnLoan(@Param('id') id: string, @Body() body: unknown) {
    emptyInput(body);
    return this.members.finishLoan(positiveId(id), false);
  }
  @Post('loans/:id/lost')
  lost(@Param('id') id: string, @Body() body: unknown) {
    emptyInput(body);
    return this.members.finishLoan(positiveId(id), true);
  }
}
