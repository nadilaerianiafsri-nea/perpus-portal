import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ActiveBookGuard } from './active-book.guard';
import {
  AdminOperationsController,
  PublicLibrarySettingsController,
} from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionsService } from './admin-transactions.service';
import { EBookCirculationService } from './ebook-circulation.service';
import { MemberRoleGuard } from './member-role.guard';
import {
  MemberCirculationController,
  MembersController,
} from './members.controller';
import { MembersService } from './members.service';
import { ProfilePhotoController } from './profile-photo.controller';
import { ProfilePhotoService } from './profile-photo.service';
import { ProfilePhotoStorage } from './profile-photo.storage';
import {
  AdminPublicContentController,
  PublicContentController,
} from './public-content.controller';
import { PublicContentService } from './public-content.service';

@Module({
  imports: [AuthModule],
  controllers: [
    ProfilePhotoController,
    MembersController,
    MemberCirculationController,
    AdminMembersController,
    AdminTransactionsController,
    AdminOperationsController,
    PublicLibrarySettingsController,
    PublicContentController,
    AdminPublicContentController,
  ],
  providers: [
    ProfilePhotoService,
    ProfilePhotoStorage,
    MembersService,
    EBookCirculationService,
    AdminMembersService,
    AdminTransactionsService,
    AdminOperationsService,
    PublicContentService,
    MemberRoleGuard,
    ActiveBookGuard,
  ],
  exports: [
    MembersService,
    EBookCirculationService,
    AdminOperationsService,
    PublicContentService,
    MemberRoleGuard,
  ],
})
export class MembersModule {}
