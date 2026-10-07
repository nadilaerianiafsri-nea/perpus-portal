import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../admin-books/admin-role.guard';
import { AdminEBooksService } from './admin-ebooks.service';

@Controller('admin/ebooks')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminEBooksController {
  constructor(private readonly ebooks: AdminEBooksService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.ebooks.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.ebooks.detail(id);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.ebooks.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.ebooks.update(id, body);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.ebooks.setStatus(id, body);
  }
}
