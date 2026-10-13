import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOperationsService } from './admin-operations.service';
import { MemberRoleGuard } from './member-role.guard';

@Controller('members/admin/operations')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@SetMetadata('memberRole', 'ADMIN')
export class AdminOperationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get('dashboard')
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.operations.dashboard({ from, to });
  }

  @Get('notifications')
  notifications(
    @Query('search') search?: string,
    @Query('channel') channel?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.operations.notifications({ search, channel, page, limit });
  }

  @Get('reports')
  reports(@Query('from') from?: string, @Query('to') to?: string) {
    return this.operations.reports({ from, to });
  }

  @Get('settings')
  settings() {
    return this.operations.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() body: unknown) {
    return this.operations.updateSettings(body);
  }
}

@Controller('members/public')
export class PublicLibrarySettingsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get('settings')
  settings() {
    return this.operations.getSettings();
  }
}
