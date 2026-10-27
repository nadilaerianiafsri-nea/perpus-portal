import { AdminTransactionsService } from './admin-transactions.service';
import { AdminTransactionsController } from './admin-transactions.controller';
import { overdueLoanOptions } from './admin-overdue-query';
import type { Prisma } from '../generated/prisma/client';

const now = new Date('2026-10-26T03:00:00Z');
describe('existing admin loans overdue monitoring query', () => {
  afterEach(() => jest.useRealTimers());
  it('validates bucket, sort and paired real WIB dates without changing regular loan queries', () => {
    expect(overdueLoanOptions({}, now).where).toEqual([]);
    for (const query of [{status:'ALL',bucket:'ONE_TO_THREE'},{status:'OVERDUE',bucket:'bad'},{status:'OVERDUE',sort:'bad'},
      {status:'OVERDUE',from:'2026-02-30',to:'2026-03-01'}, {status:'OVERDUE',from:'2026-10-27',to:'2026-10-26'}, {status:'OVERDUE',from:'2026-10-26'}]) {
      expect(() => overdueLoanOptions(query,now)).toThrow();
    }
    const result=overdueLoanOptions({status:'OVERDUE',bucket:'FOUR_TO_FOURTEEN',sort:'NEWEST',from:'2026-10-01',to:'2026-10-26'},now);
    expect(result.direction).toBe('desc');
    expect(result.where).toContainEqual({dueAt:{gte:new Date('2026-09-30T17:00:00Z'),lt:new Date('2026-10-26T17:00:00Z')}});
  });
  it('applies overdue/member/search/bucket/date filters and sort before pagination; stats stay global', async () => {
    jest.useFakeTimers().setSystemTime(now);
    const loan={id:31,status:'AKTIF',borrowedAt:new Date('2026-10-01'),dueAt:new Date('2026-10-22T03:00:00Z'),extensionCount:2,
      user:{id:7,name:'Anggota',email:'member@example.test',memberType:'MAHASISWA',memberProfile:{whatsapp:'081234567890'}},
      book:{id:4,title:'Buku Riau',code:'BK-004',coverUrl:''},copy:{id:5,code:'CP-5'}};
    const prisma={loan:{count:jest.fn(async(_query:Prisma.LoanCountArgs)=>21),findMany:jest.fn(async(_query:Prisma.LoanFindManyArgs)=>[loan])},userEBook:{findMany:jest.fn(async()=>[])}};
    const service=new AdminTransactionsService(prisma as never,{} as never);
    const result=await service.loans({status:'OVERDUE',search:'Riau',memberType:'MAHASISWA',bucket:'FOUR_TO_FOURTEEN',from:'2026-10-01',to:'2026-10-26',sort:'NEWEST',page:'2',limit:'20'});
    const query=prisma.loan.findMany.mock.calls[0][0];
    expect(query.skip).toBe(20);expect(query.take).toBe(20);
    expect(query.orderBy).toEqual([{dueAt:'desc'},{id:'desc'}]);
    expect(query.where?.AND).toContainEqual({dueAt:{lt:now}});
    expect(query.where?.AND).toContainEqual({dueAt:{gte:new Date(now.getTime()-14*86400000),lt:new Date(now.getTime()-3*86400000)}});
    expect(JSON.stringify(query.where)).toContain('MAHASISWA');expect(JSON.stringify(query.where)).toContain('FISIK');expect(JSON.stringify(query.where)).toContain('AKTIF');
    expect(result.data[0].overdueDays).toBe(4);
    expect(result.overdueStats).toEqual({total:21,oneToThree:21,fourToFourteen:21,overFourteen:21});
    const global=prisma.loan.count.mock.calls.slice(-4).map(call=>JSON.stringify(call[0]));
    expect(global.every(text=>!text.includes('Riau')&&!text.includes('MAHASISWA'))).toBe(true);
  });
  it('controller retains query validation and rejects duplicate/object or unknown fields before service work', () => {
    const service={loans:jest.fn()};const controller=new AdminTransactionsController(service as never);
    expect(()=>controller.loans({status:'OVERDUE',bucket:['ONE_TO_THREE','OVER_FOURTEEN']})).toThrow();
    expect(()=>controller.loans({status:'OVERDUE',sort:{x:'NEWEST'}})).toThrow();
    expect(()=>controller.loans({status:'OVERDUE',secret:'invalid'})).toThrow();
    expect(service.loans).not.toHaveBeenCalled();
  });
});
