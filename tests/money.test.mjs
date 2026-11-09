import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(fs.readFileSync('lib/money.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const money={};new Function('exports',compiled)(money);
test('payment amounts normalize Arabic digits and retain exact halalas without rounding',()=>{
 assert.equal(money.moneyMinor('١١٥.٠١'),11501n);assert.equal(money.moneyMinor('۱۱۵.۰۱'),11501n);
 assert.equal(money.moneyDecimal(money.moneyMinor('999999999999.99')),'999999999999.99');
 assert.ok(money.moneyMinor('115.01')>money.moneyMinor('115.00'));
 for(const invalid of ['1e3','1.001','-1','Infinity','NaN',''])assert.equal(money.moneyMinor(invalid),null);
});
test('signed minor parsing and formatting handle negatives, Arabic digits, and zero safely',()=>{
 assert.equal(money.signedMoneyMinor('-12.55'),-1255n);
 assert.equal(money.signedMoneyMinor('−0.05'),-5n);
 assert.equal(money.signedMoneyMinor('+25.5'),2550n);
 assert.equal(money.signedMoneyMinor('-0.00'),0n);
 assert.equal(money.signedMoneyMinor('-١٢.٥٠'),-1250n);
 for(const invalid of ['',null,undefined,'abc','1e3','12.345'])assert.equal(money.signedMoneyMinor(invalid),0n);
 assert.equal(money.moneyDecimal(-1255n),'-12.55');
 assert.equal(money.formatSignedMinor(-5n),'-0.05');
 assert.equal(money.formatSignedMinor(0n),'0.00');
 assert.equal(money.formatSignedMinor(1255n),'12.55');
});
