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
import { AdminBooksService } from './admin-books.service';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('admin/books')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminBooksController {
  constructor(private readonly books: AdminBooksService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.books.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.books.detail(id);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.books.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.books.update(id, body);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.books.setStatus(id, body);
  }
}
