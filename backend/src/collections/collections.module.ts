import { Module } from '@nestjs/common';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
