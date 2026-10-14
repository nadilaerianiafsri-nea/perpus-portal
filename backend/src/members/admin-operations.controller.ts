import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { AdminOperationsService } from './admin-operations.service';
import { MemberRoleGuard } from './member-role.guard';
import { emptyInput, positiveId } from './member.validation';

@Controller('members/admin/operations')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@SetMetadata('memberRole', 'ADMIN')
export class AdminOperationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get('dashboard')
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.operations.dashboard({ from, to });
  }

  @Get('notifications/unread-count')
  unreadNotificationCount(@Req() req: AuthenticatedRequest) {
    return this.operations.unreadNotificationCount(req.user!.sub);
  }

  @Get('notifications')
  notifications(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('channel') channel?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.operations.notifications(req.user!.sub, {
      search,
      channel,
      page,
      limit,
    });
  }

  @Patch('notifications/:id/read')
  readNotification(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    emptyInput(body);
    return this.operations.markNotificationRead(req.user!.sub, positiveId(id));
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
