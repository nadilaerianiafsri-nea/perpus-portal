import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file){const absolute=path.resolve(file),m=new Module(absolute);m.paths=Module._nodeModulePaths(path.dirname(absolute));m.require=name=>name.startsWith('.')||name.startsWith('@/')?name.endsWith('.cjs')?require(path.resolve(path.dirname(absolute),name)):load((name.startsWith('@/')?name.slice(2):path.resolve(path.dirname(absolute),name))+'.ts'):require(name);m._compile(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,absolute);return m.exports;}
const api=fs.existsSync('admin/adminOverdue.ts')?load('admin/adminOverdue.ts'):{};
const row={id:31,status:'AKTIF',overdueDays:4,borrowedAt:'2026-10-01T03:00:00Z',dueAt:'2026-10-22T03:00:00Z',extensionCount:2,member:{id:7,name:'=SUM(1,2)',email:'private@example.test',whatsapp:'081234567890',memberType:'MAHASISWA'},book:{id:4,title:'Buku, "Riau"\nEdisi Baru',code:'BK-004',coverUrl:''},copy:{id:3,code:'CP-3'}};
test('overdue query sends every filter to existing loans endpoint with explicit status and server paging',()=>{
 assert.equal(typeof api.overdueQuery,'function');
 const q=api.overdueQuery({search:'Riau',bucket:'FOUR_TO_FOURTEEN',memberType:'MAHASISWA',sort:'NEWEST',page:2,period:{preset:'custom',from:'2026-10-01',to:'2026-10-26'}});
 assert.deepEqual(Object.fromEntries(q),{status:'OVERDUE',search:'Riau',bucket:'FOUR_TO_FOURTEEN',memberType:'MAHASISWA',sort:'NEWEST',page:'2',limit:'20',from:'2026-10-01',to:'2026-10-26'});
});
test('WhatsApp reuses manual reminder URL only for a valid project-format number and overdue active row',()=>{
 assert.equal(typeof api.overdueWhatsappHref,'function');
 assert.match(api.overdueWhatsappHref(row),/^https:\/\/wa.me\/6281234567890\?text=/);
 for(const whatsapp of ['', 'abc081234567890','123','080','https://evil.test','081234567890<script>'])assert.equal(api.overdueWhatsappHref({...row,member:{...row.member,whatsapp}}),'');
 assert.equal(api.overdueWhatsappHref({...row,status:'HILANG'}),'');
});
test('CSV exports only supplied page/order, WIB dates and safe shared encoding, without internal IDs/email',()=>{
 assert.equal(typeof api.overdueCsv,'function');const csv=api.overdueCsv([row]);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('"Buku, ""Riau""\nEdisi Baru"'));assert.ok(csv.includes('Hari Terlambat'));assert.ok(csv.includes('22 Okt 2026'));assert.ok(!csv.includes('private@example.test'));assert.ok(!csv.includes('CP-3'));assert.equal(csv.split('\r\n').length,2);
});
test('detail context is an exact allowlisted source, with the canonical loan ID',()=>{
 assert.equal(typeof api.overdueDetailHref,'function');assert.equal(api.overdueDetailHref(31),'/admin/transaksi/peminjaman/31?source=terlambat');
});
