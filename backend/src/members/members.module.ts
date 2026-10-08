import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ActiveBookGuard } from './active-book.guard';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionsService } from './admin-transactions.service';
import { MemberRoleGuard } from './member-role.guard';
import {
  MemberCirculationController,
  MembersController,
} from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [AuthModule],
  controllers: [
    MembersController,
    MemberCirculationController,
    AdminMembersController,
    AdminTransactionsController,
  ],
  providers: [
    MembersService,
    AdminMembersService,
    AdminTransactionsService,
    MemberRoleGuard,
    ActiveBookGuard,
  ],
  exports: [MembersService],
})
export class MembersModule {}
