import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberRoleGuard } from './member-role.guard';
import { SubjectManagementService } from './subject-management.service';

@Controller('members/public')
export class PublicSubjectsController {
  constructor(private readonly subjects: SubjectManagementService) {}

  @Get('subjects')
  list() {
    return this.subjects.publicList();
  }
}

@Controller('members/admin/subjects')
@UseGuards(JwtAuthGuard, MemberRoleGuard)
@SetMetadata('memberRole', 'ADMIN')
export class AdminSubjectsController {
  constructor(private readonly subjects: SubjectManagementService) {}

  @Get()
  list() {
    return this.subjects.list();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.subjects.add(body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.subjects.remove(id);
  }
}
