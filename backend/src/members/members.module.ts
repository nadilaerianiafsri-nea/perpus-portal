import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ActiveBookGuard } from './active-book.guard';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
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
  ],
  providers: [
    MembersService,
    AdminMembersService,
    MemberRoleGuard,
    ActiveBookGuard,
  ],
  exports: [MembersService],
})
export class MembersModule {}
