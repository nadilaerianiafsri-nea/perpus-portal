import {
  Controller,
  Get,
  Param,
  Query,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminTransactionsService } from './admin-transactions.service';
import { MemberCacheInterceptor } from './members-cache.interceptor';
import { MemberRoleGuard } from './member-role.guard';
import { memberQuery } from './member.validation';

@Controller('members/admin/transactions')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@UseInterceptors(MemberCacheInterceptor)
@SetMetadata('memberRole', 'ADMIN')
export class AdminTransactionsController {
  constructor(private readonly transactions: AdminTransactionsService) {}

  @Get('reservations')
  reservations(@Query() query: unknown) {
    return this.transactions.reservations(memberQuery(query, ['search', 'status', 'memberType', 'page', 'limit']));
  }

  @Get('loans')
  loans(@Query() query: unknown) {
    return this.transactions.loans(memberQuery(query, ['search', 'status', 'memberType', 'due', 'page', 'limit']));
  }

  @Get('loans/:id')
  loanDetail(@Param('id') id: string, @Query() query: unknown) {
    memberQuery(query, []);
    return this.transactions.loanDetail(id);
  }

  @Get('ebook-access/:id')
  ebookAccessDetail(@Param('id') id: string, @Query() query: unknown) {
    memberQuery(query, []);
    return this.transactions.ebookAccessDetail(id);
  }

  @Get('returns')
  returns(@Query() query: unknown) {
    return this.transactions.returns(memberQuery(query, ['search', 'status', 'memberType', 'page', 'limit']));
  }

  @Get('lost-books')
  lostBooks(@Query() query: unknown) {
    return this.transactions.lostBooks(memberQuery(query, ['search', 'status', 'memberType', 'extension', 'page', 'limit']));
  }

  @Get('lost-books/:id')
  lostBookDetail(@Param('id') id: string, @Query() query: unknown) {
    memberQuery(query, []);
    return this.transactions.lostBookDetail(id);
  }
}
