import { jest } from '@jest/globals';
import { AdminOperationsService } from './admin-operations.service';
import { parseNotificationQuery } from './admin-operations.validation';

const time = new Date('2026-10-26T03:00:00Z');
function fixture() {
  const notice = (id: number, eventKey: string, emailDelivery = 'NOT_REQUIRED', whatsappDelivery = 'NOT_REQUIRED') => ({
    id, eventKey, title: 'Judul tidak menentukan route', message: 'Buku Riau memerlukan perhatian.', href: '/dashboard/pinjaman',
    createdAt: time, emailDelivery, emailSentAt: null, emailAttemptedAt: time, whatsappDelivery,
    user: { name: 'Najwa', email: 'najwa@example.test', memberProfile: { whatsapp: '081234567890' } },
  });
  const notices = [notice(1,'reservation:23:created'),notice(2,'loan:7:lost-report'),notice(3,'loan:15:due:1790000000000:2','FAILED','MANUAL'),notice(4,'ebook:loan:12:expired','SENT'),notice(5,'legacy','SENT')];
  const prisma = {
    notification: { findMany: jest.fn(async () => notices), findFirst: jest.fn(async () => ({id:1})), count: jest.fn(async () => 1) },
    reservation: { findMany: jest.fn(async () => [{id:23,book:{title:'Buku Riau'}}]) },
    adminNotificationRead: { findMany: jest.fn(async () => [{notificationId:2,readAt:time}]), createMany: jest.fn(async () => ({count:1})), upsert: jest.fn(async () => ({readAt:time})) },
  };
  return { prisma, service:new AdminOperationsService(prisma as never), notices };
}
describe('admin operational notification center', () => {
  it('validates System/Unread and paired real WIB ranges; rejects objects, duplicates and invalid fields', () => {
    expect(parseNotificationQuery({channel:'SYSTEM'}).channel).toBe('SYSTEM');
    expect(parseNotificationQuery({channel:'UNREAD'}).channel).toBe('UNREAD');
    const query = parseNotificationQuery({from:'2026-10-26',to:'2026-10-26'});
    expect(query.start).toEqual(new Date('2026-10-25T17:00:00Z'));
    expect(query.endExclusive).toEqual(new Date('2026-10-26T17:00:00Z'));
    for (const input of [{channel:['EMAIL','SYSTEM']},{search:{x:1}},{from:'2026-02-30',to:'2026-03-01'},{from:'2026-10-26'},{from:'2026-10-27',to:'2026-10-26'},{unexpected:'x'}]) expect(()=>parseNotificationQuery(input)).toThrow();
  });
  it('separates delivery from internal read status and resolves exact existing source detail', async () => {
    const {service}=fixture();const result=await service.notifications(99,{});
    expect(result.counts).toEqual({all:6,system:2,email:3,whatsapp:1,failed:1,unread:1});
    expect(result.data.find(row=>row.id==='1:SYSTEM')).toMatchObject({entityType:'RESERVATION',entityId:23,href:'/admin/transaksi/reservasi/23',description:'Buku Riau memerlukan perhatian.',readAt:null});
    expect(result.data.find(row=>row.id==='2:SYSTEM')).toMatchObject({href:'/admin/transaksi/buku-hilang-penggantian/7',readAt:time});
    expect(result.data.find(row=>row.id==='3:EMAIL')).toMatchObject({href:'/admin/transaksi/peminjaman/15',status:'GAGAL',readAt:null});
    expect(result.data.find(row=>row.id==='3:WHATSAPP')).toMatchObject({status:'MANUAL'});
    expect(result.data.find(row=>row.id==='4:EMAIL')).toMatchObject({href:'/admin/transaksi/e-book/12?jenis=akses'});
    expect(result.data.find(row=>row.id==='5:EMAIL')?.href).toBeNull();
  });
  it('filters search/date/category before paging while counts and admin unread stay global', async () => {
    const {service,notices}=fixture();notices[0].createdAt=new Date('2026-10-25T16:59:59Z');
    const unread=await service.notifications(99,{channel:'UNREAD'});expect(unread.data.map(row=>row.id)).toEqual(['1:SYSTEM']);
    const system=await service.notifications(99,{channel:'SYSTEM',from:'2026-10-26',to:'2026-10-26'});expect(system.data.map(row=>row.id)).toEqual(['2:SYSTEM']);expect(system.summaryCounts.unread).toBe(1);expect(system.counts.unread).toBe(0);
    const search=await service.notifications(99,{search:'memerlukan perhatian',channel:'EMAIL',limit:'10'});expect(search.meta.total).toBe(3);expect(search.data.every(row=>row.channel==='EMAIL')).toBe(true);
    const empty=await service.notifications(99,{search:'absent'});expect(empty.data).toHaveLength(0);expect(empty.counts.all).toBe(0);expect(empty.summaryCounts.all).toBe(6);expect(empty.summaryCounts.unread).toBe(1);
  });
  it('bulk-read uses the existing per-admin read table and a captured cutoff, never member read or delivery state', async () => {
    const {service,prisma}=fixture();await expect(service.markAllNotificationsRead(99)).resolves.toEqual({count:1});
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({
      adminReads:{none:{adminId:99}},createdAt:{lte:expect.any(Date)},
      OR:[{eventKey:{startsWith:'reservation:',endsWith:':created'}},{eventKey:{startsWith:'loan:',endsWith:':lost-report'}}],
    })}));
    expect(prisma.adminNotificationRead.createMany).toHaveBeenCalledWith({data:expect.arrayContaining([{adminId:99,notificationId:1}]),skipDuplicates:true});
    expect(prisma.notification.findFirst).not.toHaveBeenCalled();
  });
  it('paginates after category and search and preserves latest-first ordering for a larger history',async()=>{
    const {service,notices}=fixture();const source=notices[0];notices.splice(0,notices.length,...Array.from({length:23},(_,i)=>({...source,id:i+1,eventKey:`reservation:${i+1}:created`,message:i===0?'Unique book':'Other book'})));
    const page=await service.notifications(99,{channel:'SYSTEM',page:'2',limit:'10'});
    expect(page.meta).toEqual({page:2,limit:10,total:23,totalPages:3});expect(page.data[0].sourceNotificationId).toBe(13);expect(page.data).toHaveLength(10);
    const search=await service.notifications(99,{channel:'SYSTEM',search:'Unique',page:'2'});expect(search.meta.total).toBe(1);expect(search.meta.page).toBe(1);expect(search.data[0].sourceNotificationId).toBe(1);
  });
});
