import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(fs.readFileSync('lib/use-url-state.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const state={};new Function('exports','require',compiled)(state,()=>({}));
test('invalid pagination and unknown filter values fall back without breaking a section',()=>{
 for(const page of ['-1','0','NaN','1.5','9007199254740992','100001'])assert.equal(state.readUrlValue('?page='+page,'page',1),1);
 assert.equal(state.readUrlValue('?page=25','page',1),25);
 assert.equal(state.readUrlValue('?view=unknown','view','REPORTS',['REPORTS','PAYMENTS']),'REPORTS');
 assert.equal(state.readUrlValue('?view=PAYMENTS','view','REPORTS',['REPORTS','PAYMENTS']),'PAYMENTS');
});
test('query values retain Arabic and safely decode searches and archive flags',()=>{
 assert.equal(state.readUrlValue('?q='+encodeURIComponent('مكة & جدة'),'q',''),'مكة & جدة');
 assert.equal(state.readUrlValue('?archived=true','archived',false),true);
 assert.equal(state.readUrlValue('?archived=unexpected','archived',false),false);
});
