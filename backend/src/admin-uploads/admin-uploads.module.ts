import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminRoleGuard } from '../admin-books/admin-role.guard';
import { AdminUploadsController } from './admin-uploads.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminUploadsController],
  providers: [AdminRoleGuard],
})
export class AdminUploadsModule {}
