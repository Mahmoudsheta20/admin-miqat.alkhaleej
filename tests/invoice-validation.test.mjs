import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const output = ts.transpileModule(
  fs.readFileSync(new URL('../lib/invoice-validation.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const exports = {};
new Function('exports', output)(exports);

const {
  sanitizeBankForm,
  hasCompleteBankDetails,
  validateStage1Fields,
  validateStage2Fields,
  validateStage3Fields,
} = exports;

const baseBuyer = {
  name: '4brothers',
  vatNumber: '',
  street: '',
  building: '',
  district: '',
  city: '',
  postalCode: '',
  commercialRegistration: '',
};

const baseTransport = {
  serviceType: 'OTHER',
  origin: 'مكة',
  destination: 'المدينة',
  tripDate: '2026-11-13',
  distanceUnit: 'KM',
  passengers: [],
};

const baseLine = {
  code: 'TRP-01',
  description: 'رحلة نقل ركاب',
  billingUnit: 'TRIP',
  quantity: '1',
  unitPrice: '200',
  discount: '0',
  category: 'Z_NO_REASON',
  rate: '0',
  component: 'OWN_SUPPLY',
  taxReviewed: false,
};

const emptyBank = {
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  iban: '',
  swiftCode: '',
};

test('sanitizeBankForm and hasCompleteBankDetails ignore incomplete company defaults', () => {
  const dirty = sanitizeBankForm({ bankName: null, accountHolder: 123, iban: '  ' });
  assert.deepEqual(dirty, emptyBank);
  assert.equal(hasCompleteBankDetails(dirty), false);
  assert.equal(
    hasCompleteBankDetails({
      ...emptyBank,
      bankName: 'SNB',
      accountHolder: 'Miqat',
      iban: 'SA0000000000000000000000',
    }),
    true,
  );
});

test('validateStage1Fields catches invalid VAT, address codes, and passenger bounds', () => {
  assert.equal(
    validateStage1Fields({
      isTaxMode: false,
      taxDocument: { kind: 'INVOICE', profile: 'SIMPLIFIED' },
      hasOriginal: false,
      buyer: baseBuyer,
      contactPhone: '+966501347193',
      passengerCount: 4,
    }),
    null,
  );

  const badVat = validateStage1Fields({
    isTaxMode: false,
    taxDocument: { kind: 'INVOICE', profile: 'SIMPLIFIED' },
    hasOriginal: false,
    buyer: { ...baseBuyer, vatNumber: '12345' },
    contactPhone: '+966501347193',
  });
  assert.match(badVat.error, /الرقم الضريبي/);

  const badPostal = validateStage1Fields({
    isTaxMode: false,
    taxDocument: { kind: 'INVOICE', profile: 'SIMPLIFIED' },
    hasOriginal: false,
    buyer: {
      ...baseBuyer,
      street: 'King Road',
      building: '1234',
      district: 'Al Aziziyah',
      city: 'Makkah',
      postalCode: '123',
    },
    contactPhone: '+966501347193',
  });
  assert.equal(badPostal.openBuyerDetails, true);
  assert.match(badPostal.error, /5 أرقام/);

  const badPassengers = validateStage1Fields({
    isTaxMode: false,
    taxDocument: { kind: 'INVOICE', profile: 'SIMPLIFIED' },
    hasOriginal: false,
    buyer: baseBuyer,
    contactPhone: '+966501347193',
    passengerCount: 0,
  });
  assert.match(badPassengers.error, /عدد الركاب/);
});

test('validateStage2Fields checks route, ISO tripDate, and distance format', () => {
  assert.equal(validateStage2Fields({ transport: baseTransport }), null);
  assert.match(
    validateStage2Fields({ transport: { ...baseTransport, origin: ' ' } }).error,
    /عنوان الانطلاق/,
  );
  assert.match(
    validateStage2Fields({ transport: { ...baseTransport, tripDate: '2026/11/13' } }).error,
    /تاريخ الذهاب/,
  );
  assert.equal(
    validateStage2Fields({ transport: { ...baseTransport, billedDistance: 'abc' } })
      .isTransportError,
    true,
  );
});

test('validateStage3Fields catches missing line description and incomplete bank details before submit', () => {
  assert.equal(
    validateStage3Fields({
      lines: [baseLine],
      estimateValid: true,
      checkBank: false,
      bankDetails: emptyBank,
    }),
    null,
  );

  assert.match(
    validateStage3Fields({
      lines: [{ ...baseLine, description: '   ' }],
      estimateValid: true,
      checkBank: false,
      bankDetails: emptyBank,
    }),
    /وصف الخدمة للبند رقم 1/,
  );

  assert.match(
    validateStage3Fields({
      lines: [{ ...baseLine, category: 'Z', exemptionCode: 'BADCODE' }],
      estimateValid: true,
      checkBank: false,
      bankDetails: emptyBank,
    }),
    /VATEX-SA-/,
  );

  assert.match(
    validateStage3Fields({
      lines: [baseLine],
      estimateValid: true,
      checkBank: true,
      bankDetails: { ...emptyBank, bankName: 'SNB', accountHolder: 'Miqat' },
    }),
    /رقم الحساب أو الآيبان/,
  );
});
