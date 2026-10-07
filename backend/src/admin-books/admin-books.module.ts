import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminBooksController } from './admin-books.controller';
import { AdminBooksService } from './admin-books.service';
import { AdminRoleGuard } from './admin-role.guard';

@Module({
  imports: [AuthModule],
  controllers: [AdminBooksController],
  providers: [AdminBooksService, AdminRoleGuard],
})
export class AdminBooksModule {}
