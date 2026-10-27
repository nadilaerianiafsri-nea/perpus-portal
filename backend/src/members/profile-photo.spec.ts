import { createHmac } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jest } from '@jest/globals';
import { Logger, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureHttpSecurity } from '../security/http-security';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { MemberRoleGuard } from './member-role.guard';
import { MembersService } from './members.service';
import { profileInput } from './member.validation';
import { ProfilePhotoController } from './profile-photo.controller';
import { ProfilePhotoService } from './profile-photo.service';
import { ProfilePhotoStorage } from './profile-photo.storage';

const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
const webp = Buffer.from('RIFF0000WEBP0000');
const base = '/members/me/profile/photo';
const secret = 'profile-photo-test-secret';
const jwt = new JwtService();
const session = (sub = 1) =>
  `perpus_session=${jwt.sign({ sub, credentialVersion: createHmac('sha256', secret).update('hash').digest('hex') }, { secret })}`;
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  memberType: string;
  passwordHash: string;
  emailVerified: boolean;
  isActive: boolean;
  profileImageUrl: string | null;
  memberProfile: {
    whatsapp: string;
    address: string;
    identityNumber: string;
    universityName: null;
    workUnit: null;
  };
};

describe('private member profile photos', () => {
  let app: INestApplication;
  let directory: string;
  let storage: ProfilePhotoStorage;
  let service: ProfilePhotoService;
  let users: Map<number, User>;
  let failCommit = false;
  let transactionTail = Promise.resolve();
  const findUnique = async ({
    where,
    select,
  }: {
    where: { id: number };
    select?: Record<string, unknown>;
  }) => {
    const user = users.get(where.id);
    if (!user) return null;
    return select
      ? Object.fromEntries(
          Object.keys(select).map((key) => [key, user[key as keyof User]]),
        )
      : { ...user };
  };
  const prisma = {
    user: { findUnique },
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => {
      // Model a DB row lock: reads and commit happen within the same critical section.
      const previous = transactionTail;
      let unlock!: () => void;
      transactionTail = new Promise<void>((resolve) => {
        unlock = resolve;
      });
      await previous;
      const snapshot = new Map(
        [...users].map(([id, user]) => [id, structuredClone(user)]),
      );
      let locked = false;
      try {
        const result = await work({
          $queryRaw: async (sql: TemplateStringsArray, userId: number) => {
            if (
              !sql.join('?').includes('FROM users WHERE id = ? FOR UPDATE') ||
              userId !== 1
            )
              throw new Error('Incorrect owner lock');
            locked = true;
            return [{ id: userId }];
          },
          user: {
            findUnique: async (input: Parameters<typeof findUnique>[0]) => {
              if (!locked) throw new Error('Read before owner lock');
              return findUnique(input);
            },
            update: async ({
              where,
              data,
            }: {
              where: { id: number };
              data: { profileImageUrl: string | null };
            }) => {
              if (
                !locked ||
                where.id !== 1 ||
                Object.keys(data).join() !== 'profileImageUrl'
              )
                throw new Error('Unsafe mutation');
              Object.assign(users.get(where.id)!, data);
              return { ...users.get(where.id)! };
            },
          },
        });
        if (failCommit) throw new Error('Database commit failed');
        return result;
      } catch (error) {
        users = snapshot;
        throw error;
      } finally {
        unlock();
      }
    },
  };
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'perpus-avatars-'));
    storage = new ProfilePhotoStorage(directory);
    const members = new MembersService(
      prisma as unknown as PrismaService,
      {} as MailService,
    );
    const module = await Test.createTestingModule({
      controllers: [ProfilePhotoController],
      providers: [
        MemberRoleGuard,
        ProfilePhotoService,
        { provide: ProfilePhotoStorage, useValue: storage },
        { provide: MembersService, useValue: members },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
      ],
    }).compile();
    service = module.get(ProfilePhotoService);
    app = module.createNestApplication<NestExpressApplication>();
    configureHttpSecurity(app as NestExpressApplication, ['http://localhost:3214']);
    app.use(cookieParser());
    app.useLogger(false);
    await app.init();
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    failCommit = false;
    users = new Map(
      [1, 2, 3, 4].map((id) => [
        id,
        {
          id,
          name: 'Najwa Azizi',
          email: `member${id}@example.test`,
          role: id === 3 ? 'ADMIN' : 'PENGUNJUNG',
          memberType: 'UMUM',
          passwordHash: 'hash',
          emailVerified: true,
          isActive: id !== 4,
          profileImageUrl: null,
          memberProfile: {
            whatsapp: '081234567890',
            address: 'Pekanbaru',
            identityNumber: '123',
            universityName: null,
            workUnit: null,
          },
        },
      ]),
    );
    for (const name of await readdir(directory))
      await rm(join(directory, name));
  });
  afterAll(async () => {
    await app.close();
    await rm(directory, { recursive: true });
  });
  const upload = (
    buffer: Buffer = jpg,
    filename = 'photo.jpg',
    contentType = 'image/jpeg',
    sub = 1,
  ) =>
    request(app.getHttpServer())
      .post(base)
      .set('Cookie', session(sub))
      .attach('photo', buffer, { filename, contentType });
  const photoFile = (url: string) => url.slice('/uploads/avatars/'.length);

  it.each([
    [jpg, 'photo.jpeg', 'image/jpeg', 'jpg'],
    [png, 'photo.png', 'image/png', 'png'],
    [webp, 'photo.webp', 'image/webp', 'webp'],
  ] as const)(
    'stores and privately reads valid %s (%s)',
    async (buffer, filename, contentType, extension) => {
      const result = await upload(buffer, filename, contentType).expect(201);
      const profile = result.body.profile;
      expect(profile).toMatchObject({
        id: 1,
        name: 'Najwa Azizi',
        address: 'Pekanbaru',
        whatsapp: '081234567890',
      });
      expect(profile.passwordHash).toBeUndefined();
      expect(profile.profileImageUrl).toMatch(
        new RegExp(`^/uploads/avatars/[0-9a-f-]{36}\\.${extension}$`),
      );
      const name = photoFile(profile.profileImageUrl);
      expect(await readFile(join(directory, name))).toEqual(buffer);
      const response = await request(app.getHttpServer())
        .get(`${base}/${name}`)
        .set('Cookie', session())
        .expect(200);
      expect(response.headers['content-type']).toContain(contentType);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toContain(
        "default-src 'none'",
      );
      expect(response.body).toEqual(buffer);
      await request(app.getHttpServer())
        .get(`${base}/${name}`)
        .set('Cookie', session(2))
        .expect(404);
      await request(app.getHttpServer())
        .get(`/uploads/avatars/${name}`)
        .expect(404);
    },
  );
  it('replaces with a new UUID, removes the old file after commit, and deletes back to null', async () => {
    const first = await upload().expect(201);
    const old = photoFile(first.body.profile.profileImageUrl);
    const second = await upload(png, 'next.png', 'image/png').expect(201);
    const current = photoFile(second.body.profile.profileImageUrl);
    expect(current).not.toBe(old);
    expect(await readdir(directory)).toEqual([current]);
    await request(app.getHttpServer())
      .get(`${base}/${old}`)
      .set('Cookie', session())
      .expect(404);
    const deleted = await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .send({})
      .expect(200);
    expect(deleted.body.profile).toMatchObject({
      id: 1,
      profileImageUrl: null,
      identityNumber: '123',
    });
    expect(await readdir(directory)).toEqual([]);
    await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .expect(200);
  });
  it.each([
    [Buffer.from('<svg/>'), 'photo.svg', 'image/svg+xml'],
    [Buffer.from('script'), 'photo.jpg', 'image/jpeg'],
    [jpg, 'photo.png', 'image/jpeg'],
    [jpg, 'photo.jpg', 'image/png'],
    [Buffer.alloc(5 * 1024 * 1024 + 1), 'large.jpg', 'image/jpeg'],
  ])(
    'rejects unsafe file %s %s %s without persistence',
    async (buffer, filename, contentType) => {
      const response = await upload(
        buffer as Buffer,
        filename as string,
        contentType as string,
      );
      expect([400, 413]).toContain(response.status);
      expect(users.get(1)!.profileImageUrl).toBeNull();
      expect(await readdir(directory)).toEqual([]);
    },
  );
  it('rejects raw multipart filenames containing traversal before storing a file', async () => {
    // form-data strips paths from its filename option, so send the actual wire input.
    for (const filename of ['../photo.jpg', '..\\photo.jpg']) {
      const body = Buffer.concat([
        Buffer.from(
          `--avatar-boundary\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`,
        ),
        jpg,
        Buffer.from('\r\n--avatar-boundary--\r\n'),
      ]);
      await request(app.getHttpServer())
        .post(base)
        .set('Cookie', session())
        .set('Content-Type', 'multipart/form-data; boundary=avatar-boundary')
        .send(body)
        .expect(400);
    }
    expect(await readdir(directory)).toEqual([]);
  });
  it('rejects extra fields, files, ownership query/body and unsupported request bodies', async () => {
    await upload().field('userId', '2').expect(400);
    await upload()
      .attach('photo', jpg, {
        filename: 'second.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(base)
      .set('Cookie', session())
      .attach('avatar', jpg, 'photo.jpg')
      .expect(400);
    await request(app.getHttpServer())
      .post(`${base}?userId=2`)
      .set('Cookie', session())
      .attach('photo', jpg, 'photo.jpg')
      .expect(400);
    await request(app.getHttpServer())
      .post(base)
      .set('Cookie', session())
      .send({ profileImageUrl: 'https://evil.test' })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`${base}?userId=2`)
      .set('Cookie', session())
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .send({ userId: 2 })
      .expect(400);
    expect(users.get(2)!.profileImageUrl).toBeNull();
    expect(await readdir(directory)).toEqual([]);
    expect(() =>
      profileInput(
        { profileImageUrl: '/uploads/avatars/arbitrary.jpg' },
        'UMUM',
      ),
    ).toThrow();
  });
  it('rejects unparsed DELETE request bodies rather than treating them as empty', async () => {
    await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .set('Content-Type', 'text/plain')
      .send('userId=2')
      .expect(415);
    await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .field('userId', '2')
      .expect(400);
    expect(users.get(1)!.profileImageUrl).toBeNull();
  });
  it('requires a real active member session for every route', async () => {
    for (const sub of [undefined, 3, 4]) {
      for (const method of ['post', 'delete', 'get'] as const) {
        const call = request(app.getHttpServer())[method](
          method === 'get'
            ? `${base}/11111111-1111-4111-8111-111111111111.jpg`
            : base,
        );
        if (sub) call.set('Cookie', session(sub));
        await call.expect(sub ? 403 : 401);
      }
    }
    users.get(1)!.emailVerified = false;
    await upload().expect(403);
    await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .expect(403);
    expect(await readdir(directory)).toEqual([]);
  });
  it('rejects invalid read filenames, unknown refs and tampered stored image content', async () => {
    for (const filename of [
      'fake.jpg',
      '11111111-1111-1111-1111-111111111111.jpg',
      '..%5Cphoto.jpg',
      '11111111-1111-4111-8111-111111111111.svg',
    ]) {
      await request(app.getHttpServer())
        .get(`${base}/${filename}`)
        .set('Cookie', session())
        .expect(404);
    }
    const result = await upload().expect(201);
    const name = photoFile(result.body.profile.profileImageUrl);
    await writeFile(join(directory, name), 'not an image');
    await request(app.getHttpServer())
      .get(`${base}/${name}`)
      .set('Cookie', session())
      .expect(404);
  });
  it('rolls back a failed commit and deletes the staged replacement while retaining the old image', async () => {
    const result = await upload().expect(201);
    const reference = result.body.profile.profileImageUrl;
    failCommit = true;
    await upload(png, 'photo.png', 'image/png').expect(500);
    expect(users.get(1)!.profileImageUrl).toBe(reference);
    expect(await readdir(directory)).toEqual([photoFile(reference)]);
    await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .expect(500);
    expect(users.get(1)!.profileImageUrl).toBe(reference);
    expect(await readdir(directory)).toEqual([photoFile(reference)]);
  });
  it('keeps successful updates successful if cleanup fails, and does not remove arbitrary legacy paths', async () => {
    await upload().expect(201);
    jest
      .spyOn(storage, 'remove')
      .mockRejectedValue(new Error('Filesystem unavailable'));
    const warning = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .send({})
      .expect(200);
    expect(users.get(1)!.profileImageUrl).toBeNull();
    expect(warning).toHaveBeenCalled();
    jest.restoreAllMocks();
    const sentinel = join(directory, 'sentinel.txt');
    await writeFile(sentinel, 'keep');
    users.get(1)!.profileImageUrl = '/uploads/avatars/../sentinel.txt';
    await request(app.getHttpServer())
      .delete(base)
      .set('Cookie', session())
      .expect(200);
    expect(await readFile(sentinel, 'utf8')).toBe('keep');
  });
  it('does not mutate the profile when storage fails', async () => {
    jest.spyOn(storage, 'save').mockRejectedValue(new Error('Disk full'));
    await upload().expect(500);
    expect(users.get(1)!.profileImageUrl).toBeNull();
    expect(await readdir(directory)).toEqual([]);
  });
  it('surfaces real filesystem failure without publishing or overwriting files', async () => {
    const blockedDirectory = join(directory, 'occupied');
    await writeFile(blockedDirectory, 'existing file');
    const blockedStorage = new ProfilePhotoStorage(blockedDirectory);
    await expect(blockedStorage.save(jpg, 'jpg')).rejects.toThrow();
    expect(await readFile(blockedDirectory, 'utf8')).toBe('existing file');
    expect(users.get(1)!.profileImageUrl).toBeNull();
  });
  it('serializes concurrent replacements and delete without leaving references to deleted files', async () => {
    await upload().expect(201);
    await Promise.all([
      service.replace(1, {
        buffer: png,
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: png.length,
      }),
      service.replace(1, {
        buffer: webp,
        originalname: 'photo.webp',
        mimetype: 'image/webp',
        size: webp.length,
      }),
      service.remove(1),
    ]);
    const reference = users.get(1)!.profileImageUrl;
    expect(await readdir(directory)).toEqual(
      reference ? [photoFile(reference)] : [],
    );
    if (reference)
      expect(
        (await readFile(join(directory, photoFile(reference)))).length,
      ).toBeGreaterThan(0);
  });
});
