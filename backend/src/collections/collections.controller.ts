import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberRoleGuard } from '../members/member-role.guard';
import { CollectionsService } from './collections.service';

const PUBLIC_CATALOG_LIMIT = 50;

function ebookOnly(type?: string) {
  if (type === undefined || type === '') return false;
  if (type !== 'EBOOK') {
    throw new BadRequestException('Jenis filter katalog tidak valid.');
  }
  return true;
}

@Controller()
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get('collections/filters')
  filters(@Query('type') type?: string) {
    return this.collections.filters(
      ebookOnly(type),
      PUBLIC_CATALOG_LIMIT,
    );
  }

  @Get('collections')
  @Header('Cache-Control', 'no-store')
  list(@Query() query: Record<string, unknown>) {
    return this.collections.list(query, false, PUBLIC_CATALOG_LIMIT);
  }

  @Get('ebooks')
  @Header('Cache-Control', 'no-store')
  ebooks(@Query() query: Record<string, unknown>) {
    return this.collections.list(query, true, PUBLIC_CATALOG_LIMIT);
  }

  @Get('members/me/catalog/filters')
  @UseGuards(JwtAuthGuard, MemberRoleGuard)
  @SetMetadata('memberRole', 'PENGUNJUNG')
  memberFilters(@Query('type') type?: string) {
    return this.collections.filters(ebookOnly(type));
  }

  @Get('members/me/catalog')
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard, MemberRoleGuard)
  @SetMetadata('memberRole', 'PENGUNJUNG')
  memberCatalog(@Query() query: Record<string, unknown>) {
    return this.collections.list(query);
  }

  @Get('members/me/catalog/:id')
  @UseGuards(JwtAuthGuard, MemberRoleGuard)
  @SetMetadata('memberRole', 'PENGUNJUNG')
  memberDetail(@Param('id') id: string) {
    return this.collections.detail(id);
  }

  @Get('collections/:id')
  detail(@Param('id') id: string) {
    return this.collections.detail(id);
  }
}
