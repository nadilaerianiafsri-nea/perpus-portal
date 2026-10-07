import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { GrantsModule } from './grants/grants.module';
import { ContactModule } from './contact/contact.module';
import { MembersModule } from './members/members.module';
import { AdminBooksModule } from './admin-books/admin-books.module';
import { AdminEBooksModule } from './admin-ebooks/admin-ebooks.module';
import { AdminUploadsModule } from './admin-uploads/admin-uploads.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CollectionsModule,
    GrantsModule,
    ContactModule,
    MembersModule,
    AdminBooksModule,
    AdminEBooksModule,
    AdminUploadsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
