import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),file=path.resolve('members/inputSecurity.ts'),loaded=new Module(file);
loaded.paths=Module._nodeModulePaths(path.dirname(file));loaded.require=require;
loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
const {notificationDestination}=loaded.exports;
test('loss notifications may open only canonical positive member loan details, never external/unsafe destinations',()=>{
 assert.equal(notificationDestination('/dashboard/pinjaman/7'),'/dashboard/pinjaman/7');
 for(const url of ['/dashboard/pinjaman/0','/dashboard/pinjaman/-1','/dashboard/pinjaman/2147483648','/dashboard/pinjaman/1?next=https://bad.test','/dashboard/pinjaman/1/complete','https://bad.test/dashboard/pinjaman/1','//bad.test','javascript:alert(1)'])assert.equal(notificationDestination(url),null);
});
