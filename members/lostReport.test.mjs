import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
const file=path.resolve('members/lostReport.ts'),loaded=new Module(file);
if(fs.existsSync(file))loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
const api=loaded.exports;
const loan={status:'AKTIF',returnedAt:null,book:{type:'FISIK'},lostReport:null};
test('only active physical own-loan records without report expose report action',()=>{
 assert.equal(api.canReportLost(loan),true);
 for(const row of [{...loan,status:'DIKEMBALIKAN'},{...loan,status:'HILANG'},{...loan,returnedAt:'2026-10-22'}, {...loan,book:{type:'EBOOK'}},{...loan,book:{}},{...loan,lostReport:{status:'MENUNGGU_VERIFIKASI'}}])assert.equal(api.canReportLost(row),false);
});
test('all reported loans block extension; pending/process/completed labels are natural',()=>{
 assert.equal(api.canExtendReportedLoan(loan),true);
 for(const [status,label]of [['MENUNGGU_VERIFIKASI','Menunggu Verifikasi'],['PROSES_PENGGANTIAN','Proses Penggantian'],['SELESAI','Selesai']]){
  assert.equal(api.lostReportLabel(status),label);assert.equal(api.canExtendReportedLoan({...loan,lostReport:{status}}),false);
 }
 assert.equal(api.lostReportLabel('UNKNOWN'),'Status belum tersedia');
});
