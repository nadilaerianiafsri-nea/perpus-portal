import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file){const absolute=path.resolve(file),m=new Module(absolute);m.paths=Module._nodeModulePaths(path.dirname(absolute));m.require=name=>name.endsWith('.cjs')?require(path.resolve(path.dirname(absolute),name)):name.startsWith('.')?load(path.resolve(path.dirname(absolute),name)+'.ts'):require(name);m._compile(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,absolute);return m.exports;}
const api=fs.existsSync('admin/adminNotifications.ts')?load('admin/adminNotifications.ts'):{};
const row={id:'8:SYSTEM',sourceNotificationId:8,channel:'SYSTEM',readAt:null,href:'/admin/transaksi/reservasi/23',reminderType:'Reservasi Baru',status:'MENUNGGU'};
test('System read status is distinct from real delivery status, including manual WhatsApp',()=>{
 assert.equal(typeof api.notificationStatusLabel,'function');
 assert.equal(api.notificationStatusLabel(row),'Belum Dibaca');
 assert.equal(api.notificationStatusLabel({...row,readAt:'2026-10-26T03:00:00Z'}),'Dibaca');
 assert.equal(api.notificationStatusLabel({...row,channel:'EMAIL',status:'GAGAL'}),'Gagal');
 assert.equal(api.notificationStatusLabel({...row,channel:'WHATSAPP',status:'MANUAL'}),'Manual');
});
test('opening unread waits for persisted read before navigating once to safe entity detail',async()=>{
 assert.equal(typeof api.openAdminNotification,'function');const calls=[];
 await api.openAdminNotification(row,{markRead:async id=>{calls.push(['read',id]);},onRead:()=>calls.push(['updated']),navigate:href=>calls.push(['navigate',href]),showContext:()=>calls.push(['context'])});
 assert.deepEqual(calls,[['read',8],['updated'],['navigate','/admin/transaksi/reservasi/23']]);
});
test('read failure keeps unread state and prevents navigation; delivery never invokes read',async()=>{
 assert.equal(typeof api.openAdminNotification,'function');let navigations=0,reads=0,updates=0,contexts=0;
 const actions={markRead:async()=>{reads++;throw Error('read failed');},onRead:()=>updates++,navigate:()=>navigations++,showContext:()=>contexts++};
 await assert.rejects(()=>api.openAdminNotification(row,actions),/read failed/);assert.equal(navigations,0);assert.equal(updates,0);assert.equal(row.readAt,null);
 await api.openAdminNotification({...row,channel:'EMAIL',href:'https://evil.test'},actions);assert.equal(reads,1);assert.equal(contexts,1);
 await api.openAdminNotification({...row,readAt:'read'},actions);assert.equal(navigations,1);assert.equal(reads,1);
});
test('query sends period and category to server pagination and omits dates for all-time',()=>{
 assert.equal(typeof api.notificationQuery,'function');
 const q=api.notificationQuery({search:'Riau',channel:'UNREAD',page:2,limit:20,period:{preset:'custom',from:'2026-10-01',to:'2026-10-26'}});
 assert.deepEqual(Object.fromEntries(q),{channel:'UNREAD',page:'2',limit:'20',search:'Riau',from:'2026-10-01',to:'2026-10-26'});
 assert.equal(api.notificationQuery({search:'',channel:'ALL',page:1,limit:10,period:{preset:'all'}}).has('from'),false);
});
