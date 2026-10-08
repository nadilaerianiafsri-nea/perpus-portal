import { Module } from '@nestjs/common';

import { AdminRoleGuard } from '../admin-books/admin-role.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminGrantsController } from './admin-grants.controller';
import { AdminGrantsService } from './admin-grants.service';
import { GrantsController } from './grants.controller';
import { GrantsService } from './grants.service';

@Module({
  imports: [AuthModule],
  controllers: [GrantsController, AdminGrantsController],
  providers: [GrantsService, AdminGrantsService, AdminRoleGuard],
})
export class GrantsModule {}
