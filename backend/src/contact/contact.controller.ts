import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  send(@Body() body: unknown) {
    return this.contact.send(body);
  }
}
