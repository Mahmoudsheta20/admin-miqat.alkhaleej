import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const exports={};
new Function('require','exports',ts.transpileModule(fs.readFileSync('lib/commercial.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>({}),exports);
const {commissionPreview}=exports;
test('commission preview uses an independent basis and exact halala rounding',()=>{assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'800',percent:'10'}),'80.00');assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'0.10',percent:'15'}),'0.02');assert.equal(commissionPreview({mode:'FIXED',amount:'35.55',base:'0',percent:'0'}),'35.55');});
test('commission preview rejects malformed money instead of displaying a false total',()=>{assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'800',percent:'101'}),'—');assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'',percent:'10'}),'—');assert.equal(commissionPreview({mode:'PERCENT',amount:'0',base:'1e3',percent:'10'}),'—');});
