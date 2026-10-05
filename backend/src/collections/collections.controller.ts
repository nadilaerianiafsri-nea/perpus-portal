import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { CollectionsService } from './collections.service';

@Controller()
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get('collections/filters')
  filters() {
    return this.collections.filters();
  }

  @Get('collections')
  @Header('Cache-Control', 'no-store')
  list(@Query() query: Record<string, unknown>) {
    return this.collections.list(query);
  }

  @Get('ebooks')
  @Header('Cache-Control', 'no-store')
  ebooks(@Query() query: Record<string, unknown>) {
    return this.collections.list(query, true);
  }

  @Get('collections/:id')
  detail(@Param('id') id: string) {
    return this.collections.detail(id);
  }
}
