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

import { AdminRoleGuard } from '../admin-books/admin-role.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGrantsService } from './admin-grants.service';

@Controller('admin/grants')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminGrantsController {
  constructor(private readonly grants: AdminGrantsService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.grants.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.grants.detail(id);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.grants.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.grants.update(id, body);
  }
}
