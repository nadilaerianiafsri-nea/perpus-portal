import {
  Controller,
  Get,
  Query,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminTransactionsService } from './admin-transactions.service';
import { MemberCacheInterceptor } from './members-cache.interceptor';
import { MemberRoleGuard } from './member-role.guard';

@Controller('members/admin/transactions')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@UseInterceptors(MemberCacheInterceptor)
@SetMetadata('memberRole', 'ADMIN')
export class AdminTransactionsController {
  constructor(private readonly transactions: AdminTransactionsService) {}

  @Get('reservations')
  reservations(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('memberType') memberType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactions.reservations({
      search,
      status,
      memberType,
      page,
      limit,
    });
  }

  @Get('loans')
  loans(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('memberType') memberType?: string,
    @Query('due') due?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactions.loans({
      search,
      status,
      memberType,
      due,
      page,
      limit,
    });
  }

  @Get('returns')
  returns(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('memberType') memberType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactions.returns({
      search,
      status,
      memberType,
      page,
      limit,
    });
  }

  @Get('lost-books')
  lostBooks(
    @Query('search') search?: string,
    @Query('memberType') memberType?: string,
    @Query('extension') extension?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactions.lostBooks({
      search,
      memberType,
      extension,
      page,
      limit,
    });
  }
}
