import { createHmac } from 'node:crypto';
import { jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';
import { MemberRoleGuard } from './member-role.guard';
import { parseNotificationQuery } from './admin-operations.validation';

describe('admin notification center HTTP guards and input boundaries',()=>{
  let app:INestApplication;
  const jwt=new JwtService(),secret='notification-center-test-secret';
  const operations={notifications:jest.fn(async(_admin:number,query:Parameters<typeof parseNotificationQuery>[0])=>parseNotificationQuery(query)),markAllNotificationsRead:jest.fn(async()=>({count:2})),markNotificationRead:jest.fn(async()=>({readAt:new Date()})),unreadNotificationCount:jest.fn(async()=>({unread:2}))};
  const session=(sub=99)=>`perpus_session=${jwt.sign({sub,credentialVersion:createHmac('sha256',secret).update('hash').digest('hex')},{secret})}`;
  beforeAll(async()=>{
    const module=await Test.createTestingModule({controllers:[AdminOperationsController],providers:[MemberRoleGuard,{provide:AdminOperationsService,useValue:operations},{provide:JwtService,useValue:jwt},{provide:ConfigService,useValue:{getOrThrow:()=>secret}},{provide:PrismaService,useValue:{user:{findUnique:async({where}:{where:{id:number}})=>({passwordHash:'hash',role:where.id===99?'ADMIN':'PENGUNJUNG',emailVerified:true,isActive:true})}}}]}).compile();
    app=module.createNestApplication();app.use(cookieParser());await app.init();
  });
  beforeEach(()=>jest.clearAllMocks());afterAll(async()=>app.close());
  const base='/members/admin/operations/notifications';
  it('keeps list, unread count, single read and all-read admin-only',async()=>{
    for(const route of ['', '/unread-count']){
      await request(app.getHttpServer()).get(base+route).expect(401);
      await request(app.getHttpServer()).get(base+route).set('Cookie',session(7)).expect(403);
    }
    for(const route of ['/8/read','/read-all']){
      await request(app.getHttpServer()).patch(base+route).send({}).expect(401);
      await request(app.getHttpServer()).patch(base+route).set('Cookie',session(7)).send({}).expect(403);
    }
    expect(operations.markAllNotificationsRead).not.toHaveBeenCalled();expect(operations.markNotificationRead).not.toHaveBeenCalled();
  });
  it('validates categories, dates, duplicate/unknown query and read body without broadening mutations',async()=>{
    for(const query of ['channel=SYSTEM&channel=EMAIL','channel=BAD','from=2026-02-30&to=2026-03-01','from=2026-10-26','extra=1']) await request(app.getHttpServer()).get(base+'?'+query).set('Cookie',session()).expect(400);
    await request(app.getHttpServer()).patch(base+'/read-all').set('Cookie',session()).send({adminId:7}).expect(400);
    await request(app.getHttpServer()).patch(base+'/8/read').set('Cookie',session()).send({readAt:'fake'}).expect(400);
    expect(operations.markAllNotificationsRead).not.toHaveBeenCalled();expect(operations.markNotificationRead).not.toHaveBeenCalled();
    await request(app.getHttpServer()).patch(base+'/read-all').set('Cookie',session()).send({}).expect(200,{count:2});
    expect(operations.markAllNotificationsRead).toHaveBeenCalledWith(99);
  });
});
