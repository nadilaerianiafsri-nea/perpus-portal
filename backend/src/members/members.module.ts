import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ActiveBookGuard } from './active-book.guard';
import {
  AdminOperationsController,
  PublicLibrarySettingsController,
} from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';
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
    AdminOperationsController,
    PublicLibrarySettingsController,
  ],
  providers: [
    MembersService,
    AdminMembersService,
    AdminTransactionsService,
    AdminOperationsService,
    MemberRoleGuard,
    ActiveBookGuard,
  ],
  exports: [MembersService, AdminOperationsService],
})
export class MembersModule {}
