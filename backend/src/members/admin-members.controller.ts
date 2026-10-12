import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminMembersService } from './admin-members.service';
import { MemberRoleGuard } from './member-role.guard';
import { MemberCacheInterceptor } from './members-cache.interceptor';
import { positiveId, memberQuery } from './member.validation';

@Controller('members/admin/members')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@UseInterceptors(MemberCacheInterceptor)
@SetMetadata('memberRole', 'ADMIN')
export class AdminMembersController {
  constructor(private readonly adminMembers: AdminMembersService) {}

  @Get()
  list(@Query() query: unknown) {
    return this.adminMembers.list(memberQuery(query, ['search', 'memberType', 'verified', 'page', 'limit']));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.adminMembers.detail(positiveId(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.adminMembers.update(positiveId(id), body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.adminMembers.updateStatus(positiveId(id), body);
  }
}
