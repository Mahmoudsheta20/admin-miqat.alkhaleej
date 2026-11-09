import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const output=ts.transpileModule(fs.readFileSync('lib/navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={};new Function('exports',output)(mod);
test('unified navigation includes all admin sections and hides privileged administration',()=>{
 const items=mod.navigationFor('ADMIN');
 for(const path of ['/admin/contracts','/admin/fleet','/admin/captains','/admin/inspections','/admin/customers','/admin/staff','/admin/representatives','/admin/invoices','/admin/purchases','/admin/accounting','/admin/accounts','/admin/vat-returns','/admin/invoices/settings','/admin/zatca'])assert.ok(items.some(item=>item.href===path),path);
 assert.ok(!items.some(item=>item.href==='/admin/admins'));
 assert.ok(mod.navigationFor('ADMIN',true).some(item=>item.href==='/admin/admins'));
 assert.ok(!items.some(item=>item.href.endsWith('/new')));
});
test('longest matching route owns nested pages and settings never highlights invoices',()=>{
 assert.equal(mod.routeInfo('/admin/invoices/settings').group,'settings');
 assert.equal(mod.routeInfo('/admin/contracts/example/edit').href,'/admin/contracts');
 assert.equal(mod.routeInfo('/admin/invoices-unknown').href,'/admin');
 assert.equal(mod.routeInfo('/administrator'),undefined);
});
test('captain navigation has four entries and cannot expose admin sections',()=>{
 assert.deepEqual(mod.navigationFor('CAPTAIN').map(item=>item.href),['/captain','/captain/inspection','/captain/contract','/captain/account']);
});
test('routeLabel resolves nested and action routes cleanly in Arabic and English',()=>{
 const cases=[
  ['/admin/customers/123','تفاصيل العميل','Customer details'],
  ['/admin/staff/123','ملف الموظف','Staff account'],
  ['/admin/captains/123/account','الحساب المالي','Captain account'],
  ['/admin/contracts/123/edit','تعديل العقد','Edit contract'],
  ['/admin/contracts/123','تفاصيل العقد','Contract details'],
  ['/admin/contracts/new','إنشاء عقد','Create contract'],
  ['/admin/invoices/new','إنشاء فاتورة','Create invoice'],
  ['/admin/invoices/123','تفاصيل الفاتورة','Invoice details'],
  ['/admin/vat-returns/selected','الفواتير المختارة','Selected invoices'],
  ['/unknown','ميقات الخليج','Miqat Al Khaleej'],
 ];
 for(const [pathname,ar,en] of cases){
  assert.equal(mod.routeLabel(pathname,'ar'),ar);
  assert.equal(mod.routeLabel(pathname,'en'),en);
 }
});
