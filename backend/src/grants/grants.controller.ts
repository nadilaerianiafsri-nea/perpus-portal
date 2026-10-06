import { Controller, Get, Header, Query } from '@nestjs/common';
import { GrantsService } from './grants.service';
@Controller('grants')
export class GrantsController {
  constructor(private readonly grants: GrantsService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query() query: Record<string, unknown>) {
    return this.grants.list(query);
  }
}
