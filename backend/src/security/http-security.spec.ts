import { Test } from '@nestjs/testing';
import {
  Body,
  Controller,
  Post,
  type INestApplication,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { configureHttpSecurity } from './http-security';
import { PublicRateGuard } from './public-rate.guard';

@Controller()
class InputEchoController {
  @Post('auth/login')
  login(@Body() body: unknown) {
    return body;
  }

  @Post('contact')
  contact(@Body() body: unknown) {
    return body;
  }

  @Post('admin/uploads/cover')
  coverUpload() {
    return { ok: true };
  }

  @Post('admin/uploads/ebook')
  ebookUpload() {
    return { ok: true };
  }
}

describe('HTTP security outside endpoint validation', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [InputEchoController],
      providers: [{ provide: APP_GUARD, useClass: PublicRateGuard }],
    }).compile();
    const instance = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    app = instance;
    configureHttpSecurity(instance, ['https://library.example']);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects cross-origin writes, including direct backend requests', async () => {
    await request(app.getHttpServer())
      .post('/contact')
      .set('Origin', 'https://attacker.example')
      .send({ message: 'x' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/contact')
      .set('Origin', 'https://library.example')
      .send({ message: 'x' })
      .expect(201);
  });

  it('allows multipart only for the approved admin upload endpoints', async () => {
    await request(app.getHttpServer())
      .post('/admin/uploads/cover')
      .attach('cover', Buffer.from('cover'), 'cover.png')
      .expect(201);

    await request(app.getHttpServer())
      .post('/admin/uploads/ebook')
      .attach('ebook', Buffer.from('%PDF-1.7\n%%EOF'), 'contoh.pdf')
      .expect(201);

    await request(app.getHttpServer())
      .post('/contact')
      .attach('file', Buffer.from('x'), 'x.bin')
      .expect(415);
  });

  it('rejects oversized JSON without reflecting its content', async () => {
    const response = await request(app.getHttpServer())
      .post('/contact')
      .send({ message: 'private'.repeat(12000) })
      .expect(413);
    expect(JSON.stringify(response.body)).not.toContain('private');
  });

  it('keeps password characters intact and returns compatible security headers', async () => {
    const body = { password: " <A&'Ωbcdef> " };
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(body)
      .expect(201);
    expect(response.body).toEqual(body);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain(
      "frame-ancestors 'self'",
    );
  });

  it('limits login per account despite arbitrary forwarded IP headers', async () => {
    for (let index = 0; index < 20; index++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `192.0.2.${index}`)
        .send({ email: 'member@example.test' })
        .expect(201);
    }
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@example.test' })
      .expect(429);
    await request(app.getHttpServer())
      .post('/AUTH/LOGIN/')
      .send({ email: 'member@example.test' })
      .expect(429);
    expect(response.headers['retry-after']).toBeDefined();
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other@example.test' })
      .expect(201);
  });
});
