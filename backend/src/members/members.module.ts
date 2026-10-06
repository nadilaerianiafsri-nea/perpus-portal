import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  MembersController,
  MemberCirculationController,
} from './members.controller';
import { MemberRoleGuard } from './member-role.guard';
import { MembersService } from './members.service';

@Module({
  imports: [AuthModule],
  controllers: [MembersController, MemberCirculationController],
  providers: [MembersService, MemberRoleGuard],
})
export class MembersModule {}
