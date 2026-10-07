import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminRoleGuard } from '../admin-books/admin-role.guard';
import { AdminEBooksController } from './admin-ebooks.controller';
import { AdminEBooksService } from './admin-ebooks.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminEBooksController],
  providers: [AdminEBooksService, AdminRoleGuard],
})
export class AdminEBooksModule {}
