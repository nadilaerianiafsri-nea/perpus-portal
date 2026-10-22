import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  SetMetadata,
  StreamableFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import {
  resolvePrivateEBookAccess,
  validateEBookFile,
} from '../admin-uploads/ebook-file';
import { PrismaService } from '../prisma/prisma.service';
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
    private readonly prisma: PrismaService,
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

  @Get('loans/history')
  async history(@Req() req: AuthenticatedRequest) {
    const result = await this.members.loans(req.user!.sub, true);
    if (!('history' in result) || !result.history.length) {
      return { history: 'history' in result ? result.history : [] };
    }

    const bookIds = [...new Set(result.history.map((item) => item.bookId))];
    const books = await this.prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, coverUrl: true },
    });
    const coverByBookId = new Map(
      books.map((book) => [book.id, book.coverUrl] as const),
    );

    return {
      history: result.history.map((item) => ({
        ...item,
        coverUrl: coverByBookId.get(item.bookId) ?? '',
      })),
    };
  }

  @Get('loans/:id')
  loanDetail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.members.memberLoanDetail(req.user!.sub, positiveId(id));
  }

  @Post('loans/:id/lost-report')
  reportLostLoan(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    emptyInput(body);
    return this.members.reportLostLoan(req.user!.sub, positiveId(id));
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

  @Get('ebooks/:bookId/file.pdf')
  async eBookFile(
    @Req() req: AuthenticatedRequest,
    @Param('bookId') bookId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const id = positiveId(bookId);
    const now = new Date();

    const [book, activeLoan] = await Promise.all([
      this.prisma.book.findFirst({
        where: { id, type: 'EBOOK' },
        select: {
          isActive: true,
          accessMode: true,
          ebookUrl: true,
        },
      }),
      this.prisma.eBookLoan.findFirst({
        where: {
          userId: req.user!.sub,
          bookId: id,
          status: 'AKTIF',
          dueAt: { gt: now },
        },
        select: { id: true },
      }),
    ]);

    const access = resolvePrivateEBookAccess(book, !!activeLoan);
    if ('reason' in access) {
      if (
        access.reason === 'NO_ACTIVE_LOAN' ||
        access.reason === 'BOOK_INACTIVE'
      ) {
        throw new ForbiddenException('Akses E-Book tidak aktif.');
      }
      throw new NotFoundException('Berkas E-Book tidak ditemukan.');
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(
        resolve(process.cwd(), 'storage', 'ebooks', access.filename),
      );
      validateEBookFile(buffer, 'application/pdf');
    } catch {
      throw new NotFoundException('Berkas E-Book tidak ditemukan.');
    }

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="ebook-${id}.pdf"`,
    );
    response.setHeader('Content-Length', String(buffer.length));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

    return new StreamableFile(buffer);
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

  @Post('loans/:id/lost/complete')
  completeLostLoan(@Param('id') id: string, @Body() body: unknown) {
    emptyInput(body);
    return this.members.completeLostLoan(positiveId(id));
  }
}
