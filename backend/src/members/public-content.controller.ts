import { Body, Controller, Get, Patch, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberRoleGuard } from './member-role.guard';
import { PublicContentService } from './public-content.service';

@Controller('members/public')
export class PublicContentController {
  constructor(private readonly content: PublicContentService) {}

  @Get('content')
  getContent() {
    return this.content.getContent();
  }

  @Get('summary')
  getSummary() {
    return this.content.getPublicSummary();
  }
}

@Controller('members/admin/public-content')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@SetMetadata('memberRole', 'ADMIN')
export class AdminPublicContentController {
  constructor(private readonly content: PublicContentService) {}

  @Get()
  getContent() {
    return this.content.getContent();
  }

  @Patch()
  updateContent(@Body() body: unknown) {
    return this.content.updateContent(body);
  }
}
