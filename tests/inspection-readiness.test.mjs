import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(fs.readFileSync('lib/inspection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};new Function('exports',compiled)(exports);
test('readiness requires the selected vehicle and Saudi business date, including midnight',()=>{
 const value={vehiclePlate:'ABC',inspectionDate:'2026-11-07T21:30:00Z'};
 assert.equal(exports.inspectionMatchesDay(value,'2026-11-08','ABC'),true);
 assert.equal(exports.inspectionMatchesDay(value,'2026-11-07','ABC'),false);
 assert.equal(exports.inspectionMatchesDay(value,'2026-11-08','OTHER'),false);
 assert.equal(exports.inspectionMatchesDay(null,'2026-11-08'),false);
 assert.equal(exports.inspectionMatchesDay({...value,inspectionDate:'invalid'},'2026-11-08'),false);
});
test('the shared inspection checklist contains each of the sixteen technical checks once',()=>{
 assert.equal(exports.ALL_CHECK_ITEMS.length,16);
 assert.equal(new Set(exports.ALL_CHECK_ITEMS.map(item=>item.key)).size,16);
});
